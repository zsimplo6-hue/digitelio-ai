import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";

async function getAuthenticatedUser(request, env) {
  const cookies = parseCookies(request);
  const token = cookies["digitelio_session"];
  if (!token) return null;
  return await verifyJWT(token, env.JWT_SECRET);
}

const unauthorized = () => Response.json({ error: "Non authentifié." }, { status: 401 });

/* Doit rester identique à la liste du frontend (utils/currency.js) */
const CURRENCIES = [
  "EUR", "USD", "XOF", "XAF", "GBP", "CAD", "CHF", "MAD",
  "DZD", "TND", "NGN", "GHS", "KES", "ZAR", "GNF", "CDF",
];
const MAX_PRICE = 100000000;

function parseResources(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function isValidCover(s) {
  if (typeof s !== "string") return false;
  const okData =
    s.startsWith("data:image/jpeg;base64,") ||
    s.startsWith("data:image/png;base64,") ||
    s.startsWith("data:image/webp;base64,");
  if (okData) return s.length <= 900000;
  return /^https:\/\/\S+$/i.test(s) && s.length <= 500;
}

const isHttpsUrl = (s) => /^https:\/\/\S+$/i.test(s) && s.length <= 500;

/* Liste (avec le prix et la monnaie) */
export async function handleListFormations(request, env) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const { results } = await env.DB.prepare(
    `SELECT f.id, f.title, f.description, f.status, f.price, f.currency, f.created_at,
            (SELECT COUNT(*) FROM formation_modules m WHERE m.formation_id = f.id) AS modules_count
     FROM formations f
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC`
  )
    .bind(payload.sub)
    .all();

  return Response.json({ formations: results });
}

