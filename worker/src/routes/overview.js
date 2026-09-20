import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";

async function getAuthenticatedUser(request, env) {
  const cookies = parseCookies(request);
  const token = cookies["digitelio_session"];
  if (!token) return null;
  return await verifyJWT(token, env.JWT_SECRET);
}

const unauthorized = () => Response.json({ error: "Non authentifié." }, { status: 401 });

/* Vue d'ensemble du compte connecté (tableau de bord) */
export async function handleOverview(request, env) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();
  const uid = payload.sub;

  const [ebooksCount, formationsStats, learnersStats, priced, recentEbooks, recentFormations, recentLearners] =
    await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS n FROM ebooks WHERE user_id = ?").bind(uid).first(),

      env.DB.prepare(
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END), 0) AS published,
                COALESCE(SUM(CASE WHEN status = 'published'
                                   AND (payment_url IS NULL OR payment_url = '') THEN 1 ELSE 0 END), 0) AS no_payment
         FROM formations WHERE user_id = ?`
      )
        .bind(uid)
        .first(),

      env.DB.prepare(
        `SELECT COUNT(*) AS learners,
                COALESCE(SUM(CASE WHEN e.completed_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS finished
         FROM enrollments e
         JOIN formations f ON f.id = e.formation_id
         WHERE f.user_id = ?`
      )
        .bind(uid)
        .first(),

      env.DB.prepare(
        `SELECT f.price, f.currency,
                (SELECT COUNT(*) FROM enrollments e WHERE e.formation_id = f.id) AS learners
         FROM formations f
         WHERE f.user_id = ? AND f.status = 'published' AND f.price > 0`
      )
        .bind(uid)
        .all(),

      env.DB.prepare(
        `SELECT id, title, status, created_at FROM ebooks
         WHERE user_id = ? ORDER BY created_at DESC LIMIT 3`
      )
        .bind(uid)
        .all(),

      env.DB.prepare(
        `SELECT f.id, f.title, f.status, f.price, f.currency, f.created_at,
                (SELECT COUNT(*) FROM formation_modules m WHERE m.formation_id = f.id) AS modules_count
         FROM formations f
         WHERE f.user_id = ? ORDER BY f.created_at DESC LIMIT 3`
      )
        .bind(uid)
        .all(),

      env.DB.prepare(
        `SELECT e.learner_name, e.completed_at, e.created_at, f.title
         FROM enrollments e
         JOIN formations f ON f.id = e.formation_id
         WHERE f.user_id = ?
         ORDER BY e.created_at DESC LIMIT 5`
      )
        .bind(uid)
        .all(),
    ]);

  const revenueMap = {};
  for (const r of priced.results) {
    const amount = (r.price || 0) * (r.learners || 0);
    if (amount > 0) {
      const cur = r.currency || "EUR";
      revenueMap[cur] = (revenueMap[cur] || 0) + amount;
    }
  }

  const total = formationsStats?.total || 0;
  const published = formationsStats?.published || 0;

  return Response.json({
    totals: {
      ebooks: ebooksCount?.n || 0,
      formations: total,
      published,
      drafts: total - published,
      no_payment: formationsStats?.no_payment || 0,
      learners: learnersStats?.learners || 0,
      finished: learnersStats?.finished || 0,
      revenue_by_currency: Object.entries(revenueMap).map(([currency, amount]) => ({
        currency,
        amount,
      })),
    },
    recent: {
      ebooks: recentEbooks.results,
      formations: recentFormations.results,
      learners: recentLearners.results,
    },
  });
        }
