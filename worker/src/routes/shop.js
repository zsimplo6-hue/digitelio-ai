import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";

async function getAuthenticatedUser(request, env) {
  const cookies = parseCookies(request);
  const token = cookies["digitelio_session"];
  if (!token) return null;
  return await verifyJWT(token, env.JWT_SECRET);
}

const unauthorized = () => Response.json({ error: "Non authentifié." }, { status: 401 });

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "produit";
}

async function ensureUniqueSlug(env, base) {
  let slug = base;
  for (let i = 0; i < 6; i++) {
    const existing = await env.DB.prepare("SELECT id FROM shops WHERE slug = ?").bind(slug).first();
    if (!existing) return slug;
    slug = `${base}${Math.random().toString(36).slice(2, 5)}`;
  }
  return `${base}${Date.now().toString(36).slice(-4)}`;
}

function generatePayCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans caractères ambigus
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const SOCIAL_KEYS = ["instagram", "tiktok", "whatsapp", "facebook", "youtube", "linkedin"];
const HEX_COLOR = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;

function isValidImageOrUrl(s) {
  if (!s) return true;
  if (typeof s !== "string") return false;
  const okData =
    s.startsWith("data:image/jpeg;base64,") ||
    s.startsWith("data:image/png;base64,") ||
    s.startsWith("data:image/webp;base64,");
  if (okData) return s.length <= 900000;
  return /^https:\/\/\S+$/i.test(s) && s.length <= 500;
}

/* ===== GET /api/shop — boutique de l'utilisateur connecté (auto-créée) ===== */
export async function handleGetMyShop(request, env) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  let shop = await env.DB.prepare("SELECT * FROM shops WHERE user_id = ?").bind(payload.sub).first();

  if (!shop) {
    const user = await env.DB.prepare("SELECT full_name FROM users WHERE id = ?").bind(payload.sub).first();
    const baseSlug = slugify(user?.full_name || "createur");
    const slug = await ensureUniqueSlug(env, baseSlug);
    const shopId = crypto.randomUUID();

    await env.DB.batch([
      env.DB.prepare(`INSERT INTO shops (id, user_id, slug) VALUES (?, ?, ?)`).bind(shopId, payload.sub, slug),
      env.DB.prepare(`INSERT OR IGNORE INTO wallets (user_id) VALUES (?)`).bind(payload.sub),
    ]);

    shop = await env.DB.prepare("SELECT * FROM shops WHERE id = ?").bind(shopId).first();
  } else {
    await env.DB.prepare(`INSERT OR IGNORE INTO wallets (user_id) VALUES (?)`).bind(payload.sub).run();
  }

  const wallet = await env.DB.prepare(
    "SELECT balance_xof, pending_xof, total_withdrawn_xof FROM wallets WHERE user_id = ?"
  )
    .bind(payload.sub)
    .first();

  const salesStats = await env.DB.prepare(
    `SELECT COUNT(*) AS n, COALESCE(SUM(net_xof), 0) AS total, COUNT(DISTINCT buyer_email) AS clients
     FROM sales WHERE seller_id = ? AND status = 'PAID'`
  )
    .bind(payload.sub)
    .first();

  const formationsCount = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM formations WHERE user_id = ? AND status = 'published'"
  )
    .bind(payload.sub)
    .first();
  const ebooksCount = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM ebooks WHERE user_id = ? AND status = 'published'"
  )
    .bind(payload.sub)
    .first();

  let socials = {};
  try {
    socials = shop.socials_json ? JSON.parse(shop.socials_json) : {};
  } catch {
    socials = {};
  }

  return Response.json({
    shop: {
      slug: shop.slug,
      banner_url: shop.banner_url || "",
      logo_url: shop.logo_url || "",
      bio: shop.bio || "",
      accent_color: shop.accent_color || "#7C3AED",
      socials,
    },
    stats: {
      balance_xof: wallet?.balance_xof || 0,
      pending_xof: wallet?.pending_xof || 0,
      total_withdrawn_xof: wallet?.total_withdrawn_xof || 0,
      sales_count: salesStats?.n || 0,
      sales_total_xof: salesStats?.total || 0,
      clients_count: salesStats?.clients || 0,
      products_published: (formationsCount?.n || 0) + (ebooksCount?.n || 0),
    },
  });
}

/* ===== PUT /api/shop — personnalisation ===== */
export async function handleUpdateShop(request, env) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const shop = await env.DB.prepare("SELECT id FROM shops WHERE user_id = ?").bind(payload.sub).first();
  if (!shop) return Response.json({ error: "Boutique introuvable." }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Corps de requête invalide." }, { status: 400 });

  if (body.banner_url !== undefined && !isValidImageOrUrl(body.banner_url)) {
    return Response.json({ error: "Bannière invalide ou trop lourde." }, { status: 400 });
  }
  if (body.logo_url !== undefined && !isValidImageOrUrl(body.logo_url)) {
    return Response.json({ error: "Logo invalide ou trop lourd." }, { status: 400 });
  }

  const bio = typeof body.bio === "string" ? body.bio.slice(0, 500) : undefined;

  let accentColor;
  if (body.accent_color !== undefined) {
    if (!HEX_COLOR.test(String(body.accent_color))) {
      return Response.json({ error: "Couleur d'accent invalide." }, { status: 400 });
    }
    accentColor = body.accent_color;
  }

  let socialsJson;
  if (body.socials && typeof body.socials === "object") {
    const clean = {};
    for (const key of SOCIAL_KEYS) {
      if (body.socials[key]) clean[key] = String(body.socials[key]).slice(0, 200);
    }
    socialsJson = JSON.stringify(clean);
  }

  await env.DB.prepare(
    `UPDATE shops SET
       banner_url = COALESCE(?, banner_url),
       logo_url = COALESCE(?, logo_url),
       bio = COALESCE(?, bio),
       accent_color = COALESCE(?, accent_color),
       socials_json = COALESCE(?, socials_json),
       updated_at = datetime('now')
     WHERE user_id = ?`
  )
    .bind(
      body.banner_url !== undefined ? body.banner_url : null,
      body.logo_url !== undefined ? body.logo_url : null,
      bio !== undefined ? bio : null,
      accentColor !== undefined ? accentColor : null,
      socialsJson !== undefined ? socialsJson : null,
      payload.sub
    )
    .run();

  return Response.json({ success: true });
}