/* Lecture d'une formation */
export async function handleGetFormation(request, env, formationId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const formation = await env.DB.prepare(
    `SELECT id, title, description, topic, language, status, price, currency, cover_url,
            certificate, payment_url, published_at, created_at
     FROM formations WHERE id = ? AND user_id = ?`
  )
    .bind(formationId, payload.sub)
    .first();

  if (!formation) {
    return Response.json({ error: "Formation introuvable." }, { status: 404 });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, position, title, summary, content, video_url, resources
     FROM formation_modules WHERE formation_id = ? ORDER BY position ASC`
  )
    .bind(formationId)
    .all();

  const modules = results.map((m) => ({
    ...m,
    content: m.content || "",
    video_url: m.video_url || "",
    resources: parseResources(m.resources),
  }));

  return Response.json({
    formation: {
      ...formation,
      currency: formation.currency || "EUR",
      certificate: !!formation.certificate,
      modules,
    },
  });
}

/* Réglages : prix, monnaie, couverture, certificat, lien de paiement */
export async function handleUpdateSettings(request, env, formationId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const owned = await env.DB.prepare(
    "SELECT id, currency FROM formations WHERE id = ? AND user_id = ?"
  )
    .bind(formationId, payload.sub)
    .first();
  if (!owned) {
    return Response.json({ error: "Formation introuvable." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  let price = null;
  if (body.price !== null && body.price !== undefined && body.price !== "") {
    price = Number(body.price);
    if (!Number.isInteger(price) || price < 0 || price > MAX_PRICE) {
      return Response.json(
        { error: "Le prix doit être un nombre entier positif (maximum 100 000 000)." },
        { status: 400 }
      );
    }
  }

  let currency = null;
  if (body.currency) {
    currency = String(body.currency).toUpperCase();
    if (!CURRENCIES.includes(currency)) {
      return Response.json({ error: "Monnaie non prise en charge." }, { status: 400 });
    }
  }

  let cover = null;
  if (body.cover_url) {
    if (!isValidCover(body.cover_url)) {
      return Response.json(
        { error: "Image de couverture invalide ou trop lourde." },
        { status: 400 }
      );
    }
    cover = body.cover_url;
  }

  let paymentUrl = null;
  const rawPay = String(body.payment_url || "").trim();
  if (rawPay) {
    if (!isHttpsUrl(rawPay)) {
      return Response.json(
        { error: "Le lien de paiement doit commencer par https://" },
        { status: 400 }
      );
    }
    paymentUrl = rawPay;
  }

  const certificate = body.certificate ? 1 : 0;

  await env.DB.prepare(
    `UPDATE formations
     SET price = ?, cover_url = ?, certificate = ?, payment_url = ?, currency = COALESCE(?, currency)
     WHERE id = ? AND user_id = ?`
  )
    .bind(price, cover, certificate, paymentUrl, currency, formationId, payload.sub)
    .run();

  return Response.json({
    formation: {
      id: formationId,
      price,
      currency: currency || owned.currency || "EUR",
      cover_url: cover,
      certificate: !!certificate,
      payment_url: paymentUrl,
    },
  });
}

/* Publier */
export async function handlePublish(request, env, formationId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const formation = await env.DB.prepare(
    "SELECT id, price FROM formations WHERE id = ? AND user_id = ?"
  )
    .bind(formationId, payload.sub)
    .first();
  if (!formation) {
    return Response.json({ error: "Formation introuvable." }, { status: 404 });
  }

  if (formation.price === null || formation.price === undefined) {
    return Response.json({ error: "Définissez un prix avant de publier." }, { status: 400 });
  }

  const { results } = await env.DB.prepare(
    "SELECT content FROM formation_modules WHERE formation_id = ?"
  )
    .bind(formationId)
    .all();

  const missing = results.filter((m) => !(m.content || "").trim()).length;
  if (results.length === 0 || missing > 0) {
    return Response.json(
      { error: `Il reste ${missing} leçon(s) à rédiger avant de publier.` },
      { status: 400 }
    );
  }

  await env.DB.prepare(
    "UPDATE formations SET status = 'published', published_at = datetime('now') WHERE id = ? AND user_id = ?"
  )
    .bind(formationId, payload.sub)
    .run();

  return Response.json({ formation: { id: formationId, status: "published" } });
}

/* Repasser en brouillon */
export async function handleUnpublish(request, env, formationId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const formation = await env.DB.prepare(
    "SELECT id FROM formations WHERE id = ? AND user_id = ?"
  )
    .bind(formationId, payload.sub)
    .first();
  if (!formation) {
    return Response.json({ error: "Formation introuvable." }, { status: 404 });
  }

  await env.DB.prepare(
    "UPDATE formations SET status = 'draft', published_at = NULL WHERE id = ? AND user_id = ?"
  )
    .bind(formationId, payload.sub)
    .run();

  return Response.json({ formation: { id: formationId, status: "draft" } });
}

/* ===== PAGE PUBLIQUE (sans connexion) : uniquement les formations publiées ===== */
export async function handleGetPublicFormation(request, env, formationId) {
  const f = await env.DB.prepare(
    `SELECT f.id, f.title, f.description, f.price, f.currency, f.cover_url, f.certificate,
            f.payment_url, f.language, u.full_name AS instructor
     FROM formations f
     LEFT JOIN users u ON u.id = f.user_id
     WHERE f.id = ? AND f.status = 'published'`
  )
    .bind(formationId)
    .first();

  if (!f) {
    return Response.json({ error: "Formation introuvable ou non publiée." }, { status: 404 });
  }

  const { results } = await env.DB.prepare(
    `SELECT position, title, summary
     FROM formation_modules WHERE formation_id = ? ORDER BY position ASC`
  )
    .bind(formationId)
    .all();

  return Response.json({
    formation: {
      id: f.id,
      title: f.title,
      description: f.description || "",
      price: f.price,
      currency: f.currency || "EUR",
      cover_url: f.cover_url || "",
      certificate: !!f.certificate,
      payment_url: f.payment_url || "",
      instructor: f.instructor || "",
      modules: results,
    },
  });
}
