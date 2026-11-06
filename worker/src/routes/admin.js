import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";
import { isUnlimitedEmail } from "./billing.js";
import { reconcilePending } from "./payments.js";

const PRICES = { pro: 5000, business: 13000 };

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
const DAY = 86400000;

/* 'YYYY-MM-DD HH:MM:SS' (UTC) ou 'YYYY-MM-DD' (fin de journée pour une échéance) -> millisecondes */
function ms(s, endOfDay = false) {
  if (!s) return null;
  const str = String(s).trim();
  let iso;
  if (str.length <= 10) iso = `${str}T${endOfDay ? "23:59:59" : "00:00:00"}Z`;
  else iso = /[zZ]|[+-]\d\d:?\d\d$/.test(str) ? str.replace(" ", "T") : `${str.replace(" ", "T")}Z`;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}
const dayKey = (t) => new Date(t).toISOString().slice(0, 10);

/* Lecture tolérante : une table absente ne doit jamais faire tomber tout le tableau de bord */
async function rows(env, sql, ...binds) {
  try {
    const r = await env.DB.prepare(sql).bind(...binds).all();
    return { ok: true, rows: r.results || [] };
  } catch (e) {
    return { ok: false, rows: [], error: String(e?.message || e) };
  }
}

let lastReconcile = 0;

