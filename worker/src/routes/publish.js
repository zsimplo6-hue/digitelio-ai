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
const MIN_PRICE_XOF = 200; // minimum accepté par SasPay

/* Taux approximatifs vers le XOF (1 unité de la monnaie = X XOF).
   À CORRIGER PÉRIODIQUEMENT à la main. XOF et XAF sont fixes par nature (parité CFA / EUR). */
const RATES_TO_XOF = {
  XOF: 1,
  XAF: 1,
  EUR: 655.957,
  USD: 605,
  GBP: 765,
  CAD: 440,
  CHF: 690,
  MAD: 60,
  DZD: 4.5,
  TND: 195,
  NGN: 0.39,
  GHS: 40,
  KES: 4.7,
  ZAR: 34,
  GNF: 0.07,
  CDF: 0.22,
};

function toXof(amount, currency) {
  const rate = RATES_TO_XOF[currency];
  if (!rate) return null;
  return Math.round(amount * rate);
}

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

function newPayCode() {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* Crée ou met à jour le lien de paiement SasPay (/pay/:code), avec le prix converti en XOF.
   Ne lève jamais d'erreur : retourne { pay_code, error } */
async function syncPayLink(env, userId, formationId, price, currency) {
  const priceXof = toXof(price, currency);
  if (priceXof === null) {
    console.error("Monnaie sans taux de conversion", formationId, currency);
    return { pay_code: null, error: "Monnaie non prise en charge pour le paiement." };
  }
  if (priceXof < MIN_PRICE_XOF) {
    return {
      pay_code: null,
      error: `Le prix doit valoir au moins l'équivalent de ${MIN_PRICE_XOF} FCFA.`,
    };
  }

  try {
    const existing = await env.DB.prepare(
      "SELECT id, pay_code FROM product_links WHERE product_type = 'formation' AND product_id = ? LIMIT 1"
    )
      .bind(formationId)
      .first();

    if (existing) {
      await env.DB.prepare("UPDATE product_links SET price_xof = ?, active = 1 WHERE id = ?")
        .bind(priceXof, existing.id)
        .run();
      return { pay_code: existing.pay_code, error: null };
    }

    const payCode = newPayCode();
    await env.DB.prepare(
      `INSERT INTO product_links (id, user_id, product_type, product_id, price_xof, pay_code, active)
       VALUES (?, ?, 'formation', ?, ?, ?, 1)`
    )
      .bind(crypto.randomUUID(), userId, formationId, priceXof, payCode)
      .run();
    return { pay_code: payCode, error: null };
  } catch (err) {
    console.error("Création du lien de paiement impossible", formationId, err.message);
    return { pay_code: null, error: "Impossible de créer le lien de paiement." };
  }
}

async function getPayCode(env, formationId) {
  try {
    const row = await env.DB.prepare(
      "SELECT pay_code FROM product_links WHERE product_type = 'formation' AND product_id = ? AND active = 1 LIMIT 1"
    )
      .bind(formationId)
      .first();
    return row?.pay_code || "";
  } catch {
    return "";
  }
}

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
            certificate, published_at, created_at
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

  const payCode = await getPayCode(env, formationId);

  return Response.json({
    formation: {
      ...formation,
      currency: formation.currency || "EUR",
      certificate: !!formation.certificate,
      pay_code: payCode,
      modules,
    },
  });
}

/* Réglages : prix, monnaie, couverture, certificat */
export async function handleUpdateSettings(request, env, formationId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const owned = await env.DB.prepare(
    "SELECT id, currency, price, status FROM formations WHERE id = ? AND user_id = ?"
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

  const certificate = body.certificate ? 1 : 0;

  await env.DB.prepare(
    `UPDATE formations
     SET price = ?, cover_url = ?, certificate = ?, currency = COALESCE(?, currency)
     WHERE id = ? AND user_id = ?`
  )
    .bind(price, cover, certificate, currency, formationId, payload.sub)
    .run();

  const finalCurrency = currency || owned.currency || "EUR";
  const finalPrice = price !== null ? price : owned.price;

  // Formation déjà en vente : garde le lien de paiement synchronisé
  let payCode = await getPayCode(env, formationId);
  let payError = null;
  if (owned.status === "published" && finalPrice !== null && finalPrice !== undefined) {
    const sync = await syncPayLink(env, payload.sub, formationId, finalPrice, finalCurrency);
    if (sync.pay_code) payCode = sync.pay_code;
    payError = sync.error;
  }

  return Response.json({
    formation: {
      id: formationId,
      price,
      currency: finalCurrency,
      cover_url: cover,
      certificate: !!certificate,
      pay_code: payCode,
    },
    payment_warning: payError, // informatif seulement : les réglages sont quand même enregistrés
  });
}

/* Publier */
export async function handlePublish(request, env, formationId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const formation = await env.DB.prepare(
    "SELECT id, price, currency FROM formations WHERE id = ? AND user_id = ?"
  )
    .bind(formationId, payload.sub)
    .first();
  if (!formation) {
    return Response.json({ error: "Formation introuvable." }, { status: 404 });
  }

  if (formation.price === null || formation.price === undefined) {
    return Response.json({ error: "Définissez un prix avant de publier." }, { status: 400 });
  }

  const currency = formation.currency || "EUR";

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

  const sync = await syncPayLink(env, payload.sub, formationId, formation.price, currency);
  if (!sync.pay_code) {
    return Response.json({ error: sync.error || "Impossible de créer le lien de paiement." }, { status: 400 });
  }

  await env.DB.prepare(
    "UPDATE formations SET status = 'published', published_at = datetime('now') WHERE id = ? AND user_id = ?"
  )
    .bind(formationId, payload.sub)
    .run();

  return Response.json({ formation: { id: formationId, status: "published", pay_code: sync.pay_code } });
}

/* Repasser en brouillon : coupe le lien de paiement (les ventes déjà payées ne sont pas affectées) */
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

  try {
    await env.DB.prepare(
      "UPDATE product_links SET active = 0 WHERE product_type = 'formation' AND product_id = ?"
    )
      .bind(formationId)
      .run();
  } catch (err) {
    console.error("Désactivation du lien de paiement impossible", formationId, err.message);
  }

  return Response.json({ formation: { id: formationId, status: "draft" } });
}

/* ===== PAGE PUBLIQUE (sans connexion) : uniquement les formations publiées ===== */
export async function handleGetPublicFormation(request, env, formationId) {
  const f = await env.DB.prepare(
    `SELECT f.id, f.title, f.description, f.price, f.currency, f.cover_url, f.certificate,
            f.language, u.full_name AS instructor,
            (SELECT pl.pay_code FROM product_links pl
              WHERE pl.product_type = 'formation' AND pl.product_id = f.id AND pl.active = 1
              LIMIT 1) AS pay_code
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
    .first();

  const modulesRes = await env.DB.prepare(
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
      pay_code: f.pay_code || "",
      instructor: f.instructor || "",
      modules: modulesRes.results,
    },
  });
      }
