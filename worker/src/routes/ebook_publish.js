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

/* Taux approximatifs vers le XOF. Doit rester identique à worker/src/routes/publish.js.
   À CORRIGER PÉRIODIQUEMENT à la main. */
const RATES_TO_XOF = {
  XOF: 1, XAF: 1, EUR: 655.957, USD: 605, GBP: 765, CAD: 440, CHF: 690,
  MAD: 60, DZD: 4.5, TND: 195, NGN: 0.39, GHS: 40, KES: 4.7, ZAR: 34,
  GNF: 0.07, CDF: 0.22,
};

function toXof(amount, currency) {
  const rate = RATES_TO_XOF[currency];
  if (!rate) return null;
  return Math.round(amount * rate);
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

/* Crée ou met à jour le lien de paiement SasPay (/pay/:code), prix converti en XOF.
   Ne lève jamais d'erreur : retourne { pay_code, error } */
async function syncPayLink(env, userId, ebookId, price, currency) {
  const priceXof = toXof(price, currency);
  if (priceXof === null) {
    console.error("Monnaie sans taux de conversion", ebookId, currency);
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
      "SELECT id, pay_code FROM product_links WHERE product_type = 'ebook' AND product_id = ? LIMIT 1"
    )
      .bind(ebookId)
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
       VALUES (?, ?, 'ebook', ?, ?, ?, 1)`
    )
      .bind(crypto.randomUUID(), userId, ebookId, priceXof, payCode)
      .run();
    return { pay_code: payCode, error: null };
  } catch (err) {
    console.error("Création du lien de paiement impossible", ebookId, err.message);
    return { pay_code: null, error: "Impossible de créer le lien de paiement." };
  }
}

async function getPayCode(env, ebookId) {
  try {
    const row = await env.DB.prepare(
      "SELECT pay_code FROM product_links WHERE product_type = 'ebook' AND product_id = ? AND active = 1 LIMIT 1"
    )
      .bind(ebookId)
      .first();
    return row?.pay_code || "";
  } catch {
    return "";
  }
}

/* Réglages : prix, monnaie, couverture */
export async function handleUpdateEbookSettings(request, env, ebookId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const owned = await env.DB.prepare(
    "SELECT id, currency, price, status FROM ebooks WHERE id = ? AND user_id = ?"
  )
    .bind(ebookId, payload.sub)
    .first();
  if (!owned) {
    return Response.json({ error: "eBook introuvable." }, { status: 404 });
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

  await env.DB.prepare(
    `UPDATE ebooks SET price = ?, cover_url = ?, currency = COALESCE(?, currency) WHERE id = ? AND user_id = ?`
  )
    .bind(price, cover, currency, ebookId, payload.sub)
    .run();

  const finalCurrency = currency || owned.currency || "EUR";
  const finalPrice = price !== null ? price : owned.price;

  let payCode = await getPayCode(env, ebookId);
  let payError = null;
  if (owned.status === "published" && finalPrice !== null && finalPrice !== undefined) {
    const sync = await syncPayLink(env, payload.sub, ebookId, finalPrice, finalCurrency);
    if (sync.pay_code) payCode = sync.pay_code;
    payError = sync.error;
  }

  return Response.json({
    ebook: {
      id: ebookId,
      price,
      currency: finalCurrency,
      cover_url: cover,
      pay_code: payCode,
    },
    payment_warning: payError,
  });
}

/* Publier */
export async function handlePublishEbook(request, env, ebookId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const ebook = await env.DB.prepare(
    "SELECT id, price, currency, content FROM ebooks WHERE id = ? AND user_id = ?"
  )
    .bind(ebookId, payload.sub)
    .first();
  if (!ebook) {
    return Response.json({ error: "eBook introuvable." }, { status: 404 });
  }

  if (ebook.price === null || ebook.price === undefined) {
    return Response.json({ error: "Définissez un prix avant de publier." }, { status: 400 });
  }
  if (!(ebook.content || "").trim()) {
    return Response.json({ error: "L'eBook est vide, rien à publier." }, { status: 400 });
  }

  const currency = ebook.currency || "EUR";

  const sync = await syncPayLink(env, payload.sub, ebookId, ebook.price, currency);
  if (!sync.pay_code) {
    return Response.json({ error: sync.error || "Impossible de créer le lien de paiement." }, { status: 400 });
  }

  await env.DB.prepare(
    "UPDATE ebooks SET status = 'published', published_at = datetime('now') WHERE id = ? AND user_id = ?"
  )
    .bind(ebookId, payload.sub)
    .run();

  return Response.json({ ebook: { id: ebookId, status: "published", pay_code: sync.pay_code } });
}

/* Repasser en brouillon : coupe le lien de paiement (les ventes déjà payées ne sont pas affectées) */
export async function handleUnpublishEbook(request, env, ebookId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const ebook = await env.DB.prepare(
    "SELECT id FROM ebooks WHERE id = ? AND user_id = ?"
  )
    .bind(ebookId, payload.sub)
    .first();
  if (!ebook) {
    return Response.json({ error: "eBook introuvable." }, { status: 404 });
  }

  await env.DB.prepare(
    "UPDATE ebooks SET status = 'draft', published_at = NULL WHERE id = ? AND user_id = ?"
  )
    .bind(ebookId, payload.sub)
    .run();

  try {
    await env.DB.prepare(
      "UPDATE product_links SET active = 0 WHERE product_type = 'ebook' AND product_id = ?"
    )
      .bind(ebookId)
      .run();
  } catch (err) {
    console.error("Désactivation du lien de paiement impossible", ebookId, err.message);
  }

  return Response.json({ ebook: { id: ebookId, status: "draft" } });
}

/* ===== PAGE PUBLIQUE (sans connexion) : uniquement les eBooks publiés ===== */
export async function handleGetPublicEbook(request, env, ebookId) {
  const b = await env.DB.prepare(
    `SELECT e.id, e.title, e.description, e.price, e.currency, e.cover_url, e.language,
            u.full_name AS author,
            (SELECT pl.pay_code FROM product_links pl
              WHERE pl.product_type = 'ebook' AND pl.product_id = e.id AND pl.active = 1
              LIMIT 1) AS pay_code
     FROM ebooks e
     LEFT JOIN users u ON u.id = e.user_id
     WHERE e.id = ? AND e.status = 'published'`
  )
    .bind(ebookId)
    .first();

  if (!b) {
    return Response.json({ error: "eBook introuvable ou non publié." }, { status: 404 });
  }

  return Response.json({
    ebook: {
      id: b.id,
      title: b.title,
      description: b.description || "",
      price: b.price,
      currency: b.currency || "EUR",
      cover_url: b.cover_url || "",
      pay_code: b.pay_code || "",
      author: b.author || "",
    },
  });
    }
