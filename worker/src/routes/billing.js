import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";

/* ============================ À PERSONNALISER ============================ */

export const CONTACT = {
  whatsapp: "", // votre WhatsApp au format international, sans + ni espaces. Ex : "2250700000000"
  payment_urls: {
    pro: "",      // lien de paiement du plan Pro (inutilisé : le paiement passe désormais par SasPay)
    business: "", // lien de paiement du plan Business
  },
};

export const PLANS = {
  free: {
    name: "Gratuit",
    price_text: "Gratuit",
    price_xof: 0,
    limits: { ebook: 1, formation: 1, lesson: 15, marketing: 10, learners: 10 },
  },
  pro: {
    name: "Pro",
    price_text: "9 900 FCFA / mois",
    price_xof: 9900, // montant réellement facturé via SasPay (en XOF) : à garder cohérent avec price_text
    limits: { ebook: 10, formation: 10, lesson: 200, marketing: 100, learners: 100 },
  },
  business: {
    name: "Business",
    price_text: "24 900 FCFA / mois",
    price_xof: 24900,
    limits: { ebook: 50, formation: 30, lesson: 600, marketing: 300, learners: 300 },
  },
};

export const PLAN_DAYS = 30; // durée d'un abonnement

/* ========================================================================= */

const WINDOW_MS = PLAN_DAYS * 24 * 60 * 60 * 1000;

const LABELS = {
  ebook: "eBooks par période",
  formation: "formations créées par période",
  lesson: "leçons générées par l'IA par période",
  marketing: "contenus marketing par période",
};

async function getAuthenticatedUser(request, env) {
  try {
    const cookies = parseCookies(request);
    const token = cookies["digitelio_session"];
    if (!token) return null;
    return await verifyJWT(token, env.JWT_SECRET);
  } catch {
    return null;
  }
}

/* ---------- Dates : stockées en UTC "AAAA-MM-JJ HH:MM:SS" ---------- */

function parseDb(s, endOfDay = false) {
  if (!s) return null;
  const str = String(s).trim();
  let iso;
  if (str.length <= 10) iso = `${str}T${endOfDay ? "23:59:59" : "00:00:00"}Z`;
  else iso = str.endsWith("Z") ? str.replace(" ", "T") : `${str.replace(" ", "T")}Z`;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

const toDb = (ms) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");
const toIso = (ms) => (ms === null || ms === undefined ? null : new Date(ms).toISOString());

/* ---------- État de l'abonnement ---------- */

function subscriptionState(user, now = Date.now()) {
  const paid = user && user.plan && user.plan !== "free" && PLANS[user.plan];
  if (!paid) return { status: "free", planKey: "free", startMs: null, untilMs: null };

  const startMs = parseDb(user.plan_started_at);
  const untilMs = parseDb(user.plan_until, true);

  if (untilMs !== null && untilMs <= now) {
    return { status: "expired", planKey: "free", expiredPlan: user.plan, startMs, untilMs };
  }
  return { status: "active", planKey: user.plan, startMs, untilMs };
}

/* Période de comptage des quotas :
   - abonné : fenêtres de 30 jours à partir de son paiement
   - gratuit (ou abonné sans date de début) : mois calendaire */
function usagePeriod(state, now = Date.now()) {
  if (state.status === "active" && state.startMs !== null) {
    const idx = Math.max(0, Math.floor((now - state.startMs) / WINDOW_MS));
    return {
      key: `p:${toDb(state.startMs)}:${idx}`,
      resetAtMs: state.startMs + (idx + 1) * WINDOW_MS,
    };
  }
  const d = new Date(now);
  return {
    key: d.toISOString().slice(0, 7),
    resetAtMs: Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1),
  };
}

async function loadUser(env, userId) {
  return env.DB.prepare(
    "SELECT email, plan, plan_started_at, plan_until FROM users WHERE id = ?"
  )
    .bind(userId)
    .first();
}

function expiredResponse(state) {
  return Response.json(
    {
      error:
        "Votre abonnement a expiré. Renouvelez-le dans « Abonnements » pour continuer à utiliser Digitelio AI.",
      code: "subscription_expired",
      expired_at: toIso(state.untilMs),
    },
    { status: 403 }
  );
}

function blockedResponse(planKey, what, limit, used, recurring) {
  let tail;
  if (planKey === "free") tail = "Passez à un plan payant dans « Abonnements » pour continuer.";
  else if (planKey === "pro") tail = "Passez au plan Business dans « Abonnements » pour continuer.";
  else tail = "Réessayez à la prochaine période ou contactez le support.";

  let reset = "";
  if (recurring) {
    reset =
      planKey === "free"
        ? " Le compteur repart à zéro le 1er du mois."
        : " Le compteur repart à zéro à votre prochaine période de 30 jours.";
  }

  return Response.json(
    {
      error: `Limite du plan ${PLANS[planKey].name} atteinte : ${limit} ${what}.${reset} ${tail}`,
      code: "limit_reached",
      plan: planKey,
      limit,
      used,
    },
    { status: 403 }
  );
}

/* Bloque tout compte dont l'abonnement a expiré. Renvoie une Response si bloqué, sinon null */
export async function checkAccess(request, env) {
  const auth = await getAuthenticatedUser(request, env);
  if (!auth) return null;
  const user = await loadUser(env, auth.sub);
  if (!user) return null;
  const state = subscriptionState(user);
  return state.status === "expired" ? expiredResponse(state) : null;
}

