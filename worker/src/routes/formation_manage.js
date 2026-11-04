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
  try {
    await env.DB.prepare("DELETE FROM formation_meta WHERE formation_id = ?").bind(formationId).run();
  } catch {
    /* la table n'existe peut-être pas encore */
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
    `SELECT position, title, summary, content, video_url, resources
     FROM formation_modules WHERE formation_id = ? ORDER BY position ASC`
  )
    .bind(formationId)
    .all();

  const newId = crypto.randomUUID();
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
    statements.push(
      env.DB.prepare(
        `INSERT INTO formation_modules
           (id, formation_id, position, title, summary, content, video_url, resources)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        crypto.randomUUID(),
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

  await touchFormation(env, newId, payload.sub);

  return Response.json({ success: true, id: newId, title });
}
