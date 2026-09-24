import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";
import { PLANS, activatePlan } from "./billing.js";

/* Les prix (en XOF) se règlent dans routes/billing.js : PLANS.<plan>.price_xof */

const SASPAY_BASE = "https://api.saspay.me/api/v1";
const DEFAULT_APP_URL = "https://app.digitelio.com";
const TOLERANCE_SECONDS = 300; // rejet d'un webhook trop ancien (5 min)
const PENDING_WINDOW_HOURS = 48; // on ne revérifie que les paiements récents
const MAX_PENDING_CHECKS = 15;
const REUSE_MINUTES = 30; // réutilise une session ouverte récemment (anti double-clic)

const json = (obj, status = 200) => Response.json(obj, { status });

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

/* ---------- Appel à l'API SasPay ---------- */
/* Le chemin exact peut se terminer ou non par "/" : on essaie les deux. */
async function saspay(env, method, path, body) {
  const init = {
    method,
    headers: {
      Authorization: `Bearer ${env.SASPAY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  };
  let res;
  for (const suffix of ["/", ""]) {
    res = await fetch(`${SASPAY_BASE}${path}${suffix}`, init);
    if (![301, 302, 307, 308, 404, 405].includes(res.status)) return res;
  }
  return res;
}

/* ---------- Signature des webhooks ---------- */

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* Comparaison en temps constant */
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ---------- Vérification d'un paiement auprès de SasPay ----------
   On ne fait JAMAIS confiance au contenu du webhook : on relit l'état réel
   de la session puis de la transaction avec notre clé API secrète. */
async function checkPayment(env, p) {
  const sRes = await saspay(env, "GET", `/checkout-sessions/${p.session_id}`);
  const session = await sRes.json().catch(() => null);
  if (!sRes.ok || !session) return p.status;

  const tx = session.transaction;
  const txId = typeof tx === "string" ? tx : tx?.id;
  if (!txId) return "PENDING"; // pas encore payé

  const pRes = await saspay(env, "GET", `/payments/${txId}`);
  const pay = await pRes.json().catch(() => null);
  if (!pRes.ok || !pay) return "PENDING";
  if (pay.status !== "SUCCESS") return "PENDING"; // en cours, échoué ou annulé : le client peut réessayer

  // Contrôle du montant et de la devise
  const paidAmount = Number(pay.requested_amount ?? pay.amount);
  if (pay.currency !== "XOF" || paidAmount !== Number(p.amount)) {
    console.error("Paiement SasPay incohérent", p.id, pay.currency, paidAmount, p.amount);
    await env.DB.prepare("UPDATE payments SET status = 'REVIEW' WHERE id = ? AND status = 'PENDING'")
      .bind(p.id)
      .run();
    return "REVIEW";
  }

  const user = await env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(p.user_id).first();
  if (!user) {
    await env.DB.prepare("UPDATE payments SET status = 'REVIEW' WHERE id = ? AND status = 'PENDING'")
      .bind(p.id)
      .run();
    return "REVIEW";
  }

  // On "réserve" le paiement : une seule exécution peut l'activer (anti double-activation)
  const claim = await env.DB.prepare(
    `UPDATE payments SET status = 'PAID', transaction_id = ?, paid_at = datetime('now')
     WHERE id = ? AND status = 'PENDING'`
  )
    .bind(txId, p.id)
    .run();

  if (!claim.meta?.changes) {
    const row = await env.DB.prepare("SELECT status FROM payments WHERE id = ?").bind(p.id).first();
    return row?.status || "PENDING";
  }

  try {
    await activatePlan(env, user.email, p.plan);
    await env.DB.prepare("UPDATE payments SET status = 'ACTIVATED' WHERE id = ?").bind(p.id).run();
    return "ACTIVATED";
  } catch (err) {
    // On remet en attente pour qu'une prochaine vérification réessaie
    await env.DB.prepare("UPDATE payments SET status = 'PENDING' WHERE id = ?").bind(p.id).run();
    throw err;
  }
}

async function reconcilePending(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, user_id, plan, amount, session_id, status FROM payments
     WHERE status = 'PENDING' AND session_id IS NOT NULL AND created_at > datetime('now', ?)
     ORDER BY created_at DESC LIMIT ?`
  )
    .bind(`-${PENDING_WINDOW_HOURS} hours`, MAX_PENDING_CHECKS)
    .all();

  const outcomes = await Promise.allSettled(results.map((p) => checkPayment(env, p)));
  if (outcomes.some((o) => o.status === "rejected")) {
    throw new Error("Vérification de paiement incomplète.");
  }
}

/* ===== POST /api/billing/checkout  { plan: "pro" | "business" } ===== */
export async function handleCreateCheckout(request, env) {
  const auth = await getAuthenticatedUser(request, env);
  if (!auth) return json({ error: "Non authentifié." }, 401);
  if (!env.SASPAY_API_KEY) return json({ error: "Le paiement n'est pas encore configuré." }, 500);

  const body = await request.json().catch(() => null);
  const plan = String(body?.plan || "");
  const amount = PLANS[plan]?.price_xof;
  if (!amount || plan === "free") {
    return json({ error: "Plan invalide." }, 400);
  }

  const user = await env.DB.prepare("SELECT email, full_name FROM users WHERE id = ?")
    .bind(auth.sub)
    .first();
  if (!user) return json({ error: "Compte introuvable." }, 404);

  // Anti double-clic : on réutilise une session ouverte il y a moins de 30 minutes
  const recent = await env.DB.prepare(
    `SELECT id, checkout_url FROM payments
     WHERE user_id = ? AND plan = ? AND status = 'PENDING' AND checkout_url IS NOT NULL
       AND created_at > datetime('now', ?)
     ORDER BY created_at DESC LIMIT 1`
  )
    .bind(auth.sub, plan, `-${REUSE_MINUTES} minutes`)
    .first();
  if (recent) return json({ checkout_url: recent.checkout_url, payment_id: recent.id });

  const paymentId = crypto.randomUUID();
  const appUrl = String(env.APP_URL || DEFAULT_APP_URL).replace(/\/$/, "");

  // Page où renvoyer le client après paiement (chemin interne uniquement)
  let returnPath = String(body?.return_path || "");
  if (!/^\/[A-Za-z0-9_\-\/]{0,100}$/.test(returnPath) || returnPath.includes("//")) returnPath = "/";

  const res = await saspay(env, "POST", "/checkout-sessions", {
    amount: amount.toFixed(2),
    currency: "XOF",
    description: `Abonnement Digitelio AI ${PLANS[plan].name}`,
    customer_email: user.email,
    customer_name: user.full_name || user.email,
    return_url: `${appUrl}${returnPath}?paiement=${paymentId}`,
    metadata: { payment_id: paymentId },
  });
  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.checkout_url || !data?.id) {
    console.error("SasPay checkout refusé", res.status, data?.message || data?.detail || "");
    return json({ error: "Impossible de créer le paiement. Réessayez dans un instant." }, 502);
  }

  await env.DB.prepare(
    `INSERT INTO payments (id, user_id, plan, amount, currency, session_id, checkout_url, status)
     VALUES (?, ?, ?, ?, 'XOF', ?, ?, 'PENDING')`
  )
    .bind(paymentId, auth.sub, plan, amount, data.id, data.checkout_url)
    .run();

  return json({ checkout_url: data.checkout_url, payment_id: paymentId });
}

