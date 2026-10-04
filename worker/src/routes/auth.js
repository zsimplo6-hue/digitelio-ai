import { hashPassword, verifyPassword } from "../utils/password.js";
import { signJWT, verifyJWT } from "../utils/jwt.js";
import { parseCookies, buildAuthCookie, buildClearCookie } from "../utils/cookies.js";
import { sendEmail } from "../utils/email.js";

function generateId() {
  return crypto.randomUUID();
}

function isValidEmail(email) {
  return typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function handleSignup(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const fullName = String(body.fullName || "").trim().slice(0, 80);
  const email = String(body.email || "").trim();
  const password = String(body.password || "");

  if (!fullName || !email || !password) {
    return Response.json(
      { error: "Nom complet, email et mot de passe sont requis." },
      { status: 400 }
    );
  }
  if (!isValidEmail(email)) {
    return Response.json({ error: "Adresse email invalide." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères." },
      { status: 400 }
    );
  }
  if (password.length > 200) {
    return Response.json({ error: "Mot de passe trop long." }, { status: 400 });
  }

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first();

  if (existing) {
    return Response.json(
      { error: "Un compte existe déjà avec cet email." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const userId = generateId();

  await env.DB.prepare(
    `INSERT INTO users (id, full_name, email, password_hash, plan, language)
     VALUES (?, ?, ?, ?, 'free', 'fr')`
  )
    .bind(userId, fullName, email.toLowerCase(), passwordHash)
    .run();

  const token = await signJWT({ sub: userId, email: email.toLowerCase() }, env.JWT_SECRET);

  return Response.json(
    { user: { id: userId, fullName, email: email.toLowerCase(), plan: "free" } },
    {
      status: 201,
      headers: { "Set-Cookie": buildAuthCookie(token) },
    }
  );
}

export async function handleLogin(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  if (!email || !password || password.length > 200) {
    return Response.json({ error: "Email et mot de passe sont requis." }, { status: 400 });
  }

  const user = await env.DB.prepare(
    "SELECT id, full_name, email, password_hash, plan FROM users WHERE email = ?"
  )
    .bind(email.toLowerCase())
    .first();

  // Compte Google sans mot de passe : jamais de connexion par mot de passe
  if (!user || !user.password_hash) {
    return Response.json({ error: "Identifiants incorrects." }, { status: 401 });
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return Response.json({ error: "Identifiants incorrects." }, { status: 401 });
  }

  const token = await signJWT({ sub: user.id, email: user.email }, env.JWT_SECRET);

  return Response.json(
    {
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        plan: user.plan,
      },
    },
    {
      status: 200,
      headers: { "Set-Cookie": buildAuthCookie(token) },
    }
  );
}

export async function handleMe(request, env) {
  const cookies = parseCookies(request);
  const token = cookies["digitelio_session"];

  if (!token) {
    return Response.json({ user: null }, { status: 200 });
  }

  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) {
    return Response.json({ user: null }, { status: 200 });
  }

  const user = await env.DB.prepare(
    "SELECT id, full_name, email, plan FROM users WHERE id = ?"
  )
    .bind(payload.sub)
    .first();

  if (!user) {
    return Response.json({ user: null }, { status: 200 });
  }

  return Response.json({
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      plan: user.plan,
    },
  });
}

export async function handleLogout() {
  return Response.json(
    { success: true },
    { headers: { "Set-Cookie": buildClearCookie() } }
  );
}

/* ===================== MOT DE PASSE OUBLIÉ ===================== */

const RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes
const RESET_MAX_PER_HOUR = 3;
const DEFAULT_APP_URL = "https://digitelio.com";
const GENERIC_FORGOT_MESSAGE =
  "Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé. Pensez à vérifier vos courriers indésirables.";

let resetReady = false;
async function ensureResetTable(env) {
  if (resetReady) return;
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS password_resets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        used_at INTEGER,
        created_at INTEGER NOT NULL
      )`
    ),
    env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets (user_id, created_at)"
    ),
  ]);
  resetReady = true;
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function emailShell(title, bodyHtml, buttonHtml, footer) {
  return `
  <div style="font-family: -apple-system, Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #F7F7FB;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-weight: 700; font-size: 18px; color: #0F0F1E;">DIGITELIO <span style="color: #7C3AED;">AI</span></span>
    </div>
    <div style="background: #fff; border-radius: 20px; padding: 32px 28px; box-shadow: 0 8px 24px rgba(16,16,40,0.06);">
      <h1 style="font-size: 20px; color: #0F0F1E; margin: 0 0 12px;">${title}</h1>
      <p style="font-size: 14px; color: #6B6B85; line-height: 1.6; margin: 0 0 20px;">${bodyHtml}</p>
      ${buttonHtml}
    </div>
    <p style="text-align: center; font-size: 12px; color: #9C9CB4; margin-top: 20px;">${footer}</p>
  </div>`;
}

function resetEmailHtml(name, url) {
  const button = `
      <div style="text-align: center; margin: 28px 0;">
        <a href="${esc(url)}" style="display: inline-block; background: linear-gradient(135deg,#6D3BF5,#C13BF5); color: #fff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 12px;">
          Choisir un nouveau mot de passe
        </a>
      </div>
      <p style="font-size: 12px; color: #9C9CB4; text-align: center; word-break: break-all;">Ou copiez ce lien : ${esc(url)}</p>`;
  return emailShell(
    `Bonjour${name ? `, ${esc(name)}` : ""} 👋`,
    "Vous avez demandé à réinitialiser votre mot de passe Digitelio AI. Ce lien est valable <strong>30 minutes</strong> et ne peut servir qu'une seule fois.",
    button,
    "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email : votre mot de passe reste inchangé."
  );
}

function resetDoneEmailHtml(name) {
  return emailShell(
    "Votre mot de passe a été modifié",
    `Bonjour${name ? ` ${esc(name)}` : ""}, le mot de passe de votre compte Digitelio AI vient d'être modifié. Si c'est bien vous, vous pouvez vous connecter avec votre nouveau mot de passe.`,
    "",
    "Si vous n'êtes pas à l'origine de ce changement, demandez immédiatement une nouvelle réinitialisation depuis la page de connexion."
  );
}

export async function handleForgotPassword(request, env) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();

  // Réponse identique dans tous les cas : on ne révèle jamais si un compte existe
  const ok = () => Response.json({ message: GENERIC_FORGOT_MESSAGE });
  if (!isValidEmail(email)) return ok();

  try {
    await ensureResetTable(env);

    const user = await env.DB.prepare("SELECT id, full_name, email FROM users WHERE email = ?")
      .bind(email)
      .first();
    if (!user) return ok();

    const now = Date.now();
    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM password_resets WHERE user_id = ? AND created_at > ?"
    )
      .bind(user.id, now - 60 * 60 * 1000)
      .first();
    if ((recent?.n || 0) >= RESET_MAX_PER_HOUR) return ok();

    const token = randomToken();
    const tokenHash = await sha256Hex(token);

    await env.DB.prepare(
      "INSERT INTO password_resets (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(generateId(), user.id, tokenHash, now + RESET_TTL_MS, now)
      .run();

    const appUrl = String(env.APP_URL || DEFAULT_APP_URL).replace(/\/$/, "");
    const url = `${appUrl}/reset-password?token=${token}`;

    const result = await sendEmail(env, {
      to: user.email,
      toName: user.full_name || user.email,
      subject: "Réinitialisation de votre mot de passe Digitelio AI",
      html: resetEmailHtml(user.full_name, url),
    });
    if (!result?.ok) console.error("Email de réinitialisation non envoyé", result?.error);
  } catch (err) {
    console.error("Erreur mot de passe oublié", err.message);
  }
  return ok();
}

export async function handleResetPassword(request, env) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token || "");
  const password = String(body?.password || "");

  const invalid = () =>
    Response.json(
      { error: "Ce lien est invalide ou a expiré. Refaites une demande de réinitialisation." },
      { status: 400 }
    );

  if (!/^[0-9a-f]{64}$/.test(token)) return invalid();
  if (password.length < 8) {
    return Response.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères." },
      { status: 400 }
    );
  }
  if (password.length > 200) {
    return Response.json({ error: "Mot de passe trop long." }, { status: 400 });
  }

  await ensureResetTable(env);

  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    "SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?"
  )
    .bind(tokenHash)
    .first();

  const now = Date.now();
  if (!row || row.used_at || row.expires_at < now) return invalid();

  const user = await env.DB.prepare("SELECT id, full_name, email FROM users WHERE id = ?")
    .bind(row.user_id)
    .first();
  if (!user) return invalid();

  const passwordHash = await hashPassword(password);

  await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").bind(
      passwordHash,
      user.id
    ),
    env.DB.prepare("UPDATE password_resets SET used_at = ? WHERE id = ?").bind(now, row.id),
    // Tous les autres liens encore valides de ce compte sont annulés
    env.DB.prepare("DELETE FROM password_resets WHERE user_id = ? AND id != ?").bind(user.id, row.id),
  ]);

  try {
    await sendEmail(env, {
      to: user.email,
      toName: user.full_name || user.email,
      subject: "Votre mot de passe Digitelio AI a été modifié",
      html: resetDoneEmailHtml(user.full_name),
    });
  } catch (err) {
    console.error("Email de confirmation non envoyé", err.message);
  }

  return Response.json({ success: true });
}

/* ===================== GOOGLE ===================== */

const STATE_TTL_MS = 10 * 60 * 1000;
const FALLBACK_FRONTEND = "https://digitelio-ai-frontend.zsimplo6.workers.dev";

/* Jeton "state" signé : pas de cookie nécessaire, impossible à falsifier sans JWT_SECRET */
async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(secret || "")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function makeState(env) {
  const nonce = randomToken().slice(0, 32);
  const ts = Date.now().toString(36);
  const sig = await hmacHex(env.JWT_SECRET, `${nonce}.${ts}`);
  return `${nonce}.${ts}.${sig}`;
}

async function checkState(env, state) {
  const parts = String(state || "").split(".");
  if (parts.length !== 3) return false;
  const [nonce, ts, sig] = parts;
  const issued = parseInt(ts, 36);
  if (!Number.isFinite(issued) || Date.now() - issued > STATE_TTL_MS || issued > Date.now() + 60000) {
    return false;
  }
  const expected = await hmacHex(env.JWT_SECRET, `${nonce}.${ts}`);
  return safeEqual(sig, expected);
}

export async function handleGoogleLogin(request, env) {
  const redirectUri = `${new URL(request.url).origin}/api/auth/callback/google`;
  const state = await makeState(env);

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return new Response(null, {
    status: 302,
    headers: { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` },
  });
}

