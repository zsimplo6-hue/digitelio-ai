import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";

async function getAuthenticatedUser(request, env) {
  const cookies = parseCookies(request);
  const token = cookies["digitelio_session"];
  if (!token) return null;
  return await verifyJWT(token, env.JWT_SECRET);
}

const unauthorized = () => Response.json({ error: "Non authentifié." }, { status: 401 });

const MIN_WITHDRAWAL_XOF = 1000;

/* ===== GET /api/wallet — solde + historique des ventes ===== */
export async function handleGetWallet(request, env) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  await env.DB.prepare(`INSERT OR IGNORE INTO wallets (user_id) VALUES (?)`).bind(payload.sub).run();

  const wallet = await env.DB.prepare(
    "SELECT balance_xof, pending_xof, total_withdrawn_xof FROM wallets WHERE user_id = ?"
  )
    .bind(payload.sub)
    .first();

  const { results: sales } = await env.DB.prepare(
    `SELECT s.id, s.buyer_name, s.buyer_email, s.amount_xof, s.fee_xof, s.net_xof, s.status, s.paid_at, s.created_at,
            pl.product_type, pl.product_id
     FROM sales s
     JOIN product_links pl ON pl.id = s.product_link_id
     WHERE s.seller_id = ?
     ORDER BY s.created_at DESC
     LIMIT 50`
  )
    .bind(payload.sub)
    .all();

  const productTitles = {};
  for (const s of sales) {
    const key = `${s.product_type}:${s.product_id}`;
    if (productTitles[key] !== undefined) continue;
    if (s.product_type === "formation") {
      const f = await env.DB.prepare("SELECT title FROM formations WHERE id = ?").bind(s.product_id).first();
      productTitles[key] = f?.title || "Formation";
    } else {
      const b = await env.DB.prepare("SELECT title FROM ebooks WHERE id = ?").bind(s.product_id).first();
      productTitles[key] = b?.title || "eBook";
    }
  }

  const { results: withdrawals } = await env.DB.prepare(
    `SELECT id, amount_xof, method, status, created_at, processed_at
     FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`
  )
    .bind(payload.sub)
    .all();

  return Response.json({
    wallet: {
      balance_xof: wallet?.balance_xof || 0,
      pending_xof: wallet?.pending_xof || 0,
      total_withdrawn_xof: wallet?.total_withdrawn_xof || 0,
    },
    sales: sales.map((s) => ({
      id: s.id,
      product_title: productTitles[`${s.product_type}:${s.product_id}`] || "Produit",
      buyer_name: s.buyer_name,
      buyer_email: s.buyer_email,
      amount_xof: s.amount_xof,
      fee_xof: s.fee_xof,
      net_xof: s.net_xof,
      status: s.status,
      paid_at: s.paid_at,
      created_at: s.created_at,
    })),
    withdrawals,
    min_withdrawal_xof: MIN_WITHDRAWAL_XOF,
  });
}

/* ===== POST /api/wallet/withdraw  { amount_xof, method, phone } ===== */
export async function handleRequestWithdrawal(request, env) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const wallet = await env.DB.prepare("SELECT balance_xof FROM wallets WHERE user_id = ?")
    .bind(payload.sub)
    .first();
  const available = wallet?.balance_xof || 0;

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Corps de requête invalide." }, { status: 400 });

  const amount = Math.round(Number(body.amount_xof));
  const method = String(body.method || "mobile_money").slice(0, 30);
  const phone = String(body.phone || "").trim().slice(0, 30);

  if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL_XOF) {
    return Response.json(
      { error: `Le retrait minimum est de ${MIN_WITHDRAWAL_XOF.toLocaleString("fr-FR")} FCFA.` },
      { status: 400 }
    );
  }
  if (amount > available) {
    return Response.json({ error: "Montant supérieur à votre solde disponible." }, { status: 400 });
  }
  if (!phone) {
    return Response.json({ error: "Numéro de téléphone requis pour le retrait." }, { status: 400 });
  }

  const withdrawalId = crypto.randomUUID();

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO withdrawals (id, user_id, amount_xof, method, status)
       VALUES (?, ?, ?, ?, 'REQUESTED')`
    ).bind(withdrawalId, payload.sub, amount, `${method} (${phone})`),
    env.DB.prepare(
      `UPDATE wallets SET balance_xof = balance_xof - ?, pending_xof = pending_xof + ?, updated_at = datetime('now')
       WHERE user_id = ?`
    ).bind(amount, amount, payload.sub),
  ]);

  return Response.json({
    withdrawal: { id: withdrawalId, amount_xof: amount, status: "REQUESTED" },
  });
}
