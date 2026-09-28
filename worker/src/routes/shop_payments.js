import { getActiveCommission } from "./billing.js";
import { sendEmail, purchaseDeliveryEmailHtml } from "../utils/email.js";

const SASPAY_BASE = "https://api.saspay.me/api/v1";
const DEFAULT_APP_URL = "https://app.digitelio.com";
const PENDING_WINDOW_HOURS = 72;
const MAX_PENDING_CHECKS = 15;
const REUSE_MINUTES = 30;

const json = (obj, status = 200) => Response.json(obj, { status });

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

function newLearnToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ===== GET /api/pay/:code — infos publiques avant paiement ===== */
export async function handleGetPayInfo(request, env, code) {
  const link = await env.DB.prepare(
    `SELECT pl.product_type, pl.product_id, pl.price_xof, pl.active, u.full_name AS seller_name
     FROM product_links pl JOIN users u ON u.id = pl.user_id
     WHERE pl.pay_code = ?`
  )
    .bind(code)
    .first();

  if (!link || !link.active) return json({ error: "Lien de paiement introuvable." }, 404);
  if (!link.price_xof || link.price_xof <= 0) {
    return json({ error: "Ce produit n'est pas encore en vente." }, 400);
  }

  let title = "Produit";
  let description = "";
  let coverUrl = "";

  if (link.product_type === "formation") {
    const f = await env.DB.prepare(
      "SELECT title, description, cover_url FROM formations WHERE id = ?"
    )
      .bind(link.product_id)
      .first();
    title = f?.title || title;
    description = f?.description || "";
    coverUrl = f?.cover_url || "";
  } else {
    const b = await env.DB.prepare("SELECT title, description FROM ebooks WHERE id = ?")
      .bind(link.product_id)
      .first();
    title = b?.title || title;
    description = b?.description || "";
  }

  return json({
    product: {
      title,
      description,
      cover_url: coverUrl,
      price_xof: link.price_xof,
      seller_name: link.seller_name,
      product_type: link.product_type,
    },
  });
}

/* ===== POST /api/pay/:code/checkout  { buyer_email, buyer_name } ===== */
export async function handleCreateProductCheckout(request, env, code) {
  if (!env.SASPAY_API_KEY) return json({ error: "Le paiement n'est pas encore configuré." }, 500);

  const link = await env.DB.prepare(
    `SELECT id, user_id, price_xof, active FROM product_links WHERE pay_code = ?`
  )
    .bind(code)
    .first();
  if (!link || !link.active) return json({ error: "Lien de paiement introuvable." }, 404);
  if (!link.price_xof || link.price_xof <= 0) {
    return json({ error: "Ce produit n'est pas encore en vente." }, 400);
  }

  const body = await request.json().catch(() => ({}));
  const buyerEmail = String(body.buyer_email || "").trim().toLowerCase();
  const buyerName = String(body.buyer_name || "").trim().slice(0, 100);
  if (!buyerEmail || !/^\S+@\S+\.\S+$/.test(buyerEmail)) {
    return json({ error: "Adresse email invalide." }, 400);
  }

  // Test réel à petit prix : SEUL l'email TEST_EMAIL peut payer le montant TEST_AMOUNT_XOF.
  // Tous les autres acheteurs paient toujours le vrai prix. Supprimez ces 2 variables après le test.
  let chargeAmount = link.price_xof;
  if (
    env.TEST_EMAIL &&
    env.TEST_AMOUNT_XOF &&
    buyerEmail === String(env.TEST_EMAIL).trim().toLowerCase()
  ) {
    const testAmount = Math.round(Number(env.TEST_AMOUNT_XOF));
    if (Number.isFinite(testAmount) && testAmount > 0 && testAmount < chargeAmount) {
      chargeAmount = testAmount;
    }
  }

  const commissionPct = await getActiveCommission(env, link.user_id);
  const feeXof = Math.round(chargeAmount * commissionPct);
  const netXof = chargeAmount - feeXof;

  const saleId = crypto.randomUUID();
  const appUrl = String(env.APP_URL || DEFAULT_APP_URL).replace(/\/$/, "");

  const res = await saspay(env, "POST", "/checkout-sessions", {
    amount: chargeAmount.toFixed(2),
    currency: "XOF",
    description: "Achat via Digitelio AI",
    customer_email: buyerEmail,
    customer_name: buyerName || buyerEmail,
    return_url: `${appUrl}/pay/${code}?paiement=${saleId}`,
    metadata: { sale_id: saleId },
  });
  const resBody = await res.json().catch(() => null);
  const data = resBody?.data ?? resBody;

  if (!res.ok || !data?.checkout_url || !data?.id) {
    console.error("SasPay checkout produit refusé", res.status, JSON.stringify(resBody));
    return json({ error: "Impossible de créer le paiement. Réessayez dans un instant." }, 502);
  }

  await env.DB.prepare(
    `INSERT INTO sales
       (id, seller_id, product_link_id, buyer_email, buyer_name, amount_xof, commission_pct, fee_xof, net_xof, session_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`
  )
    .bind(saleId, link.user_id, link.id, buyerEmail, buyerName, chargeAmount, commissionPct, feeXof, netXof, data.id)
    .run();

  return json({ checkout_url: data.checkout_url, sale_id: saleId });
}

