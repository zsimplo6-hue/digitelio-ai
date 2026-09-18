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

export async function handleGoogleLogin(request, env) {
  const redirectUri = `${new URL(request.url).origin}/api/auth/callback/google`;

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  return Response.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    302
  );
}

export async function handleGoogleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return Response.json({ error: "Code d'autorisation manquant." }, { status: 400 });
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

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    return Response.json({ error: "Échec de l'authentification Google." }, { status: 400 });
  }

  const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const googleUser = await userInfoResponse.json();

  if (!googleUser.email) {
    return Response.json({ error: "Impossible de récupérer l'email Google." }, { status: 400 });
  }

  const email = googleUser.email.toLowerCase();

  let user = await env.DB.prepare(
    "SELECT id, full_name, email, plan FROM users WHERE email = ?"
  )
    .bind(email)
    .first();

  if (!user) {
    const userId = generateId();
    const fullName = googleUser.name || email.split("@")[0];

    await env.DB.prepare(
      `INSERT INTO users (id, full_name, email, password_hash, plan, language)
       VALUES (?, ?, ?, ?, 'free', 'fr')`
    )
      .bind(userId, fullName, email, "")
      .run();

    user = { id: userId, full_name: fullName, email, plan: "free" };
  }

  const token = await signJWT({ sub: user.id, email: user.email }, env.JWT_SECRET);

  return new Response(null, {
    status: 302,
    headers: {
      "Set-Cookie": buildAuthCookie(token),
      Location: "https://digitelio-ai-frontend.zsimplo6.workers.dev/dashboard",
    },
  });
}