/* ===== GET /api/billing/verify?ref=<payment_id> : appelé au retour du client ===== */
export async function handleVerifyPayment(request, env) {
  const auth = await getAuthenticatedUser(request, env);
  if (!auth) return json({ error: "Non authentifié." }, 401);

  const ref = new URL(request.url).searchParams.get("ref") || "";
  const p = await env.DB.prepare(
    "SELECT id, user_id, plan, amount, session_id, status FROM payments WHERE id = ? AND user_id = ?"
  )
    .bind(ref, auth.sub)
    .first();
  if (!p) return json({ error: "Paiement introuvable." }, 404);

  let status = p.status;
  if (status === "PENDING" && p.session_id) status = await checkPayment(env, p);

  return json({ status, paid: status === "ACTIVATED", plan: p.plan });
}

/* ===== POST /api/webhooks/saspay : appelé par SasPay ===== */
export async function handleSaspayWebhook(request, env) {
  if (!env.SASPAY_WEBHOOK_SECRET || !env.SASPAY_API_KEY) {
    return json({ error: "Webhook non configuré." }, 500);
  }

  const rawBody = await request.text(); // corps brut : la signature est calculée dessus
  const timestamp = request.headers.get("X-Webhook-Timestamp") || "";
  const signature = (request.headers.get("X-Webhook-Signature") || "").toLowerCase();

  // 1) Contrôle de l'âge
  let ts = Number(timestamp);
  if (ts > 1e12) ts = ts / 1000; // au cas où l'horodatage serait en millisecondes
  if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > TOLERANCE_SECONDS) {
    return json({ error: "Horodatage invalide." }, 400);
  }

  // 2) Contrôle de la signature
  const expected = await hmacHex(env.SASPAY_WEBHOOK_SECRET, `${timestamp}.${rawBody}`);
  if (!safeEqual(signature, expected)) {
    return json({ error: "Signature invalide." }, 401);
  }

  let event = "";
  try {
    event = JSON.parse(rawBody).event || "";
  } catch {
    return json({ error: "Corps invalide." }, 400);
  }

  // Le webhook sert de déclencheur : l'état réel est relu auprès de SasPay
  if (typeof event === "string" && event.startsWith("transaction.")) {
    await reconcilePending(env); // en cas d'erreur -> 500 -> SasPay réessaie
  }

  return json({ received: true });
    }
