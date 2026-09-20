import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";

async function getAuthenticatedUser(request, env) {
  const cookies = parseCookies(request);
  const token = cookies["digitelio_session"];
  if (!token) return null;
  return await verifyJWT(token, env.JWT_SECRET);
}

const unauthorized = () => Response.json({ error: "Non authentifié." }, { status: 401 });
const TOKEN_RE = /^[0-9a-f]{48}$/;

function newToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseIds(raw) {
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function parseResources(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function ownedFormation(env, formationId, userId) {
  return env.DB.prepare("SELECT id, title FROM formations WHERE id = ? AND user_id = ?")
    .bind(formationId, userId)
    .first();
}

/* ===== FORMATEUR (connecté) ===== */

export async function handleCreateEnrollment(request, env, formationId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const formation = await ownedFormation(env, formationId, payload.sub);
  if (!formation) {
    return Response.json({ error: "Formation introuvable." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const name = String(body?.name || "").trim().slice(0, 60);
  if (name.length < 2) {
    return Response.json({ error: "Saisissez le nom de l'apprenant." }, { status: 400 });
  }

  const count = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM enrollments WHERE formation_id = ?"
  )
    .bind(formationId)
    .first();
  if ((count?.n || 0) >= 300) {
    return Response.json(
      { error: "Limite de 300 apprenants atteinte pour cette formation." },
      { status: 400 }
    );
  }

  const id = crypto.randomUUID();
  const token = newToken();

  await env.DB.prepare(
    "INSERT INTO enrollments (id, formation_id, learner_name, token, completed) VALUES (?, ?, ?, ?, '[]')"
  )
    .bind(id, formationId, name, token)
    .run();

  return Response.json({
    enrollment: { id, learner_name: name, token, completed_count: 0, completed_at: null },
  });
}

export async function handleListEnrollments(request, env, formationId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const formation = await ownedFormation(env, formationId, payload.sub);
  if (!formation) {
    return Response.json({ error: "Formation introuvable." }, { status: 404 });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, learner_name, token, completed, completed_at, created_at
     FROM enrollments WHERE formation_id = ? ORDER BY created_at DESC`
  )
    .bind(formationId)
    .all();

  const totalRow = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM formation_modules
     WHERE formation_id = ? AND content IS NOT NULL AND TRIM(content) != ''`
  )
    .bind(formationId)
    .first();
  const total = totalRow?.n || 0;

  return Response.json({
    total,
    enrollments: results.map((e) => ({
      id: e.id,
      learner_name: e.learner_name,
      token: e.token,
      completed_count: Math.min(parseIds(e.completed).length, total),
      completed_at: e.completed_at,
      created_at: e.created_at,
    })),
  });
}

export async function handleDeleteEnrollment(request, env, formationId, enrollmentId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const formation = await ownedFormation(env, formationId, payload.sub);
  if (!formation) {
    return Response.json({ error: "Formation introuvable." }, { status: 404 });
  }

  await env.DB.prepare("DELETE FROM enrollments WHERE id = ? AND formation_id = ?")
    .bind(enrollmentId, formationId)
    .run();

  return Response.json({ success: true });
}

/* ===== APPRENANT (public, protégé par le lien secret) ===== */

export async function handleGetLearnerCourse(request, env, token) {
  if (!TOKEN_RE.test(token)) {
    return Response.json({ error: "Lien d'accès invalide." }, { status: 404 });
  }

  const e = await env.DB.prepare(
    `SELECT e.id, e.learner_name, e.completed, e.completed_at,
            f.id AS formation_id, f.title, f.description, f.certificate,
            u.full_name AS instructor
     FROM enrollments e
     JOIN formations f ON f.id = e.formation_id
     LEFT JOIN users u ON u.id = f.user_id
     WHERE e.token = ?`
  )
    .bind(token)
    .first();

  if (!e) {
    return Response.json({ error: "Lien d'accès invalide ou expiré." }, { status: 404 });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, position, title, summary, content, video_url, resources
     FROM formation_modules
     WHERE formation_id = ? AND content IS NOT NULL AND TRIM(content) != ''
     ORDER BY position ASC`
  )
    .bind(e.formation_id)
    .all();

  const modules = results.map((m) => ({
    id: m.id,
    position: m.position,
    title: m.title,
    summary: m.summary || "",
    content: m.content,
    video_url: m.video_url || "",
    resources: parseResources(m.resources),
  }));
  const validIds = new Set(modules.map((m) => m.id));

  return Response.json({
    learner: e.learner_name,
    ref: e.id,
    completed: parseIds(e.completed).filter((id) => validIds.has(id)),
    completed_at: e.completed_at || null,
    formation: {
      title: e.title,
      description: e.description || "",
      certificate: !!e.certificate,
      instructor: e.instructor || "",
    },
    modules,
  });
}

export async function handleCompleteModule(request, env, token, moduleId) {
  if (!TOKEN_RE.test(token)) {
    return Response.json({ error: "Lien d'accès invalide." }, { status: 404 });
  }

  const e = await env.DB.prepare(
    "SELECT id, formation_id, completed, completed_at FROM enrollments WHERE token = ?"
  )
    .bind(token)
    .first();
  if (!e) {
    return Response.json({ error: "Lien d'accès invalide ou expiré." }, { status: 404 });
  }

  const { results } = await env.DB.prepare(
    `SELECT id FROM formation_modules
     WHERE formation_id = ? AND content IS NOT NULL AND TRIM(content) != ''`
  )
    .bind(e.formation_id)
    .all();
  const validIds = new Set(results.map((m) => m.id));

  if (!validIds.has(moduleId)) {
    return Response.json({ error: "Module introuvable." }, { status: 404 });
  }

  const done = new Set(parseIds(e.completed).filter((id) => validIds.has(id)));
  done.add(moduleId);
  const list = [...done];
  const finished = [...validIds].every((id) => done.has(id));

  if (finished) {
    await env.DB.prepare(
      "UPDATE enrollments SET completed = ?, completed_at = COALESCE(completed_at, datetime('now')) WHERE id = ?"
    )
      .bind(JSON.stringify(list), e.id)
      .run();
  } else {
    await env.DB.prepare("UPDATE enrollments SET completed = ? WHERE id = ?")
      .bind(JSON.stringify(list), e.id)
      .run();
  }

  const after = await env.DB.prepare("SELECT completed_at FROM enrollments WHERE id = ?")
    .bind(e.id)
    .first();

  return Response.json({
    completed: list,
    completed_at: after?.completed_at || null,
    finished,
  });
      }