/* Vérifie le quota AVANT une action. Renvoie { blocked, userId, period } */
export async function checkQuota(request, env, kind) {
  const auth = await getAuthenticatedUser(request, env);
  if (!auth) return { blocked: null, userId: null, period: null }; // la route répondra elle-même 401

  const user = await loadUser(env, auth.sub);
  const state = subscriptionState(user);
  if (state.status === "expired") {
    return { userId: auth.sub, period: null, blocked: expiredResponse(state) };
  }

  const period = usagePeriod(state);
  const limit = PLANS[state.planKey].limits[kind];

  const row = await env.DB.prepare(
    "SELECT count FROM usage_monthly WHERE user_id = ? AND month = ? AND kind = ?"
  )
    .bind(auth.sub, period.key, kind)
    .first();
  const used = row?.count || 0;

  if (used >= limit) {
    return {
      userId: auth.sub,
      period: period.key,
      blocked: blockedResponse(state.planKey, LABELS[kind], limit, used, true),
    };
  }
  return { userId: auth.sub, period: period.key, blocked: null };
}

/* Enregistre une utilisation réussie */
export async function recordUsage(env, userId, kind, periodKey) {
  if (!userId) return;
  const key = periodKey || new Date().toISOString().slice(0, 7);
  await env.DB.prepare(
    `INSERT INTO usage_monthly (user_id, month, kind, count) VALUES (?, ?, ?, 1)
     ON CONFLICT(user_id, month, kind) DO UPDATE SET count = count + 1`
  )
    .bind(userId, key, kind)
    .run();
}

/* Limite d'apprenants par formation. Renvoie une Response si bloqué, sinon null */
export async function checkLearners(request, env, formationId) {
  const auth = await getAuthenticatedUser(request, env);
  if (!auth) return null;

  const user = await loadUser(env, auth.sub);
  const state = subscriptionState(user);
  if (state.status === "expired") return expiredResponse(state);

  const limit = PLANS[state.planKey].limits.learners;
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM enrollments WHERE formation_id = ?")
    .bind(formationId)
    .first();
  const used = row?.n || 0;

  if (used >= limit) {
    return blockedResponse(state.planKey, "apprenants par formation", limit, used, false);
  }
  return null;
}

/* ===== ACTIVATION : à appeler quand un paiement est CONFIRMÉ (webhook Orqex) =====
   - abonnement expiré, gratuit ou changement de plan : démarre à l'instant T pour 30 jours
   - renouvellement du même plan encore actif : ajoute 30 jours à la date de fin actuelle */
export async function activatePlan(env, email, planKey) {
  if (!PLANS[planKey] || planKey === "free") throw new Error("Plan invalide.");

  const user = await env.DB.prepare(
    "SELECT id, plan, plan_started_at, plan_until FROM users WHERE email = ?"
  )
    .bind(String(email || "").toLowerCase())
    .first();
  if (!user) throw new Error("Compte introuvable.");

  const now = Date.now();
  const state = subscriptionState(user, now);

  let startMs;
  let untilMs;
  if (state.status === "active" && user.plan === planKey && state.untilMs !== null) {
    startMs = state.startMs ?? now;
    untilMs = state.untilMs + WINDOW_MS;
  } else {
    startMs = now;
    untilMs = now + WINDOW_MS;
  }

  await env.DB.prepare(
    `UPDATE users
     SET plan = ?, plan_started_at = ?, plan_until = ?, updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(planKey, toDb(startMs), toDb(untilMs), user.id)
    .run();

  return { plan: planKey, started_at: toIso(startMs), until: toIso(untilMs) };
}

/* GET /api/billing : plan, échéance, consommation, comparaison des plans */
export async function handleBilling(request, env) {
  const auth = await getAuthenticatedUser(request, env);
  if (!auth) return Response.json({ error: "Non authentifié." }, { status: 401 });

  const user = await loadUser(env, auth.sub);
  if (!user) return Response.json({ error: "Compte introuvable." }, { status: 404 });

  const now = Date.now();
  const state = subscriptionState(user, now);
  const period = usagePeriod(state, now);

  const { results } = await env.DB.prepare(
    "SELECT kind, count FROM usage_monthly WHERE user_id = ? AND month = ?"
  )
    .bind(auth.sub, period.key)
    .all();

  const usage = { ebook: 0, formation: 0, lesson: 0, marketing: 0 };
  for (const r of results) if (r.kind in usage) usage[r.kind] = r.count;

  return Response.json({
    email: user.email,
    status: state.status, // "free" | "active" | "expired"
    plan: state.planKey,
    plan_name: PLANS[state.planKey].name,
    expired: state.status === "expired",
    expired_plan_name: state.expiredPlan ? PLANS[state.expiredPlan].name : null,
    started_at: toIso(state.startMs),
    until: toIso(state.untilMs),
    server_time: toIso(now),
    limits: PLANS[state.planKey].limits,
    usage,
    reset_at: toIso(period.resetAtMs),
    plans: Object.entries(PLANS).map(([key, p]) => ({
      key,
      name: p.name,
      price_text: p.price_text,
      limits: p.limits,
    })),
    contact: CONTACT,
  });
}
