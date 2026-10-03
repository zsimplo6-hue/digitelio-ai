import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";

const TEMPLATE_IDS = ["business", "finance", "wellness", "growth", "spirit", "cuisine"];
const HEX = /^#[0-9a-fA-F]{6}$/;
const LANG_NAMES = {
  fr: "français", en: "English", es: "español", pt: "português",
  de: "Deutsch", it: "italiano", ar: "العربية (arabe standard moderne)",
};

let ready = false;
async function ensureTables(env) {
  if (ready) return;
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS brand_kits (
      user_id TEXT PRIMARY KEY, brand_name TEXT, author_name TEXT, tagline TEXT,
      accent_color TEXT, cover_color TEXT, default_template TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS ebook_styles (
      ebook_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, template TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`),
  ]);
  ready = true;
}

async function getUser(request, env) {
  const token = parseCookies(request)["digitelio_session"];
  if (!token) return null;
  return await verifyJWT(token, env.JWT_SECRET);
}
const unauthorized = () => Response.json({ error: "Non authentifié." }, { status: 401 });
const clip = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

async function readBrand(env, userId) {
  const row = await env.DB.prepare(
    "SELECT brand_name, author_name, tagline, accent_color, cover_color, default_template FROM brand_kits WHERE user_id = ?"
  ).bind(userId).first();
  return {
    brand_name: row?.brand_name || "",
    author_name: row?.author_name || "",
    tagline: row?.tagline || "",
    accent_color: HEX.test(row?.accent_color || "") ? row.accent_color : "",
    cover_color: HEX.test(row?.cover_color || "") ? row.cover_color : "",
    default_template: TEMPLATE_IDS.includes(row?.default_template) ? row.default_template : "finance",
  };
}

/* ===== Kit de marque ===== */
export async function handleGetBrand(request, env) {
  const user = await getUser(request, env);
  if (!user) return unauthorized();
  await ensureTables(env);
  return Response.json({ brand: await readBrand(env, user.sub) });
}

export async function handleSaveBrand(request, env) {
  const user = await getUser(request, env);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  await ensureTables(env);

  const b = await readBrand(env, user.sub);
  if ("brand_name" in body) b.brand_name = clip(body.brand_name, 40);
  if ("author_name" in body) b.author_name = clip(body.author_name, 60);
  if ("tagline" in body) b.tagline = clip(body.tagline, 120);
  for (const k of ["accent_color", "cover_color"]) {
    if (k in body) {
      const v = String(body[k] || "").trim();
      if (v && !HEX.test(v)) return Response.json({ error: "Couleur invalide." }, { status: 400 });
      b[k] = v;
    }
  }
  if ("default_template" in body) {
    if (!TEMPLATE_IDS.includes(body.default_template)) {
      return Response.json({ error: "Modèle inconnu." }, { status: 400 });
    }
    b.default_template = body.default_template;
  }

  await env.DB.prepare(
    `INSERT INTO brand_kits (user_id, brand_name, author_name, tagline, accent_color, cover_color, default_template, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET brand_name = excluded.brand_name, author_name = excluded.author_name,
       tagline = excluded.tagline, accent_color = excluded.accent_color, cover_color = excluded.cover_color,
       default_template = excluded.default_template, updated_at = CURRENT_TIMESTAMP`
  ).bind(user.sub, b.brand_name, b.author_name, b.tagline, b.accent_color, b.cover_color, b.default_template).run();

  return Response.json({ brand: b });
}

/* ===== Modèle d'un eBook ===== */
async function ownsEbook(env, ebookId, userId) {
  return await env.DB.prepare("SELECT id FROM ebooks WHERE id = ? AND user_id = ?").bind(ebookId, userId).first();
}

export async function handleGetStyle(request, env, ebookId) {
  const user = await getUser(request, env);
  if (!user) return unauthorized();
  await ensureTables(env);
  if (!(await ownsEbook(env, ebookId, user.sub))) {
    return Response.json({ error: "eBook introuvable." }, { status: 404 });
  }
  const brand = await readBrand(env, user.sub);
  const row = await env.DB.prepare("SELECT template FROM ebook_styles WHERE ebook_id = ?").bind(ebookId).first();
  const template = TEMPLATE_IDS.includes(row?.template) ? row.template : brand.default_template;
  return Response.json({ template, brand });
}

export async function handleSetTemplate(request, env, ebookId) {
  const user = await getUser(request, env);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body || !TEMPLATE_IDS.includes(body.template)) {
    return Response.json({ error: "Modèle inconnu." }, { status: 400 });
  }
  await ensureTables(env);
  if (!(await ownsEbook(env, ebookId, user.sub))) {
    return Response.json({ error: "eBook introuvable." }, { status: 404 });
  }
  await env.DB.prepare(
    `INSERT INTO ebook_styles (ebook_id, user_id, template, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(ebook_id) DO UPDATE SET template = excluded.template, updated_at = CURRENT_TIMESTAMP`
  ).bind(ebookId, user.sub, body.template).run();
  return Response.json({ template: body.template });
}

/* ===== Idées de produits par pays ===== */

const clean = (s) =>
  String(s || "")
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "")
    .replace(/[*_`#>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

const FORMATION_RE = /formation|course|curso|kurs|corso|دورة/i;

function toIdea(o) {
  const idea = {
    niche: clean(o.niche).slice(0, 60),
    why: clean(o.why).slice(0, 220),
    title: clean(o.title).slice(0, 120),
    description: clean(o.description).slice(0, 260),
    type: FORMATION_RE.test(String(o.type || "")) ? "formation" : "ebook",
  };
  return idea.niche && idea.title && idea.description ? idea : null;
}

/* Format principal : une idée par ligne, champs séparés par " | ". Robuste si la réponse est coupée. */
function parseLines(text) {
  const ideas = [];
  for (const raw of String(text || "").split("\n")) {
    const line = raw.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "");
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length < 4) continue;
    const [niche, why, title, description, type = ""] = parts;
    const idea = toIdea({ niche, why, title, description, type });
    if (idea) ideas.push(idea);
  }
  return ideas;
}

/* Secours : si le modèle répond quand même en JSON, on lit chaque objet séparément */
function parseJsonObjects(text) {
  const ideas = [];
  for (const m of String(text || "").matchAll(/\{[^{}]*\}/g)) {
    try {
      const idea = toIdea(JSON.parse(m[0]));
      if (idea) ideas.push(idea);
    } catch {
      /* objet incomplet : on l'ignore */
    }
  }
  return ideas;
}

function parseIdeas(text) {
  let ideas = parseLines(text);
  if (ideas.length < 3) {
    const alt = parseJsonObjects(text);
    if (alt.length > ideas.length) ideas = alt;
  }
  return ideas.slice(0, 8);
}

export async function handleIdeas(request, env) {
  const user = await getUser(request, env);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  const country = clip(body?.country, 60);
  if (!country) return Response.json({ error: "Indiquez un pays." }, { status: 400 });
  const interest = clip(body?.interest, 120);
  const langName = LANG_NAMES[body?.language] || "français";

  const prompt = `Tu es un stratège de produits digitaux qui aide des créateurs à choisir une niche vendable.

Public visé : ${country}.
Centre d'intérêt : ${interest || "aucun, propose des niches variées et complémentaires"}.
Langue de rédaction de TOUTES les idées : ${langName}.

Propose 6 idées d'eBooks ou de formations en ligne, adaptées à la réalité de ce public (habitudes, moyens de paiement mobiles, métiers courants, besoins du quotidien, contexte local).

Exigences de qualité :
- Chaque idée vise un public PRÉCIS (pas "tout le monde") et un problème CONCRET.
- Évite les thèmes génériques (« réussir sa vie », « devenir riche »). Sois spécifique et différenciant.
- Les titres sont accrocheurs, avec une promesse claire, sans résultat garanti.
- Varie les niches et mélange eBooks et formations.
- N'invente AUCUN chiffre, statistique ou étude.

Format STRICT : une idée par ligne, 5 champs séparés par le symbole |, rien d'autre (pas d'introduction, pas de numérotation, pas de gras) :
niche en quelques mots | pourquoi cette niche intéresse ce public (une phrase) | titre accrocheur | description : sujet, public visé et bénéfice (une phrase) | ebook ou formation

Exemple de forme (ne le recopie pas) :
Pâtisserie à domicile | Beaucoup de personnes cherchent un revenu depuis chez elles | Pâtissière à domicile : lancer son activité avec 10 gâteaux qui se vendent | Guide pratique pour les débutantes qui veulent vendre des gâteaux sur WhatsApp et les réseaux sociaux | ebook`;

  let lastError = "";
  try {
    let ideas = [];
    for (let i = 0; i < 2 && ideas.length < 3; i++) {
      const r = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
        messages: [
          {
            role: "system",
            content:
              "Tu es un consultant senior en produits digitaux. Tu écris des idées concrètes, spécifiques et premium, dans la langue demandée, en respectant exactement le format demandé.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 2500,
        temperature: 0.8,
      });
      // Selon le modèle, la réponse peut déjà être un objet : on la remet en texte
      const raw =
        typeof r?.response === "string"
          ? r.response
          : r?.response != null
          ? JSON.stringify(r.response)
          : "";
      lastError = raw ? "" : "Réponse vide de l'IA.";
      ideas = parseIdeas(raw);
    }
    if (ideas.length < 3) {
      return Response.json(
        { error: "L'IA n'a pas renvoyé d'idées exploitables. Réessayez.", details: lastError },
        { status: 502 }
      );
    }
    return Response.json({ ideas });
  } catch (err) {
    return Response.json({ error: "Erreur lors de la génération IA.", details: err.message }, { status: 502 });
  }
  }