/* ===== GET /api/public/shop/:slug — boutique publique (sans connexion) ===== */
export async function handleGetPublicShop(request, env, slug) {
  const shop = await env.DB.prepare(
    `SELECT s.slug, s.banner_url, s.logo_url, s.bio, s.accent_color, s.socials_json,
            u.id AS user_id, u.full_name
     FROM shops s
     JOIN users u ON u.id = s.user_id
     WHERE s.slug = ?`
  )
    .bind(slug)
    .first();

  if (!shop) return Response.json({ error: "Boutique introuvable." }, { status: 404 });

  const { results: formations } = await env.DB.prepare(
    `SELECT id, title, description, price, currency, cover_url
     FROM formations WHERE user_id = ? AND status = 'published' ORDER BY created_at DESC`
  )
    .bind(shop.user_id)
    .all();

  const { results: ebooks } = await env.DB.prepare(
    `SELECT id, title, description
     FROM ebooks WHERE user_id = ? AND status = 'published' ORDER BY created_at DESC`
  )
    .bind(shop.user_id)
    .all();

  let socials = {};
  try {
    socials = shop.socials_json ? JSON.parse(shop.socials_json) : {};
  } catch {
    socials = {};
  }

  return Response.json({
    shop: {
      slug: shop.slug,
      full_name: shop.full_name,
      banner_url: shop.banner_url || "",
      logo_url: shop.logo_url || "",
      bio: shop.bio || "",
      accent_color: shop.accent_color || "#7C3AED",
      socials,
    },
    formations: formations.map((f) => ({ ...f, currency: f.currency || "EUR" })),
    ebooks,
  });
}

/* ===== GET /api/shop/products — liens produit + paiement (génération à la volée) ===== */
export async function handleListProductLinks(request, env) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const shop = await env.DB.prepare("SELECT slug FROM shops WHERE user_id = ?").bind(payload.sub).first();
  if (!shop) return Response.json({ error: "Boutique introuvable." }, { status: 404 });

  const appUrl = String(env.APP_URL || "https://app.digitelio.com").replace(/\/$/, "");

  const { results: formations } = await env.DB.prepare(
    `SELECT id, title, price, currency FROM formations WHERE user_id = ? AND status = 'published'`
  )
    .bind(payload.sub)
    .all();

  const products = [];

  for (const f of formations) {
    let link = await env.DB.prepare(
      "SELECT * FROM product_links WHERE user_id = ? AND product_type = 'formation' AND product_id = ?"
    )
      .bind(payload.sub, f.id)
      .first();

    if (!link) {
      const baseSlug = slugify(f.title);
      let productSlug = baseSlug;
      let attempt = 0;
      while (
        attempt < 5 &&
        (await env.DB.prepare(
          "SELECT id FROM product_links WHERE user_id = ? AND product_slug = ?"
        )
          .bind(payload.sub, productSlug)
          .first())
      ) {
        attempt++;
        productSlug = `${baseSlug}-${attempt}`;
      }

      const linkId = crypto.randomUUID();
      const payCode = generatePayCode();
      const priceXof = f.currency === "XOF" ? f.price : null;

      await env.DB.prepare(
        `INSERT INTO product_links (id, user_id, product_type, product_id, product_slug, pay_code, price_xof)
         VALUES (?, ?, 'formation', ?, ?, ?, ?)`
      )
        .bind(linkId, payload.sub, f.id, productSlug, payCode, priceXof || 0)
        .run();

      link = { id: linkId, product_slug: productSlug, pay_code: payCode };
    }

    products.push({
      type: "formation",
      id: f.id,
      title: f.title,
      price: f.price,
      currency: f.currency || "EUR",
      sellable: f.currency === "XOF",
      product_url: `${appUrl}/shop/${shop.slug}/${link.product_slug}`,
      pay_url: f.currency === "XOF" ? `${appUrl}/pay/${link.pay_code}` : null,
    });
  }

  const { results: ebooks } = await env.DB.prepare(
    `SELECT id, title FROM ebooks WHERE user_id = ? AND status = 'published'`
  )
    .bind(payload.sub)
    .all();

  for (const b of ebooks) {
    products.push({
      type: "ebook",
      id: b.id,
      title: b.title,
      price: null,
      currency: null,
      sellable: false,
      product_url: null,
      pay_url: null,
    });
  }

  return Response.json({ products });
  }
