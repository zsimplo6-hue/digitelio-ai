import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";

async function getAuthenticatedUser(request, env) {
  const cookies = parseCookies(request);
  const token = cookies["digitelio_session"];
  if (!token) return null;
  return await verifyJWT(token, env.JWT_SECRET);
}

const unauthorized = () => Response.json({ error: "Non authentifié." }, { status: 401 });

/* Doit rester identique à la liste de routes/publish.js */
const CURRENCIES = [
  "EUR", "USD", "XOF", "XAF", "GBP", "CAD", "CHF", "MAD",
  "DZD", "TND", "NGN", "GHS", "KES", "ZAR", "GNF", "CDF",
];

export async function handleGetSettings(request, env) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const user = await env.DB.prepare(
    "SELECT full_name, email, plan, default_currency FROM users WHERE id = ?"
  )
    .bind(payload.sub)
    .first();

  if (!user) {
    return Response.json({ error: "Compte introuvable." }, { status: 404 });
  }

  return Response.json({
    settings: {
      full_name: user.full_name,
      email: user.email,
      plan: user.plan,
      default_currency: user.default_currency || "EUR",
    },
  });
}

export async function handleUpdateSettings(request, env) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const fullName = String(body.full_name || "").trim();
  if (fullName.length < 2 || fullName.length > 60) {
    return Response.json(
      { error: "Le nom doit contenir entre 2 et 60 caractères." },
      { status: 400 }
    );
  }

  const currency = String(body.default_currency || "").toUpperCase();
  if (!CURRENCIES.includes(currency)) {
    return Response.json({ error: "Monnaie non prise en charge." }, { status: 400 });
  }

  await env.DB.prepare(
    "UPDATE users SET full_name = ?, default_currency = ?, updated_at = datetime('now') WHERE id = ?"
  )
    .bind(fullName, currency, payload.sub)
    .run();

  return Response.json({ settings: { full_name: fullName, default_currency: currency } });
}
