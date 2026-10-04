import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";

const PRICES = { pro: 4999, business: 12999 };

async function adminUser(request, env) {
  try {
    const token = parseCookies(request)["digitelio_session"];
    if (!token) return null;
    const payload = await verifyJWT(token, env.JWT_SECRET);
    if (!payload) return null;
    const user = await env.DB.prepare("SELECT id, email FROM users WHERE id = ?").bind(payload.sub).first();
    if (!user) return null;
    const list = String(env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return list.includes(String(user.email).toLowerCase()) ? user : null;
  } catch {
    return null;
  }
}

const num = (v) => Number(v) || 0;

export async function handleAdminStats(request, env) {
  const admin = await adminUser(request, env);
  // 404 volontaire : on ne révèle pas que cette page existe
  if (!admin) return Response.json({ error: "Route non trouvée" }, { status: 404 });

  const total = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first();

  const activeRows = await env.DB.prepare(
    `SELECT plan, COUNT(*) AS n FROM users
     WHERE plan IN ('pro','business') AND (plan_until IS NULL OR plan_until > datetime('now'))
     GROUP BY plan`
  ).all();
  const active = { pro: 0, business: 0 };
  for (const r of activeRows.results || []) if (r.plan in active) active[r.plan] = num(r.n);

  const expiredRow = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM users
     WHERE plan IN ('pro','business') AND plan_until IS NOT NULL AND plan_until <= datetime('now')`
  ).first();

  let new24 = 0;
  let new7 = 0;
  let recentSignups = [];
  try {
    const a = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE created_at > datetime('now','-1 day')").first();
    const b = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE created_at > datetime('now','-7 day')").first();
    const c = await env.DB.prepare(
      "SELECT full_name, email, plan, created_at FROM users ORDER BY created_at DESC LIMIT 6"
    ).all();
    new24 = num(a?.n);
    new7 = num(b?.n);
    recentSignups = c.results || [];
  } catch {
    /* colonne created_at absente : on ignore */
  }

  let revenue = { total_xof: 0, last_30d_xof: 0, payments_count: 0, by_plan: {} };
  let recentPayments = [];
  try {
    const t = await env.DB.prepare("SELECT COALESCE(SUM(amount_xof),0) AS s, COUNT(*) AS n FROM plan_payments").first();
    const m = await env.DB.prepare(
      "SELECT COALESCE(SUM(amount_xof),0) AS s FROM plan_payments WHERE created_at > datetime('now','-30 day')"
    ).first();
    const bp = await env.DB.prepare(
      "SELECT plan, COUNT(*) AS n, COALESCE(SUM(amount_xof),0) AS s FROM plan_payments GROUP BY plan"
    ).all();
    const rp = await env.DB.prepare(
      "SELECT email, plan, amount_xof, created_at FROM plan_payments ORDER BY created_at DESC LIMIT 8"
    ).all();
    revenue = {
      total_xof: num(t?.s),
      last_30d_xof: num(m?.s),
      payments_count: num(t?.n),
      by_plan: Object.fromEntries((bp.results || []).map((r) => [r.plan, { count: num(r.n), total_xof: num(r.s) }])),
    };
    recentPayments = rp.results || [];
  } catch {
    /* journal pas encore créé : aucun paiement enregistré */
  }

  const totalUsers = num(total?.n);
  const expired = num(expiredRow?.n);
  const free = Math.max(0, totalUsers - active.pro - active.business - expired);

  return Response.json({
    generated_at: new Date().toISOString(),
    users: { total: totalUsers, new_24h: new24, new_7d: new7 },
    plans: { free, pro: active.pro, business: active.business, expired },
    prices: PRICES,
    mrr_xof: active.pro * PRICES.pro + active.business * PRICES.business,
    revenue,
    recent_signups: recentSignups,
    recent_payments: recentPayments,
  });
      }