export async function handleGoogleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "";

  if (!code || !(await checkState(env, state))) {
    return Response.json(
      { error: "Connexion Google invalide ou expirée. Réessayez depuis la page de connexion." },
      { status: 400 }
    );
  }

  const redirectUri = `${url.origin}/api/auth/callback/google`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenData.access_token) {
    return Response.json({ error: "Échec de l'authentification Google." }, { status: 400 });
  }

  const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const googleUser = await userInfoResponse.json().catch(() => ({}));

  if (!googleUser.email) {
    return Response.json({ error: "Impossible de récupérer l'email Google." }, { status: 400 });
  }
  // Un email non vérifié par Google ne doit jamais donner accès à un compte
  if (googleUser.verified_email === false) {
    return Response.json({ error: "Votre email Google n'est pas vérifié." }, { status: 403 });
  }

  const email = String(googleUser.email).toLowerCase();

  let user = await env.DB.prepare(
    "SELECT id, full_name, email, plan FROM users WHERE email = ?"
  )
    .bind(email)
    .first();

  if (!user) {
    const userId = generateId();
    const fullName = String(googleUser.name || email.split("@")[0]).slice(0, 80);

    await env.DB.prepare(
      `INSERT INTO users (id, full_name, email, password_hash, plan, language)
       VALUES (?, ?, ?, ?, 'free', 'fr')`
    )
      .bind(userId, fullName, email, "")
      .run();

    user = { id: userId, full_name: fullName, email, plan: "free" };
  }

  const token = await signJWT({ sub: user.id, email: user.email }, env.JWT_SECRET);

  // Même destination qu'avant ; FRONTEND_URL (facultatif) permet de la changer
  const front = String(env.FRONTEND_URL || FALLBACK_FRONTEND).replace(/\/$/, "");

  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": buildAuthCookie(token),
      Location: `${front}/dashboard`,
    },
  });
      }
