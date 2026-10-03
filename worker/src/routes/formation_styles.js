import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";

const IDS = ["noir", "aurora", "bordeaux", "ivoire", "neon", "ocean"];

let ready = false;
async function ensureTable(env) {
  if (ready) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS formation_styles (
      formation_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, template TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`
  ).run();
  ready = true;
}

async function getUser(request, env) {
  const token = parseCookies(request)["digitelio_session"];
  if (!token) return null;
  return await verifyJWT(token, env.JWT_SECRET);
}
const unauthorized = () => Response.json({ error: "Non authentifié." }, { status: 401 });

async function owns(env, formationId, userId) {
  return env.DB.prepare("SELECT id FROM formations WHERE id = ? AND user_id = ?")
    .bind(formationId, userId)
    .first();
}

export async function handleGetFormationStyle(request, env, formationId) {
  const user = await getUser(request, env);
  if (!user) return unauthorized();
  await ensureTable(env);
  if (!(await owns(env, formationId, user.sub))) {
    return Response.json({ error: "Formation introuvable." }, { status: 404 });
  }
  const row = await env.DB.prepare("SELECT template FROM formation_styles WHERE formation_id = ?")
    .bind(formationId)
    .first();
  return Response.json({ template: IDS.includes(row?.template) ? row.template : "noir" });
}

export async function handleSetFormationTemplate(request, env, formationId) {
  const user = await getUser(request, env);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body || !IDS.includes(body.template)) {
    return Response.json({ error: "Modèle inconnu." }, { status: 400 });
  }
  await ensureTable(env);
  if (!(await owns(env, formationId, user.sub))) {
    return Response.json({ error: "Formation introuvable." }, { status: 404 });
  }
  await env.DB.prepare(
    `INSERT INTO formation_styles (formation_id, user_id, template, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(formation_id) DO UPDATE SET template = excluded.template, updated_at = CURRENT_TIMESTAMP`
  )
    .bind(formationId, user.sub, body.template)
    .run();
  return Response.json({ template: body.template });
}