/* ===== Livraison automatique après paiement confirmé ===== */
async function deliverProduct(env, sale, link) {
  if (link.product_type !== "formation") return; // eBooks : rien à livrer pour l'instant

  const formation = await env.DB.prepare("SELECT id, title FROM formations WHERE id = ?")
    .bind(link.product_id)
    .first();
  if (!formation) {
    console.error("Livraison: formation introuvable", sale.id, link.product_id);
    return;
  }

  const seller = await env.DB.prepare("SELECT full_name FROM users WHERE id = ?")
    .bind(sale.seller_id)
    .first();

  const enrollmentId = crypto.randomUUID();
  const token = newLearnToken();

  await env.DB.prepare(
    "INSERT INTO enrollments (id, formation_id, learner_name, token, completed) VALUES (?, ?, ?, ?, '[]')"
  )
    .bind(enrollmentId, link.product_id, sale.buyer_name || sale.buyer_email, token)
    .run();

  const appUrl = String(env.APP_URL || DEFAULT_APP_URL).replace(/\/$/, "");
  const learnUrl = `${appUrl}/learn/${token}`;

  await sendEmail(env, {
    to: sale.buyer_email,
    toName: sale.buyer_name || sale.buyer_email,
    subject: `Votre accès à "${formation.title}" est prêt`,
    html: purchaseDeliveryEmailHtml({
      buyerName: sale.buyer_name,
      productTitle: formation.title,
      sellerName: seller?.full_name || "",
      learnUrl,
    }),
  });
  console.log("Livraison: email envoyé", sale.id, sale.buyer_email);
}

/* ===== Vérification d'une vente auprès de SasPay + crédit du wallet + livraison =====
   knownTxId : id de transaction fourni par le webhook (évite de dépendre de la session) */
