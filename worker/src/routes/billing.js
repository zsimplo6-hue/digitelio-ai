import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";

/* ============================ À PERSONNALISER ============================ */

export const CONTACT = {
  whatsapp: "", // votre WhatsApp au format international, sans + ni espaces. Ex : "2250700000000"
  payment_urls: {
    pro: "",      // lien de paiement du plan Pro (sera remplacé par Orqex)
    business: "", // lien de paiement du plan Business
  },
};

export const PLANS = {
  free: {
    name: "Gratuit",
    price_text: "0 €",
    limits: { ebook: 1, formation: 1, lesson: 15, marketing: 10, learners: 10 },
  },
  pro: {
    name: "Pro",
    price_text: "19 € / mois",
    limits: { ebook: 10, formation: 10, lesson: 200, marketing: 100, learners: 100 },
  },
  business: {
    name: "Business",
    price_text: "49 € / mois",
    limits: { ebook: 50, formation: 30, lesson: 600, marketing: 300, learners: 300 },
  },
};

/* ========================================================================= */

const LABELS = {
  ebook: "eBooks par mois",
  formation: "formations créées par mois",
  lesson: "leçons générées par l'IA par mois",
  marketing: "contenus marketing par mois",
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

const monthKey = () => new Date().toISOString().slice(0, 7);

/* Plan réellement actif : un plan payant expiré redevient Gratuit */
function effectivePlan(user) {
  if (!user || !PLANS[user.plan] || user.plan === "free") return "free";
  if (user.plan_until) {
    const s = String(user.plan_until);
    const until = new Date(s.length <= 10 ? `${s}T23:59:59Z` : `${s.replace(" ", "T")}Z`);
    if (!isNaN(until.getTime()) && until.getTime() < Date.now()) return "free";
  }
  return user.plan;
}

async function loadPlan(env, userId) {
  const user = await env.DB.prepare("SELECT email, plan, plan_until FROM users WHERE id = ?")
    .bind(userId)
    .first();
  return { user, planKey: effectivePlan(user) };
}

function blockedResponse(planKey, what, limit, used, monthly) {
  let tail;
  if (planKey === "free") tail = "Passez à un plan payant dans « Abonnements » pour continuer.";
  else if (planKey === "pro") tail = "Passez au plan Business dans « Abonnements » pour continuer.";
  else tail = "Réessayez le mois prochain ou contactez le support.";
  const reset = monthly ? " Le compteur repart à zéro le 1er du mois." : "";
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

/* Vérifie le quota mensuel AVANT une action. Renvoie { blocked: Response|null, userId } */
export async function checkQuota(request, env, kind) {
  const auth = await getAuthenticatedUser(request, env);
  if (!auth) return { blocked: null, userId: null }; // la route répondra elle-même 401

  const { planKey } = await loadPlan(env, auth.sub);
  const limit = PLANS[planKey].limits[kind];

  const row = await env.DB.prepare(
    "SELECT count FROM usage_monthly WHERE user_id = ? AND month = ? AND kind = ?"
  )
    .bind(auth.sub, monthKey(), kind)
    .first();
  const used = row?.count || 0;

  if (used >= limit) {
    return { userId: auth.sub, blocked: blockedResponse(planKey, LABELS[kind], limit, used, true) };
  }
  return { userId: auth.sub, blocked: null };
}

/* Enregistre une utilisation réussie */
export async function recordUsage(env, userId, kind) {
  if (!userId) return;
  await env.DB.prepare(
    `INSERT INTO usage_monthly (user_id, month, kind, count) VALUES (?, ?, ?, 1)
     ON CONFLICT(user_id, month, kind) DO UPDATE SET count = count + 1`
  )
    .bind(userId, monthKey(), kind)
    .run();
}

/* Limite d'apprenants par formation. Renvoie une Response si bloqué, sinon null */
export async function checkLearners(request, env, formationId) {
  const auth = await getAuthenticatedUser(request, env);
  if (!auth) return null;

  const { planKey } = await loadPlan(env, auth.sub);
  const limit = PLANS[planKey].limits.learners;

  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM enrollments WHERE formation_id = ?")
    .bind(formationId)
    .first();
  const used = row?.n || 0;

  if (used >= limit) {
    return blockedResponse(planKey, "apprenants par formation", limit, used, false);
  }
  return null;
}

/* GET /api/billing : plan, consommation du mois, comparaison des plans */
export async function handleBilling(request, env) {
  const auth = await getAuthenticatedUser(request, env);
  if (!auth) return Response.json({ error: "Non authentifié." }, { status: 401 });

  const { user, planKey } = await loadPlan(env, auth.sub);
  if (!user) return Response.json({ error: "Compte introuvable." }, { status: 404 });

  const { results } = await env.DB.prepare(
    "SELECT kind, count FROM usage_monthly WHERE user_id = ? AND month = ?"
  )
    .bind(auth.sub, monthKey())
    .all();

  const usage = { ebook: 0, formation: 0, lesson: 0, marketing: 0 };
  for (const r of results) if (r.kind in usage) usage[r.kind] = r.count;

  const now = new Date();
  const resetOn = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    .toISOString()
    .slice(0, 10);

  return Response.json({
    email: user.email,
    plan: planKey,
    plan_name: PLANS[planKey].name,
    plan_until: planKey !== "free" ? user.plan_until || null : null,
    expired: user.plan !== "free" && !!PLANS[user.plan] && planKey === "free",
    limits: PLANS[planKey].limits,
    usage,
    reset_on: resetOn,
    plans: Object.entries(PLANS).map(([key, p]) => ({
      key,
      name: p.name,
      price_text: p.price_text,
      limits: p.limits,
    })),
    contact: CONTACT,
  });
    }