export async function handleAdminStats(request, env) {
  const admin = await adminUser(request, env);
  // 404 volontaire : on ne révèle pas que cette page existe
  if (!admin) return Response.json({ error: "Route non trouvée" }, { status: 404 });

  const now = Date.now();
  const force = new URL(request.url).searchParams.get("refresh") === "1";

  /* 1) Auto-guérison : un paiement SasPay réussi mais pas encore activé (webhook manqué,
        page fermée…) est revérifié ici, au plus toutes les 45 s (ou à la demande). */
  const pendingProbe = await rows(
    env,
    `SELECT COUNT(*) AS n FROM payments
     WHERE status IN ('PENDING','REVIEW') AND session_id IS NOT NULL AND created_at > datetime('now','-72 hours')`
  );
  let reconciled = null;
  if (num(pendingProbe.rows[0]?.n) > 0 && (force || now - lastReconcile > 45000)) {
    lastReconcile = now;
    try {
      await reconcilePending(env);
      reconciled = true;
    } catch {
      reconciled = false;
    }
  }

  /* 2) Utilisateurs (source unique : la table users) */
  const usersQ = await rows(
    env,
    "SELECT id, full_name, email, plan, plan_started_at, plan_until, created_at FROM users ORDER BY created_at DESC LIMIT 20000"
  );
  const users = usersQ.rows;

  /* 3) Paiements : table payments (SasPay, source de vérité) + ancien journal plan_payments */
  const pq = await rows(
    env,
    `SELECT id, user_id, plan, amount, status, transaction_id, paid_at, created_at FROM payments
     ORDER BY created_at DESC LIMIT 5000`
  );
  const lq = await rows(
    env,
    "SELECT id, user_id, email, plan, amount_xof, created_at FROM plan_payments ORDER BY created_at DESC LIMIT 5000"
  );

  const emailById = new Map(users.map((u) => [u.id, u.email]));
  const nameById = new Map(users.map((u) => [u.id, u.full_name]));

  const done = [];
  for (const p of pq.rows) {
    if (p.status === "PAID" || p.status === "ACTIVATED") {
      done.push({
        user_id: p.user_id,
        email: emailById.get(p.user_id) || "",
        plan: p.plan,
        amount_xof: num(p.amount),
        at: ms(p.paid_at) ?? ms(p.created_at),
        source: "saspay",
        status: p.status,
      });
    }
  }
  for (const l of lq.rows) {
    const at = ms(l.created_at);
    const dup = done.some(
      (d) => d.user_id && d.user_id === l.user_id && d.plan === l.plan && Math.abs((d.at ?? 0) - (at ?? 0)) < DAY
    );
    if (!dup) {
      done.push({
        user_id: l.user_id,
        email: l.email || emailById.get(l.user_id) || "",
        plan: l.plan,
        amount_xof: num(l.amount_xof),
        at,
        source: "journal",
        status: "ACTIVATED",
      });
    }
  }
  done.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));

  /* 4) État de chaque abonnement */
  const payerIds = new Set(done.map((d) => d.user_id));
  const plans = { free: 0, pro: 0, business: 0, expired: 0, unlimited: 0 };
  const subscribers = [];
  const expiredList = [];
  let giftedActive = 0;
  const signupsByDay = {};
  let new24 = 0;
  let new7 = 0;
  let new30 = 0;

  const userList = users.map((u) => {
    const created = ms(u.created_at);
    if (created !== null) {
      if (now - created < DAY) new24++;
      if (now - created < 7 * DAY) new7++;
      if (now - created < 30 * DAY) new30++;
      const k = dayKey(created);
      signupsByDay[k] = (signupsByDay[k] || 0) + 1;
    }
    let state = "free";
    let plan = "free";
    const until = ms(u.plan_until, true);
    if (isUnlimitedEmail(env, u.email)) {
      state = "unlimited";
      plan = "unlimited";
      plans.unlimited++;
    } else if (u.plan === "pro" || u.plan === "business") {
      plan = u.plan;
      if (until !== null && until <= now) {
        state = "expired";
        plans.expired++;
        expiredList.push({ full_name: u.full_name, email: u.email, plan: u.plan, plan_until: u.plan_until });
      } else {
        state = "active";
        plans[u.plan]++;
        const paid = payerIds.has(u.id);
        if (!paid) giftedActive++;
        subscribers.push({
          full_name: u.full_name,
          email: u.email,
          plan: u.plan,
          started_at: u.plan_started_at,
          until: u.plan_until,
          origin: paid ? "paid" : "gift",
          days_left: until === null ? null : Math.max(0, Math.ceil((until - now) / DAY)),
        });
      }
    } else {
      plans.free++;
    }
    return { full_name: u.full_name, email: u.email, created_at: u.created_at, plan, state, until: u.plan_until };
  });

  /* 5) Revenus */
  const sum = (arr) => arr.reduce((a, d) => a + d.amount_xof, 0);
  const byPlan = {};
  for (const d of done) {
    byPlan[d.plan] = byPlan[d.plan] || { count: 0, total_xof: 0 };
    byPlan[d.plan].count++;
    byPlan[d.plan].total_xof += d.amount_xof;
  }
  const revenue = {
    total_xof: sum(done),
    last_30d_xof: sum(done.filter((d) => now - (d.at ?? 0) < 30 * DAY)),
    last_7d_xof: sum(done.filter((d) => now - (d.at ?? 0) < 7 * DAY)),
    today_xof: sum(done.filter((d) => dayKey(d.at ?? 0) === dayKey(now))),
    payments_count: done.length,
    by_plan: byPlan,
  };

  /* 6) Paiements à surveiller (payés chez SasPay mais pas activés / en attente) */
  const watch = pq.rows
    .filter((p) => ["PENDING", "REVIEW", "PAID"].includes(p.status) && now - (ms(p.created_at) ?? 0) < 7 * DAY)
    .slice(0, 12)
    .map((p) => ({
      email: emailById.get(p.user_id) || "",
      full_name: nameById.get(p.user_id) || "",
      plan: p.plan,
      amount_xof: num(p.amount),
      status: p.status,
      created_at: p.created_at,
    }));

  /* 7) Séries sur 14 jours */
  const days = [];
  for (let i = 13; i >= 0; i--) days.push(dayKey(now - i * DAY));
  const revByDay = {};
  for (const d of done) {
    const k = dayKey(d.at ?? 0);
    revByDay[k] = (revByDay[k] || 0) + d.amount_xof;
  }
  const series = days.map((day) => ({ day, signups: signupsByDay[day] || 0, revenue_xof: revByDay[day] || 0 }));

  const mrr = plans.pro * PRICES.pro + plans.business * PRICES.business;
  const totalUsers = users.length;
  const paidActive = plans.pro + plans.business;

  return new Response(
    JSON.stringify({
      generated_at: new Date(now).toISOString(),
      users: { total: totalUsers, new_24h: new24, new_7d: new7, new_30d: new30 },
      plans,
      paid_active: paidActive,
      gifted_active: giftedActive,
      conversion_pct: totalUsers ? Math.round((paidActive / totalUsers) * 1000) / 10 : 0,
      prices: PRICES,
      mrr_xof: mrr,
      arr_xof: mrr * 12,
      revenue,
      series,
      subscribers,
      expired: expiredList.slice(0, 20),
      watch,
      recent_payments: done.slice(0, 10).map((d) => ({
        email: d.email,
        plan: d.plan,
        amount_xof: d.amount_xof,
        created_at: d.at ? new Date(d.at).toISOString() : null,
        source: d.source,
      })),
      users_list: userList.slice(0, 200),
      health: {
        users_ok: usersQ.ok,
        payments_table: pq.ok,
        ledger_table: lq.ok,
        reconciled,
        pending_checked: num(pendingProbe.rows[0]?.n),
      },
    }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );
}
