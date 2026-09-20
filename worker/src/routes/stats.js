import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";

async function getAuthenticatedUser(request, env) {
  const cookies = parseCookies(request);
  const token = cookies["digitelio_session"];
  if (!token) return null;
  return await verifyJWT(token, env.JWT_SECRET);
}

const unauthorized = () => Response.json({ error: "Non authentifié." }, { status: 401 });

/* Vue d'ensemble des ventes du formateur connecté */
export async function handleSalesOverview(request, env) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const { results } = await env.DB.prepare(
    `SELECT f.id, f.title, f.price, f.status, f.payment_url, f.certificate, f.published_at,
            CASE WHEN f.cover_url IS NOT NULL AND f.cover_url != '' THEN 1 ELSE 0 END AS has_cover,
            (SELECT COUNT(*) FROM enrollments e WHERE e.formation_id = f.id) AS learners,
            (SELECT COUNT(*) FROM enrollments e
               WHERE e.formation_id = f.id AND e.completed_at IS NOT NULL) AS finished
     FROM formations f
     WHERE f.user_id = ?
     ORDER BY f.published_at DESC, f.created_at DESC`
  )
    .bind(payload.sub)
    .all();

  const published = results.filter((f) => f.status === "published");
  const drafts = results.length - published.length;

  const pages = published.map((f) => ({
    id: f.id,
    title: f.title,
    price: f.price,
    payment_url: f.payment_url || "",
    certificate: !!f.certificate,
    has_cover: !!f.has_cover,
    learners: f.learners || 0,
    finished: f.finished || 0,
    published_at: f.published_at,
  }));

  const totals = {
    published: pages.length,
    drafts,
    learners: pages.reduce((s, p) => s + p.learners, 0),
    finished: pages.reduce((s, p) => s + p.finished, 0),
    revenue: pages.reduce((s, p) => s + (p.price || 0) * p.learners, 0),
  };

  return Response.json({ totals, pages });
}

/* Image de couverture d'une formation publiée (public, mise en cache) */
export async function handleGetCover(request, env, formationId) {
  const row = await env.DB.prepare(
    "SELECT cover_url FROM formations WHERE id = ? AND status = 'published'"
  )
    .bind(formationId)
    .first();

  const cover = row?.cover_url || "";
  if (!cover) return new Response("Not found", { status: 404 });

  const m = cover.match(/^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/);
  if (m) {
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Response(bytes, {
      headers: {
        "Content-Type": m[1],
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  if (/^https:\/\/\S+$/i.test(cover)) {
    return Response.redirect(cover, 302);
  }

  return new Response("Not found", { status: 404 });
      }
