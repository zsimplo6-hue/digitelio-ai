import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";
import { isUnlimitedEmail, activatePlan, PLANS } from "./billing.js";
import { checkPayment } from "./payments.js";

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
const lc = (s) => String(s || "").trim().toLowerCase();

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

let flagsReady = false;
async function ensureFlags(env) {
  if (flagsReady) return;
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS admin_payment_flags (payment_id TEXT PRIMARY KEY, test INTEGER NOT NULL)"
  ).run();
  flagsReady = true;
}

/* Comptes internes : administrateurs, comptes illimités, compte de test. Leurs paiements et abonnements
   sont des essais : ils n'entrent ni dans le chiffre d'affaires ni dans les abonnés. */
function internalEmails(env) {
  const set = new Set(String(env.ADMIN_EMAILS || "").split(",").map(lc).filter(Boolean));
  if (env.TEST_EMAIL) set.add(lc(env.TEST_EMAIL));
  return set;
}

let lastHeal = 0;

export async function handleAdminStats(request, env) {
  const admin = await adminUser(request, env);
  // 404 volontaire : on ne révèle pas que cette page existe
  if (!admin) return Response.json({ error: "Route non trouvée" }, { status: 404 });

  const now = Date.now();
  const force = new URL(request.url).searchParams.get("refresh") === "1";

  /* 1) Auto-guérison : revérifie chez SasPay les paiements en attente (72 h) ou « à vérifier »
        (quelle que soit leur ancienneté) et active les abonnements des paiements réussis. */
  let healed = 0;
  if (force || now - lastHeal > 45000) {
    lastHeal = now;
    const todo = await rows(
      env,
      `SELECT id, user_id, plan, amount, session_id, status FROM payments
       WHERE session_id IS NOT NULL AND (
         status = 'REVIEW' OR (status = 'PENDING' AND created_at > datetime('now','-72 hours'))
       ) ORDER BY created_at DESC LIMIT 8`
    );
    for (const p of todo.rows) {
      try {
        const st = await checkPayment(env, p);
        if (st === "ACTIVATED") healed++;
      } catch (e) {
        console.error("Auto-vérification échouée", p.id, e?.message || e);
      }
    }
  }

  /* 2) Utilisateurs */
  const usersQ = await rows(
    env,
    "SELECT id, full_name, email, plan, plan_started_at, plan_until, created_at FROM users ORDER BY created_at DESC LIMIT 20000"
  );
  const users = usersQ.rows;
  const userById = new Map(users.map((u) => [u.id, u]));
  const internal = internalEmails(env);
  const isInternal = (email) => internal.has(lc(email)) || isUnlimitedEmail(env, email);

  /* 3) Paiements : table payments (SasPay) + ancien journal plan_payments */
  const pq = await rows(
    env,
    `SELECT id, user_id, plan, amount, currency, status, transaction_id, paid_at, created_at FROM payments
     ORDER BY created_at DESC LIMIT 5000`
  );
  const lq = await rows(
    env,
    "SELECT id, user_id, email, plan, amount_xof, created_at FROM plan_payments ORDER BY created_at DESC LIMIT 5000"
  );
  let flags = new Map();
  try {
    await ensureFlags(env);
    const fq = await rows(env, "SELECT payment_id, test FROM admin_payment_flags");
    flags = new Map(fq.rows.map((f) => [f.payment_id, num(f.test) === 1]));
  } catch {
    /* sans marquage manuel : règle automatique seulement */
  }

  const ledger = [];
  for (const p of pq.rows) {
    const u = userById.get(p.user_id);
    ledger.push({
      id: p.id,
      user_id: p.user_id,
      email: u?.email || "",
      name: u?.full_name || "",
      plan: p.plan,
      amount_xof: num(p.amount),
      currency: p.currency || "XOF",
      status: p.status || "PENDING",
      created_at: p.created_at,
      paid_at: p.paid_at,
      at: ms(p.paid_at) ?? ms(p.created_at),
      source: "saspay",
    });
  }
  for (const l of lq.rows) {
    const at = ms(l.created_at);
    /* Une ligne du journal correspond à un paiement SasPay déjà listé (un pour un) : l'activation
       est enregistrée au moment du paiement, ou plus tard en cas d'activation manuelle. */
    let dup = null;
    for (const d of ledger) {
      if (d.source !== "saspay" || d.matched || !["PAID", "ACTIVATED"].includes(d.status)) continue;
      if (!d.user_id || d.user_id !== l.user_id || d.plan !== l.plan) continue;
      const diff = (at ?? 0) - (d.at ?? 0);
      if (diff >= -DAY && diff <= 60 * DAY && (!dup || Math.abs(diff) < Math.abs((at ?? 0) - (dup.at ?? 0)))) dup = d;
    }
    if (dup) dup.matched = true;
    if (dup) continue;
    const u = userById.get(l.user_id);
    ledger.push({
      id: `l:${l.id}`,
      user_id: l.user_id,
      email: l.email || u?.email || "",
      name: u?.full_name || "",
      plan: l.plan,
      amount_xof: num(l.amount_xof),
      currency: "XOF",
      status: "ACTIVATED",
      created_at: l.created_at,
      paid_at: l.created_at,
      at,
      source: "journal",
    });
  }
  ledger.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));

  for (const d of ledger) {
    const auto = isInternal(d.email);
    d.test = flags.has(d.id) ? flags.get(d.id) : auto;
    d.test_auto = auto;
    const u = userById.get(d.user_id);
    const until = u ? ms(u.plan_until, true) : null;
    d.user_state = !u
      ? "none"
      : (u.plan === "pro" || u.plan === "business") && (until === null || until > now)
      ? "active"
      : u.plan === "pro" || u.plan === "business"
      ? "expired"
      : "free";
    d.user_until = u?.plan_until || null;
  }

  const real = ledger.filter((d) => ["PAID", "ACTIVATED"].includes(d.status) && !d.test);
  const testPaid = ledger.filter((d) => ["PAID", "ACTIVATED"].includes(d.status) && d.test);
  const payerIds = new Set(real.map((d) => d.user_id));

  /* 4) Abonnements */
  const plans = { free: 0, pro: 0, business: 0, expired: 0, unlimited: 0, internal: 0, gifted: 0 };
  const subscribers = [];
  const expiredList = [];
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
      const expired = until !== null && until <= now;
      if (isInternal(u.email)) {
        state = "internal";
        plans.internal++;
      } else if (expired) {
        state = "expired";
        plans.expired++;
        expiredList.push({ full_name: u.full_name, email: u.email, plan: u.plan, plan_until: u.plan_until });
      } else if (payerIds.has(u.id)) {
        state = "active";
        plans[u.plan]++;
        subscribers.push({
          full_name: u.full_name, email: u.email, plan: u.plan, started_at: u.plan_started_at, until: u.plan_until,
          origin: "paid", days_left: until === null ? null : Math.max(0, Math.ceil((until - now) / DAY)),
        });
      } else {
        state = "gifted";
        plans.gifted++;
        subscribers.push({
          full_name: u.full_name, email: u.email, plan: u.plan, started_at: u.plan_started_at, until: u.plan_until,
          origin: "gift", days_left: until === null ? null : Math.max(0, Math.ceil((until - now) / DAY)),
        });
      }
    } else {
      plans.free++;
    }
    return { full_name: u.full_name, email: u.email, created_at: u.created_at, plan, state, until: u.plan_until };
  });

  /* 5) Revenus (paiements réels uniquement) */
  const sum = (arr) => arr.reduce((a, d) => a + d.amount_xof, 0);
  const byPlan = {};
  for (const d of real) {
    byPlan[d.plan] = byPlan[d.plan] || { count: 0, total_xof: 0 };
    byPlan[d.plan].count++;
    byPlan[d.plan].total_xof += d.amount_xof;
  }
  const revenue = {
    total_xof: sum(real),
    last_30d_xof: sum(real.filter((d) => now - (d.at ?? 0) < 30 * DAY)),
    last_7d_xof: sum(real.filter((d) => now - (d.at ?? 0) < 7 * DAY)),
    today_xof: sum(real.filter((d) => dayKey(d.at ?? 0) === dayKey(now))),
    payments_count: real.length,
    by_plan: byPlan,
    test_xof: sum(testPaid),
    test_count: testPaid.length,
  };

  /* 6) Compteurs du journal */
  const counts = { ACTIVATED: 0, PAID: 0, REVIEW: 0, PENDING: 0, FAILED: 0 };
  for (const d of ledger) if (!d.test && d.status in counts) counts[d.status]++;
  const todo = counts.REVIEW + counts.PAID;

  /* 7) Séries 14 jours */
  const days = [];
  for (let i = 13; i >= 0; i--) days.push(dayKey(now - i * DAY));
  const revByDay = {};
  for (const d of real) {
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
      gifted_active: plans.gifted,
      conversion_pct: totalUsers ? Math.round((paidActive / totalUsers) * 1000) / 10 : 0,
      prices: PRICES,
      mrr_xof: mrr,
      arr_xof: mrr * 12,
      revenue,
      series,
      subscribers,
      expired: expiredList.slice(0, 20),
      ledger: ledger.slice(0, 300).map(({ at, matched, ...d }) => d),
      counts,
      todo,
      healed,
      users_list: userList.slice(0, 200),
      health: { users_ok: usersQ.ok, payments_table: pq.ok, ledger_table: lq.ok },
    }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );
}

