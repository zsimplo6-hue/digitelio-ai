import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";

/* Gestion des formations : renommer, dupliquer, archiver, date de dernière modification.
   Les informations ajoutées (date de modification, archivage) sont stockées dans une table à part,
   formation_meta : aucune table existante n'est modifiée. */

const MAX_FORMATIONS_PER_USER = 200;

async function getUser(request, env) {
  const token = parseCookies(request)["digitelio_session"];
  if (!token) return null;
  return await verifyJWT(token, env.JWT_SECRET);
}
const unauthorized = () => Response.json({ error: "Non authentifié." }, { status: 401 });
const notFound = () => Response.json({ error: "Formation introuvable." }, { status: 404 });

let ready = false;
export async function ensureMetaTable(env) {
  if (ready) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS formation_meta (
      formation_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      archived INTEGER NOT NULL DEFAULT 0)`
  ).run();
  ready = true;
}

/* Marque une formation comme modifiée à l'instant. Ne doit JAMAIS faire échouer l'action principale. */
export async function touchFormation(env, formationId, userId) {
  try {
    await ensureMetaTable(env);
    await env.DB.prepare(
      `INSERT INTO formation_meta (formation_id, user_id, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(formation_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`
    )
      .bind(formationId, userId)
      .run();
  } catch {
    /* on ignore : la date de modification est un confort, pas une donnée critique */
  }
}

export async function removeFormationMeta(env, formationId) {
  for (const table of ["formation_meta", "formation_brief", "formation_module_meta"]) {
    try {
      await env.DB.prepare(`DELETE FROM ${table} WHERE formation_id = ?`).bind(formationId).run();
    } catch {
      /* la table n'existe peut-être pas encore */
    }
  }
}

async function ownedFormation(env, formationId, userId) {
  return env.DB.prepare(
    `SELECT id, title, description, topic, language, price, currency, cover_url, certificate
     FROM formations WHERE id = ? AND user_id = ?`
  )
    .bind(formationId, userId)
    .first();
}

/* POST /api/formations/:id/rename   { title } */
export async function handleRenameFormation(request, env, formationId) {
  const payload = await getUser(request, env);
  if (!payload) return unauthorized();

  const body = await request.json().catch(() => null);
  const title = String(body?.title || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (title.length < 3 || title.length > 200) {
    return Response.json({ error: "Le titre doit contenir entre 3 et 200 caractères." }, { status: 400 });
  }

  const owned = await ownedFormation(env, formationId, payload.sub);
  if (!owned) return notFound();

  await env.DB.prepare("UPDATE formations SET title = ? WHERE id = ? AND user_id = ?")
    .bind(title, formationId, payload.sub)
    .run();
  await touchFormation(env, formationId, payload.sub);

  return Response.json({ success: true, title });
}

/* POST /api/formations/:id/archive   { archived: true | false } */
export async function handleArchiveFormation(request, env, formationId) {
  const payload = await getUser(request, env);
  if (!payload) return unauthorized();

  const body = await request.json().catch(() => null);
  const archived = body?.archived ? 1 : 0;

  const owned = await ownedFormation(env, formationId, payload.sub);
  if (!owned) return notFound();

  try {
    await ensureMetaTable(env);
    await env.DB.prepare(
      `INSERT INTO formation_meta (formation_id, user_id, updated_at, archived)
       VALUES (?, ?, CURRENT_TIMESTAMP, ?)
       ON CONFLICT(formation_id) DO UPDATE SET archived = excluded.archived`
    )
      .bind(formationId, payload.sub, archived)
      .run();
  } catch (err) {
    return Response.json({ error: "Impossible de modifier l'archivage.", details: err.message }, { status: 500 });
  }

  return Response.json({ success: true, archived: !!archived });
}

/* POST /api/formations/:id/duplicate
   Copie le contenu (titre, plan, leçons, vidéos, ressources, couverture, prix, modèle graphique).
   La copie est toujours un brouillon : ni publication, ni apprenants, ni lien de paiement ne sont copiés. */
export async function handleDuplicateFormation(request, env, formationId) {
  const payload = await getUser(request, env);
  if (!payload) return unauthorized();

  const src = await ownedFormation(env, formationId, payload.sub);
  if (!src) return notFound();

  const countRow = await env.DB.prepare("SELECT COUNT(*) AS n FROM formations WHERE user_id = ?")
    .bind(payload.sub)
    .first();
  if ((countRow?.n || 0) >= MAX_FORMATIONS_PER_USER) {
    return Response.json(
      { error: `Limite de ${MAX_FORMATIONS_PER_USER} formations atteinte. Supprimez-en avant d'en dupliquer.` },
      { status: 400 }
    );
  }

  const { results: mods } = await env.DB.prepare(
    `SELECT id, position, title, summary, content, video_url, resources
     FROM formation_modules WHERE formation_id = ? ORDER BY position ASC`
  )
    .bind(formationId)
    .all();

  const newId = crypto.randomUUID();
  const idMap = new Map();
  const suffix = " (copie)";
  const title = (src.title || "Formation").slice(0, 200 - suffix.length) + suffix;

  const statements = [
    env.DB.prepare(
      `INSERT INTO formations
         (id, user_id, title, description, topic, language, status, price, currency, cover_url, certificate)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`
    ).bind(
      newId,
      payload.sub,
      title,
      src.description ?? "",
      src.topic ?? "",
      src.language ?? "fr",
      src.price ?? null,
      src.currency ?? null,
      src.cover_url ?? null,
      src.certificate ? 1 : 0
    ),
  ];

  for (const m of mods) {
    const newModuleId = crypto.randomUUID();
    idMap.set(m.id, newModuleId);
    statements.push(
      env.DB.prepare(
        `INSERT INTO formation_modules
           (id, formation_id, position, title, summary, content, video_url, resources)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newModuleId,
        newId,
        m.position,
        m.title,
        m.summary ?? "",
        m.content ?? "",
        m.video_url ?? "",
        m.resources ?? null
      )
    );
  }

  try {
    await env.DB.batch(statements);
  } catch (err) {
    return Response.json({ error: "La duplication a échoué.", details: err.message }, { status: 500 });
  }

  /* Modèle graphique : copié si possible (la table peut ne pas exister encore) */
  try {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO formation_styles (formation_id, user_id, template)
       SELECT ?, user_id, template FROM formation_styles WHERE formation_id = ?`
    )
      .bind(newId, formationId)
      .run();
  } catch {
    /* sans importance */
  }

  /* Paramètres de création et objectifs / compétences des modules : copiés si possible */
  try {
    await ensurePlanTables(env);
    await env.DB.prepare(
      `INSERT OR IGNORE INTO formation_brief (formation_id, user_id, brief_json)
       SELECT ?, ?, brief_json FROM formation_brief WHERE formation_id = ?`
    )
      .bind(newId, payload.sub, formationId)
      .run();
    const metaStatements = [];
    const oldMeta = await getModuleMetaMap(env, formationId);
    for (const [oldId, newModuleId] of idMap) {
      const mm = oldMeta[oldId];
      if (!mm) continue;
      metaStatements.push(
        env.DB.prepare(
          `INSERT OR IGNORE INTO formation_module_meta (module_id, formation_id, objective, skills)
           VALUES (?, ?, ?, ?)`
        ).bind(newModuleId, newId, mm.objective || "", JSON.stringify(mm.skills || []))
      );
    }
    if (metaStatements.length) await env.DB.batch(metaStatements);
  } catch {
    /* sans importance : la copie reste utilisable */
  }

  await touchFormation(env, newId, payload.sub);

  return Response.json({ success: true, id: newId, title });
}


/* =====================================================================
   PARAMÈTRES DE CRÉATION (brief) ET PLAN MODIFIABLE
   Stockés dans deux tables annexes : aucune table existante n'est modifiée.
   ===================================================================== */

const LEVELS = { debutant: "débutant (aucun prérequis supposé)", intermediaire: "intermédiaire", avance: "avancé (les bases sont acquises)" };
const TYPES = {
  pratique: "pratique, centrée sur des exercices",
  theorique: "théorique",
  professionnelle: "professionnelle",
  tutoriel: "tutoriel pas à pas",
  business: "business",
  technique: "technique",
  autre: "",
};
const TONES = {
  professionnel: "professionnel",
  academique: "académique",
  accessible: "accessible et simple",
  inspirant: "inspirant",
  specialise: "spécialisé et précis",
};
const DETAILS = { concis: "concis", standard: "standard", approfondi: "approfondi, avec de nombreux exemples" };
const STYLES = {
  conversationnel: "conversationnel",
  didactique: "didactique et structuré",
  narratif: "narratif, avec des histoires et des exemples vécus",
  actionnable: "direct et actionnable (listes d'actions)",
};

const MIN_MODULES = 3;
const MAX_MODULES_CREATE = 12;
const MAX_MODULES_PLAN = 20;

const cleanText = (v, max) =>
  String(v ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const pick = (v, table) => (typeof v === "string" && Object.prototype.hasOwnProperty.call(table, v) ? v : "");

/* Valide et nettoie les paramètres envoyés par le formulaire (tout est facultatif) */
export function sanitizeBrief(body) {
  const b = body || {};
  let modulesCount = "auto";
  const n = Number(b.modules_count);
  if (b.modules_count !== "auto" && Number.isInteger(n) && n >= MIN_MODULES && n <= MAX_MODULES_CREATE) {
    modulesCount = n;
  }
  return {
    audience: cleanText(b.audience, 200),
    level: pick(b.level, LEVELS),
    objectives: cleanText(b.objectives, 500),
    prerequisites: cleanText(b.prerequisites, 300),
    duration: cleanText(b.duration, 60),
    modules_count: modulesCount,
    type: pick(b.type, TYPES),
    tone: pick(b.tone, TONES),
    detail: pick(b.detail, DETAILS),
    style: pick(b.style, STYLES),
  };
}

/* Transforme le brief en consignes pour l'IA (uniquement les champs renseignés) */
export function briefToPrompt(brief) {
  if (!brief) return "";
  const lines = [];
  if (brief.audience) lines.push(`Public cible : ${brief.audience}.`);
  if (brief.level) lines.push(`Niveau des apprenants : ${LEVELS[brief.level]}.`);
  if (brief.objectives) lines.push(`Objectifs pédagogiques de la formation : ${brief.objectives}.`);
  if (brief.prerequisites) lines.push(`Prérequis : ${brief.prerequisites}.`);
  if (brief.duration) lines.push(`Durée estimée de la formation : ${brief.duration}.`);
  if (brief.type && TYPES[brief.type]) lines.push(`Type de formation : ${TYPES[brief.type]}.`);
  if (brief.tone) lines.push(`Ton : ${TONES[brief.tone]}.`);
  if (brief.style) lines.push(`Style rédactionnel : ${STYLES[brief.style]}.`);
  if (brief.detail) lines.push(`Niveau de détail : ${DETAILS[brief.detail]}.`);
  return lines.join("\n");
}

let planReady = false;
export async function ensurePlanTables(env) {
  if (planReady) return;
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS formation_brief (
        formation_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, brief_json TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS formation_module_meta (
        module_id TEXT PRIMARY KEY, formation_id TEXT NOT NULL,
        objective TEXT DEFAULT '', skills TEXT DEFAULT '[]')`
    ),
  ]);
  planReady = true;
}

export async function getBrief(env, formationId) {
  const row = await env.DB.prepare("SELECT brief_json FROM formation_brief WHERE formation_id = ?")
    .bind(formationId)
    .first();
  if (!row) return null;
  try {
    return sanitizeBrief(JSON.parse(row.brief_json));
  } catch {
    return null;
  }
}

function parseSkills(raw) {
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.map((x) => cleanText(x, 80)).filter(Boolean).slice(0, 8) : [];
  } catch {
    return [];
  }
}

export async function getModuleMetaMap(env, formationId) {
  const { results } = await env.DB.prepare(
    "SELECT module_id, objective, skills FROM formation_module_meta WHERE formation_id = ?"
  )
    .bind(formationId)
    .all();
  const map = {};
  for (const r of results) {
    map[r.module_id] = { objective: r.objective || "", skills: parseSkills(r.skills) };
  }
  return map;
}

function parseResourcesRaw(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/* Modules d'une formation, avec objectif et compétences */
export async function loadPlanModules(env, formationId) {
  const { results } = await env.DB.prepare(
    `SELECT id, position, title, summary, content, video_url, resources
     FROM formation_modules WHERE formation_id = ? ORDER BY position ASC`
  )
    .bind(formationId)
    .all();
  let meta = {};
  try {
    await ensurePlanTables(env);
    meta = await getModuleMetaMap(env, formationId);
  } catch {
    /* sans objectifs : le plan reste lisible */
  }
  return results.map((m) => ({
    ...m,
    content: m.content || "",
    video_url: m.video_url || "",
    resources: parseResourcesRaw(m.resources),
    objective: meta[m.id]?.objective || "",
    skills: meta[m.id]?.skills || [],
  }));
}

/* POST /api/formations/:id/plan
   Enregistre le plan complet, dans l'ordre voulu, en une seule opération :
   - un module avec "id" est conservé (son texte, ses images et sa progression restent intacts) ;
   - un module avec "copy_from" est une copie d'un module existant (texte, vidéo, ressources) ;
   - un module sans id est un nouveau module vide ;
   - un module existant absent de la liste est supprimé. */
export async function handleSavePlan(request, env, formationId) {
  const payload = await getUser(request, env);
  if (!payload) return unauthorized();

  const owned = await ownedFormation(env, formationId, payload.sub);
  if (!owned) return notFound();

  const body = await request.json().catch(() => null);
  const list = Array.isArray(body?.modules) ? body.modules : null;
  if (!list || list.length < 1 || list.length > MAX_MODULES_PLAN) {
    return Response.json(
      { error: `Le plan doit contenir entre 1 et ${MAX_MODULES_PLAN} modules.` },
      { status: 400 }
    );
  }

  const { results: existing } = await env.DB.prepare(
    `SELECT id, content, video_url, resources FROM formation_modules WHERE formation_id = ?`
  )
    .bind(formationId)
    .all();
  const byId = new Map(existing.map((m) => [m.id, m]));

  const items = [];
  const seen = new Set();
  for (const raw of list) {
    const title = cleanText(raw?.title, 150);
    if (!title) {
      return Response.json({ error: "Chaque module doit avoir un titre." }, { status: 400 });
    }
    const item = {
      title,
      summary: cleanText(raw?.summary, 400),
      objective: cleanText(raw?.objective, 400),
      skills: (Array.isArray(raw?.skills) ? raw.skills : [])
        .map((x) => cleanText(x, 80))
        .filter(Boolean)
        .slice(0, 8),
      id: null,
      copy: null,
    };
    if (raw?.id) {
      const id = String(raw.id);
      if (!byId.has(id) || seen.has(id)) {
        return Response.json({ error: "Module inconnu dans ce plan." }, { status: 400 });
      }
      seen.add(id);
      item.id = id;
    } else if (raw?.copy_from) {
      const src = byId.get(String(raw.copy_from));
      if (!src) return Response.json({ error: "Module à copier introuvable." }, { status: 400 });
      item.copy = src;
    }
    items.push(item);
  }

  try {
    await ensurePlanTables(env);
  } catch (err) {
    return Response.json({ error: "Stockage du plan indisponible.", details: err.message }, { status: 500 });
  }

  const statements = [];

  /* 1. suppression des modules retirés */
  for (const m of existing) {
    if (!seen.has(m.id)) {
      statements.push(
        env.DB.prepare("DELETE FROM formation_modules WHERE id = ? AND formation_id = ?").bind(m.id, formationId),
        env.DB.prepare("DELETE FROM formation_module_meta WHERE module_id = ?").bind(m.id)
      );
    }
  }

  /* 2. positions provisoires élevées : évite toute collision pendant la réorganisation */
  statements.push(
    env.DB.prepare("UPDATE formation_modules SET position = position + 10000 WHERE formation_id = ?").bind(formationId)
  );

  /* 3. écriture du plan dans l'ordre voulu */
  items.forEach((item, i) => {
    const position = i + 1;
    let moduleId = item.id;
    if (moduleId) {
      statements.push(
        env.DB.prepare(
          "UPDATE formation_modules SET title = ?, summary = ?, position = ? WHERE id = ? AND formation_id = ?"
        ).bind(item.title, item.summary, position, moduleId, formationId)
      );
    } else {
      moduleId = crypto.randomUUID();
      statements.push(
        env.DB.prepare(
          `INSERT INTO formation_modules
             (id, formation_id, position, title, summary, content, video_url, resources)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          moduleId,
          formationId,
          position,
          item.title,
          item.summary,
          item.copy?.content ?? "",
          item.copy?.video_url ?? "",
          item.copy?.resources ?? null
        )
      );
    }
    statements.push(
      env.DB.prepare(
        `INSERT INTO formation_module_meta (module_id, formation_id, objective, skills)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(module_id) DO UPDATE SET objective = excluded.objective, skills = excluded.skills`
      ).bind(moduleId, formationId, item.objective, JSON.stringify(item.skills))
    );
  });

  try {
    await env.DB.batch(statements);
  } catch (err) {
    return Response.json({ error: "L'enregistrement du plan a échoué.", details: err.message }, { status: 500 });
  }

  await touchFormation(env, formationId, payload.sub);
  return Response.json({ success: true, modules: await loadPlanModules(env, formationId) });
}
