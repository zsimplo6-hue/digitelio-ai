import { hashPassword, verifyPassword } from "../utils/password.js";
import { signJWT, verifyJWT } from "../utils/jwt.js";
import { parseCookies, buildAuthCookie, buildClearCookie } from "../utils/cookies.js";

function generateId() {
  return crypto.randomUUID();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function handleSignup(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { fullName, email, password } = body;

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

  const { email, password } = body;
  if (!email || !password) {
    return Response.json({ error: "Email et mot de passe sont requis." }, { status: 400 });
  }

  const user = await env.DB.prepare(
    "SELECT id, full_name, email, password_hash, plan FROM users WHERE email = ?"
  )
    .bind(email.toLowerCase())
    .first();

  if (!user) {
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

