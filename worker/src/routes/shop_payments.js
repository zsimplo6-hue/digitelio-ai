import { getActiveCommission } from "./billing.js";

const SASPAY_BASE = "https://api.saspay.me/api/v1";
const DEFAULT_APP_URL = "https://app.digitelio.com";
const PENDING_WINDOW_HOURS = 48;
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

  const recent = await env.DB.prepare(
    `SELECT id, session_id FROM sales
     WHERE product_link_id = ? AND buyer_email = ? AND status = 'PENDING'
       AND created_at > datetime('now', ?)
     ORDER BY created_at DESC LIMIT 1`
  )
    .bind(link.id, buyerEmail, `-${REUSE_MINUTES} minutes`)
    .first();

  const commissionPct = await getActiveCommission(env, link.user_id);
  const feeXof = Math.round(link.price_xof * commissionPct);
  const netXof = link.price_xof - feeXof;

  const saleId = crypto.randomUUID();
  const appUrl = String(env.APP_URL || DEFAULT_APP_URL).replace(/\/$/, "");

  const res = await saspay(env, "POST", "/checkout-sessions", {
    amount: link.price_xof.toFixed(2),
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
    .bind(saleId, link.user_id, link.id, buyerEmail, buyerName, link.price_xof, commissionPct, feeXof, netXof, data.id)
    .run();

  return json({ checkout_url: data.checkout_url, sale_id: saleId });
}

/* ===== Vérification d'une vente auprès de SasPay + crédit du wallet ===== */
async function checkSalePayment(env, s) {
  const sRes = await saspay(env, "GET", `/checkout-sessions/${s.session_id}`);
  const sBody = await sRes.json().catch(() => null);
  const session = sBody?.data ?? sBody;
  if (!sRes.ok || !session) return s.status;

  const tx = session.transaction;
  const txId = typeof tx === "string" ? tx : tx?.id;
  if (!txId) return "PENDING";

  const pRes = await saspay(env, "GET", `/payments/${txId}`);
  const pBody = await pRes.json().catch(() => null);
  const pay = pBody?.data ?? pBody;
  if (!pRes.ok || !pay) return "PENDING";
  if (pay.status !== "SUCCESS") return "PENDING";

  const paidAmount = Number(pay.requested_amount ?? pay.amount);
  if (pay.currency !== "XOF" || paidAmount !== Number(s.amount_xof)) {
    console.error("Vente SasPay incohérente", s.id, pay.currency, paidAmount, s.amount_xof);
    await env.DB.prepare("UPDATE sales SET status = 'REVIEW' WHERE id = ? AND status = 'PENDING'")
      .bind(s.id)
      .run();
    return "REVIEW";
  }

  const claim = await env.DB.prepare(
    `UPDATE sales SET status = 'PAID', transaction_id = ?, paid_at = datetime('now')
     WHERE id = ? AND status = 'PENDING'`
  )
    .bind(txId, s.id)
    .run();

  if (!claim.meta?.changes) {
    const row = await env.DB.prepare("SELECT status FROM sales WHERE id = ?").bind(s.id).first();
    return row?.status || "PENDING";
  }

  await env.DB.prepare(
    `INSERT INTO wallets (user_id, balance_xof) VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET balance_xof = balance_xof + ?, updated_at = datetime('now')`
  )
    .bind(s.seller_id, s.net_xof, s.net_xof)
    .run();

  return "PAID";
}

/* ===== GET /api/pay/verify?ref=<sale_id> : appelé au retour du client ===== */
export async function handleVerifyProductPayment(request, env) {
  const ref = new URL(request.url).searchParams.get("ref") || "";
  const sale = await env.DB.prepare("SELECT * FROM sales WHERE id = ?").bind(ref).first();
  if (!sale) return json({ error: "Paiement introuvable." }, 404);

  let status = sale.status;
  if (status === "PENDING" && sale.session_id) status = await checkSalePayment(env, sale);

  return json({ status, paid: status === "PAID" });
}

/* ===== Appelé par le webhook SasPay pour réconcilier les ventes en attente ===== */
export async function reconcilePendingSales(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM sales
     WHERE status = 'PENDING' AND session_id IS NOT NULL AND created_at > datetime('now', ?)
     ORDER BY created_at DESC LIMIT ?`
  )
    .bind(`-${PENDING_WINDOW_HOURS} hours`, MAX_PENDING_CHECKS)
    .all();

  const outcomes = await Promise.allSettled(results.map((s) => checkSalePayment(env, s)));
  if (outcomes.some((o) => o.status === "rejected")) {
    throw new Error("Vérification de vente incomplète.");
  }
    }