async function checkSalePayment(env, s, knownTxId = null) {
  let txId = knownTxId;

  if (!txId) {
    const sRes = await saspay(env, "GET", `/checkout-sessions/${s.session_id}`);
    const sBody = await sRes.json().catch(() => null);
    const session = sBody?.data ?? sBody;
    if (!sRes.ok || !session) {
      console.error("Session SasPay illisible", s.id, sRes.status, JSON.stringify(sBody));
      return s.status;
    }

    const tx = session.transaction ?? session.transaction_id ?? session.payment ?? session.payment_id;
    txId = typeof tx === "string" ? tx : tx?.id;
    if (!txId) {
      console.log("Session sans transaction", s.id, "status:", session.status, "clés:", Object.keys(session).join(","));
      return "PENDING";
    }
  }

  const pRes = await saspay(env, "GET", `/payments/${txId}`);
  const pBody = await pRes.json().catch(() => null);
  const pay = pBody?.data ?? pBody;
  if (!pRes.ok || !pay) {
    console.error("Paiement SasPay illisible", s.id, txId, pRes.status, JSON.stringify(pBody));
    return "PENDING";
  }
  if (pay.status !== "SUCCESS") {
    console.log("Paiement pas encore SUCCESS", s.id, pay.status);
    return "PENDING";
  }

  // Accepte le montant demandé (500) ou le net (500) ; le montant débité (520) inclut les frais ADD_ON
  const expected = Number(s.amount_xof);
  const candidates = [pay.requested_amount, pay.amount, pay.net_amount]
    .filter((v) => v !== undefined && v !== null)
    .map(Number);
  const amountOk = candidates.includes(expected);

  if (pay.currency !== "XOF" || !amountOk) {
    console.error("Vente SasPay incohérente", s.id, pay.currency, JSON.stringify(candidates), expected);
    await env.DB.prepare("UPDATE sales SET status = 'REVIEW' WHERE id = ? AND status = 'PENDING'")
      .bind(s.id)
      .run();
    return "REVIEW";
  }

  // Verrou anti-doublon : une seule exécution passe (PENDING ou REVIEW -> PAID)
  const claim = await env.DB.prepare(
    `UPDATE sales SET status = 'PAID', transaction_id = ?, paid_at = datetime('now')
     WHERE id = ? AND status IN ('PENDING', 'REVIEW')`
  )
    .bind(txId, s.id)
    .run();

  if (!claim.meta?.changes) {
    const row = await env.DB.prepare("SELECT status FROM sales WHERE id = ?").bind(s.id).first();
    return row?.status || "PENDING";
  }

  console.log("Vente passée à PAID", s.id, txId);

  await env.DB.prepare(
    `INSERT INTO wallets (user_id, balance_xof) VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET balance_xof = balance_xof + ?, updated_at = datetime('now')`
  )
    .bind(s.seller_id, s.net_xof, s.net_xof)
    .run();

  // Livraison automatique : ne doit jamais faire échouer la confirmation du paiement
  try {
    const link = await env.DB.prepare(
      "SELECT product_type, product_id FROM product_links WHERE id = ?"
    )
      .bind(s.product_link_id)
      .first();
    if (link) await deliverProduct(env, s, link);
  } catch (err) {
    console.error("Échec de la livraison automatique", s.id, err.message);
  }

  return "PAID";
}

/* ===== GET /api/pay/verify?ref=<sale_id> : appelé au retour du client ===== */
export async function handleVerifyProductPayment(request, env) {
  const ref = new URL(request.url).searchParams.get("ref") || "";
  const sale = await env.DB.prepare("SELECT * FROM sales WHERE id = ?").bind(ref).first();
  if (!sale) return json({ error: "Paiement introuvable." }, 404);

  let status = sale.status;
  if ((status === "PENDING" || status === "REVIEW") && sale.session_id) {
    status = await checkSalePayment(env, sale);
  }

  return json({ status, paid: status === "PAID" });
}

/* ===== Traitement direct d'un webhook SasPay (transaction.success) =====
   Utilise metadata.sale_id et data.id envoyés par SasPay. */
export async function handleSaspayProductWebhook(env, payload) {
  const data = payload?.data ?? payload;
  const saleId = data?.metadata?.sale_id;
  const txId = data?.id;
  if (!saleId) return false; // pas une vente boutique (ex. abonnement)

  const sale = await env.DB.prepare("SELECT * FROM sales WHERE id = ?").bind(saleId).first();
  if (!sale) {
    console.error("Webhook: vente introuvable", saleId);
    return false;
  }
  if (sale.status === "PAID") return true; // déjà traité (idempotent)

  const status = await checkSalePayment(env, sale, txId || null);
  return status === "PAID";
}

/* ===== Réconcilie les ventes en attente (ou en revue) ===== */
export async function reconcilePendingSales(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM sales
     WHERE status IN ('PENDING', 'REVIEW') AND session_id IS NOT NULL AND created_at > datetime('now', ?)
     ORDER BY created_at DESC LIMIT ?`
  )
    .bind(`-${PENDING_WINDOW_HOURS} hours`, MAX_PENDING_CHECKS)
    .all();

  console.log("Réconciliation: ventes à vérifier", results.length);

  const outcomes = await Promise.allSettled(results.map((s) => checkSalePayment(env, s)));
  outcomes.forEach((o, i) => {
    if (o.status === "rejected") {
      console.error("Réconciliation en échec", results[i].id, o.reason?.message || o.reason);
    }
  });
  if (outcomes.some((o) => o.status === "rejected")) {
    throw new Error("Vérification de vente incomplète.");
  }
}
