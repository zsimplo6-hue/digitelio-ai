import { getActiveCommission } from "./billing.js";
import { sendEmail, purchaseDeliveryEmailHtml } from "../utils/email.js";

const SASPAY_BASE = "https://api.saspay.me/api/v1";
const DEFAULT_APP_URL = "https://app.digitelio.com";
const PENDING_WINDOW_HOURS = 72;
const UNDELIVERED_WINDOW_HOURS = 168;
const MAX_PENDING_CHECKS = 15;

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

/* ===== Livraison d'un produit : lève une erreur si l'email n'est pas parti ===== */
async function deliverProduct(env, sale, link) {
  if (link.product_type !== "formation") {
    console.log("Livraison ignorée (pas une formation)", sale.id, link.product_type);
    return;
  }

  const formation = await env.DB.prepare("SELECT id, title FROM formations WHERE id = ?")
    .bind(link.product_id)
    .first();
  if (!formation) throw new Error("Formation introuvable " + link.product_id);

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

  const result = await sendEmail(env, {
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

  if (!result?.ok) {
    // Nettoie l'inscription créée pour éviter les doublons au prochain essai
    await env.DB.prepare("DELETE FROM enrollments WHERE id = ?").bind(enrollmentId).run();
    throw new Error("Email non envoyé: " + (result?.error || "erreur inconnue"));
  }
  console.log("Livraison: email envoyé", sale.id, sale.buyer_email);
}

/* ===== Livre l'accès UNE seule fois (delivered_at sert de verrou) ===== */
async function ensureDelivered(env, s) {
  const claim = await env.DB.prepare(
    "UPDATE sales SET delivered_at = datetime('now') WHERE id = ? AND delivered_at IS NULL"
  )
    .bind(s.id)
    .run();
  if (!claim.meta?.changes) return false; // déjà livré ou en cours

  try {
    const link = await env.DB.prepare(
      "SELECT product_type, product_id FROM product_links WHERE id = ?"
    )
      .bind(s.product_link_id)
      .first();
    if (!link) throw new Error("Lien produit introuvable " + s.product_link_id);
    await deliverProduct(env, s, link);
    return true;
  } catch (err) {
    console.error("Échec de la livraison automatique", s.id, err.message);
    // Libère le verrou : la livraison sera retentée au prochain webhook
    await env.DB.prepare("UPDATE sales SET delivered_at = NULL WHERE id = ?").bind(s.id).run();
    return false;
  }
}

/* ===== Vérification d'une vente + crédit du wallet + livraison ===== */
async function checkSalePayment(env, s, knownTxId = null, webhookPay = null) {
  // Vente déjà payée : on ne fait que rattraper la livraison si besoin
  if (s.status === "PAID") {
    if (!s.delivered_at) await ensureDelivered(env, s);
    return "PAID";
  }

  let txId = knownTxId;
  let pay = webhookPay;

  if (!pay) {
    if (!txId) {
      const sRes = await saspay(env, "GET", `/checkout-sessions/${s.session_id}`);
      const sBody = await sRes.json().catch(() => null);
      const session = sBody?.data ?? sBody;
      if (!sRes.ok || !session) {
        console.error("Session SasPay illisible", s.id, sRes.status);
        return s.status;
      }
      if (session.status === "EXPIRED") {
        try {
          await env.DB.prepare("UPDATE sales SET status = 'EXPIRED' WHERE id = ? AND status = 'PENDING'")
            .bind(s.id)
            .run();
        } catch (e) {
          console.error("Marquage EXPIRED impossible", s.id, e.message);
        }
        return "EXPIRED";
      }
      const tx = session.transaction ?? session.transaction_id ?? session.payment ?? session.payment_id;
      txId = typeof tx === "string" ? tx : tx?.id;
      if (!txId) return "PENDING";
    }

    for (const path of [`/payments/${txId}`, `/transactions/${txId}`]) {
      const pRes = await saspay(env, "GET", path);
      const pBody = await pRes.json().catch(() => null);
      if (pRes.ok && (pBody?.data ?? pBody)) {
        pay = pBody?.data ?? pBody;
        break;
      }
      console.error("Paiement SasPay illisible", s.id, path, pRes.status);
    }
    if (!pay) return "PENDING";
  }

  txId = txId || pay.id;
  if (pay.status !== "SUCCESS") {
    console.log("Paiement pas encore SUCCESS", s.id, pay.status);
    return "PENDING";
  }

  // Le montant débité (520) inclut les frais ADD_ON ; on compare au montant demandé / net (500)
  const expected = Number(s.amount_xof);
  const candidates = [pay.requested_amount, pay.amount, pay.net_amount]
    .filter((v) => v !== undefined && v !== null)
    .map(Number);

  if (pay.currency !== "XOF" || !candidates.includes(expected)) {
    console.error("Vente SasPay incohérente", s.id, pay.currency, JSON.stringify(candidates), expected);
    await env.DB.prepare("UPDATE sales SET status = 'REVIEW' WHERE id = ? AND status = 'PENDING'")
      .bind(s.id)
      .run();
    return "REVIEW";
  }

  // Verrou anti-doublon : une seule exécution passe (PENDING / REVIEW / EXPIRED -> PAID)
  const claim = await env.DB.prepare(
    `UPDATE sales SET status = 'PAID', transaction_id = ?, paid_at = datetime('now')
     WHERE id = ? AND status IN ('PENDING', 'REVIEW', 'EXPIRED')`
  )
    .bind(txId, s.id)
    .run();

  if (!claim.meta?.changes) {
    const row = await env.DB.prepare("SELECT status FROM sales WHERE id = ?").bind(s.id).first();
    console.log("Verrou: vente non modifiée, statut actuel =", row?.status, s.id);
    return row?.status || "PENDING";
  }

  console.log("Vente passée à PAID", s.id, txId);

  await env.DB.prepare(
    `INSERT INTO wallets (user_id, balance_xof) VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET balance_xof = balance_xof + ?, updated_at = datetime('now')`
  )
    .bind(s.seller_id, s.net_xof, s.net_xof)
    .run();
  console.log("Wallet crédité", s.seller_id, s.net_xof);

  await ensureDelivered(env, s);
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
  } else if (status === "PAID" && !sale.delivered_at) {
    await ensureDelivered(env, sale);
  }

  return json({ status, paid: status === "PAID" });
}

/* ===== Webhook SasPay (transaction.success) : utilise metadata.sale_id et les données signées ===== */
export async function handleSaspayProductWebhook(env, payload) {
  const data = payload?.data ?? payload;
  const saleId = data?.metadata?.sale_id;
  const txId = data?.id;
  if (!saleId) {
    console.log("Webhook produit ignoré: pas de sale_id");
    return false;
  }

  const sale = await env.DB.prepare("SELECT * FROM sales WHERE id = ?").bind(saleId).first();
  if (!sale) {
    console.error("Webhook: vente introuvable", saleId);
    return false;
  }
  console.log("Webhook: statut actuel de la vente", saleId, sale.status, "livrée:", sale.delivered_at);

  const status = await checkSalePayment(env, sale, txId || null, data);
  console.log("Webhook: résultat", saleId, status);
  return status === "PAID";
}

/* ===== Réconcilie les ventes en attente/revue + rattrape les livraisons manquantes ===== */
export async function reconcilePendingSales(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM sales
     WHERE session_id IS NOT NULL AND (
       (status IN ('PENDING', 'REVIEW') AND created_at > datetime('now', ?))
       OR (status = 'PAID' AND delivered_at IS NULL AND created_at > datetime('now', ?))
     )
     ORDER BY created_at DESC LIMIT ?`
  )
    .bind(`-${PENDING_WINDOW_HOURS} hours`, `-${UNDELIVERED_WINDOW_HOURS} hours`, MAX_PENDING_CHECKS)
    .all();

  console.log("Réconciliation: ventes à vérifier", results.length);

  const outcomes = await Promise.allSettled(results.map((s) => checkSalePayment(env, s)));
  outcomes.forEach((o, i) => {
    if (o.status === "rejected") {
      console.error("Réconciliation en échec", results[i].id, o.reason?.message || o.reason);
    }
  });
    }