/* ---------- Actions de l'administrateur sur un paiement ---------- */

const json = (o, status = 200) => Response.json(o, { status, headers: { "Cache-Control": "no-store" } });

async function loadPayment(env, id) {
  return env.DB.prepare(
    "SELECT id, user_id, plan, amount, session_id, status FROM payments WHERE id = ?"
  )
    .bind(id)
    .first();
}

/* POST /api/admin/payments  { action: "verify" | "activate" | "test", id, test? } */
export async function handleAdminPaymentAction(request, env) {
  const admin = await adminUser(request, env);
  if (!admin) return json({ error: "Route non trouvée" }, 404);

  const body = await request.json().catch(() => null);
  const action = String(body?.action || "");
  const id = String(body?.id || "");
  if (!id) return json({ error: "Paiement manquant." }, 400);

  if (action === "test") {
    try {
      await ensureFlags(env);
      await env.DB.prepare(
        "INSERT INTO admin_payment_flags (payment_id, test) VALUES (?, ?) ON CONFLICT(payment_id) DO UPDATE SET test = excluded.test"
      )
        .bind(id, body?.test ? 1 : 0)
        .run();
      return json({ ok: true });
    } catch (e) {
      return json({ error: "Marquage impossible." }, 500);
    }
  }

  const p = await loadPayment(env, id);
  if (!p) return json({ error: "Paiement introuvable." }, 404);

  if (action === "verify") {
    if (!p.session_id) return json({ error: "Ce paiement n'a pas de session SasPay à vérifier." }, 400);
    try {
      const status = await checkPayment(env, p);
      return json({ ok: true, status });
    } catch (e) {
      return json({ error: `Vérification impossible : ${e?.message || "erreur"}` }, 502);
    }
  }

  if (action === "activate") {
    if (!PLANS[p.plan] || p.plan === "free") return json({ error: "Plan invalide." }, 400);
    if (p.status === "ACTIVATED") return json({ ok: true, status: "ACTIVATED" });
    const user = await env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(p.user_id).first();
    if (!user) return json({ error: "Compte introuvable." }, 404);
    const claim = await env.DB.prepare(
      "UPDATE payments SET status = 'ACTIVATED', paid_at = COALESCE(paid_at, datetime('now')) WHERE id = ? AND status != 'ACTIVATED'"
    )
      .bind(p.id)
      .run();
    if (!claim.meta?.changes) return json({ ok: true, status: "ACTIVATED" });
    try {
      await activatePlan(env, user.email, p.plan);
      return json({ ok: true, status: "ACTIVATED" });
    } catch (e) {
      await env.DB.prepare("UPDATE payments SET status = ? WHERE id = ?").bind(p.status, p.id).run();
      return json({ error: `Activation impossible : ${e?.message || "erreur"}` }, 500);
    }
  }

  return json({ error: "Action inconnue." }, 400);
}
