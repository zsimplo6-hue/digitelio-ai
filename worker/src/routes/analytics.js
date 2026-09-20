import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";

async function getAuthenticatedUser(request, env) {
  const cookies = parseCookies(request);
  const token = cookies["digitelio_session"];
  if (!token) return null;
  return await verifyJWT(token, env.JWT_SECRET);
}

const unauthorized = () => Response.json({ error: "Non authentifié." }, { status: 401 });

const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless/i;
const dayStr = (d) => d.toISOString().slice(0, 10);

/* ===== PUBLIC : enregistre une visite ou un clic sur la page de vente ===== */
export async function handleTrack(request, env, formationId) {
  const body = await request.json().catch(() => null);
  const type = body?.type;
  if (type !== "view" && type !== "click") {
    return Response.json({ error: "Type invalide." }, { status: 400 });
  }

  const ua = request.headers.get("User-Agent") || "";
  if (BOT_RE.test(ua)) return Response.json({ ok: true, skipped: "bot" });

  const f = await env.DB.prepare(
    "SELECT id, user_id FROM formations WHERE id = ? AND status = 'published'"
  )
    .bind(formationId)
    .first();
  if (!f) return Response.json({ error: "Formation introuvable." }, { status: 404 });

  // Les visites du propriétaire connecté ne sont pas comptées
  const me = await getAuthenticatedUser(request, env);
  if (me && me.sub === f.user_id) {
    return Response.json({ ok: true, skipped: "owner" });
  }

  const views = type === "view" ? 1 : 0;
  const uniques = type === "view" && body.unique === true ? 1 : 0;
  const clicks = type === "click" ? 1 : 0;

  await env.DB.prepare(
    `INSERT INTO analytics_daily (formation_id, day, views, unique_views, clicks)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(formation_id, day) DO UPDATE SET
       views = views + excluded.views,
       unique_views = unique_views + excluded.unique_views,
       clicks = clicks + excluded.clicks`
  )
    .bind(f.id, dayStr(new Date()), views, uniques, clicks)
    .run();

  return Response.json({ ok: true });
}

/* ===== FORMATEUR : statistiques de ses pages de vente ===== */
export async function handleAnalytics(request, env) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();
  const uid = payload.sub;

  const url = new URL(request.url);
  const asked = Number(url.searchParams.get("days"));
  const days = [7, 30, 90].includes(asked) ? asked : 30;
  const onlyId = url.searchParams.get("formation_id") || "";

  const startDate = new Date(Date.now() - (days - 1) * 86400000);
  const since = dayStr(startDate);

  const { results: rows } = await env.DB.prepare(
    `SELECT f.id, f.title,
            COALESCE(SUM(a.views), 0) AS views,
            COALESCE(SUM(a.unique_views), 0) AS uniques,
            COALESCE(SUM(a.clicks), 0) AS clicks,
            (SELECT COUNT(*) FROM enrollments e WHERE e.formation_id = f.id) AS learners
     FROM formations f
     LEFT JOIN analytics_daily a ON a.formation_id = f.id AND a.day >= ?
     WHERE f.user_id = ? AND f.status = 'published'
     GROUP BY f.id
     ORDER BY views DESC, f.title ASC`
  )
    .bind(since, uid)
    .all();

  const seriesQuery = onlyId
    ? env.DB.prepare(
        `SELECT a.day, SUM(a.views) AS views, SUM(a.clicks) AS clicks
         FROM analytics_daily a JOIN formations f ON f.id = a.formation_id
         WHERE f.user_id = ? AND a.day >= ? AND f.id = ?
         GROUP BY a.day`
      ).bind(uid, since, onlyId)
    : env.DB.prepare(
        `SELECT a.day, SUM(a.views) AS views, SUM(a.clicks) AS clicks
         FROM analytics_daily a JOIN formations f ON f.id = a.formation_id
         WHERE f.user_id = ? AND a.day >= ?
         GROUP BY a.day`
      ).bind(uid, since);

  const { results: daily } = await seriesQuery.all();
  const byDay = new Map(daily.map((d) => [d.day, d]));

  const series = [];
  for (let i = 0; i < days; i++) {
    const day = dayStr(new Date(startDate.getTime() + i * 86400000));
    const d = byDay.get(day);
    series.push({ day, views: d?.views || 0, clicks: d?.clicks || 0 });
  }

  const scoped = onlyId ? rows.filter((r) => r.id === onlyId) : rows;
  const totals = {
    views: scoped.reduce((s, r) => s + r.views, 0),
    uniques: scoped.reduce((s, r) => s + r.uniques, 0),
    clicks: scoped.reduce((s, r) => s + r.clicks, 0),
  };

  return Response.json({ days, totals, series, formations: rows });
    }
