import { parseCookies, buildAuthCookie } from "../utils/cookies.js";
import { verifyJWT, signJWT } from "../utils/jwt.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

async function getAuthenticatedUser(request, env) {
  const cookies = parseCookies(request);
  const token = cookies["digitelio_session"];
  if (!token) return null;
  return await verifyJWT(token, env.JWT_SECRET);
}

const unauthorized = () => Response.json({ error: "Non authentifié." }, { status: 401 });

export async function handleChangePassword(request, env) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const current = String(body.current_password || "");
  const next = String(body.new_password || "");

  if (next.length < 8) {
    return Response.json(
      { error: "Le nouveau mot de passe doit contenir au moins 8 caractères." },
      { status: 400 }
    );
  }
  if (next.length > 128) {
    return Response.json(
      { error: "Le nouveau mot de passe est trop long (128 caractères maximum)." },
      { status: 400 }
    );
  }

  const user = await env.DB.prepare(
    "SELECT id, email, password_hash FROM users WHERE id = ?"
  )
    .bind(payload.sub)
    .first();

  if (!user) {
    return Response.json({ error: "Compte introuvable." }, { status: 404 });
  }

  // Compte créé via Google : pas de mot de passe actuel à vérifier
  const hasPassword = !!user.password_hash;

  if (hasPassword) {
    if (!current) {
      return Response.json({ error: "Saisissez votre mot de passe actuel." }, { status: 400 });
    }
    const ok = await verifyPassword(current, user.password_hash);
    if (!ok) {
      return Response.json({ error: "Mot de passe actuel incorrect." }, { status: 403 });
    }
    if (current === next) {
      return Response.json(
        { error: "Le nouveau mot de passe doit être différent de l'actuel." },
        { status: 400 }
      );
    }
  }

  const newHash = await hashPassword(next);

  await env.DB.prepare(
    "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
  )
    .bind(newHash, user.id)
    .run();

  // On renouvelle la session de l'appareil actuel
  const token = await signJWT({ sub: user.id, email: user.email }, env.JWT_SECRET);

  return Response.json(
    { success: true, had_password: hasPassword },
    { headers: { "Set-Cookie": buildAuthCookie(token) } }
  );
}
