const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Resource-Policy": "same-site",
};

export function secure(res) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) h.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

export function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

let ready = false;
async function ensureTable(env) {
  if (ready) return;
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS rate_limits (k TEXT PRIMARY KEY, n INTEGER NOT NULL, reset_at INTEGER NOT NULL)"
  ).run();
  ready = true;
}

/* Compte une tentative. Retourne { ok, retryAfter }. En cas de panne de la base, on laisse passer. */
export async function rateLimit(env, key, max, windowSec) {
  try {
    await ensureTable(env);
    const now = Date.now();
    const next = now + windowSec * 1000;
    const row = await env.DB.prepare(
      `INSERT INTO rate_limits (k, n, reset_at) VALUES (?, 1, ?)
       ON CONFLICT(k) DO UPDATE SET
         n = CASE WHEN reset_at <= ? THEN 1 ELSE n + 1 END,
         reset_at = CASE WHEN reset_at <= ? THEN ? ELSE reset_at END
       RETURNING n, reset_at`
    )
      .bind(key, next, now, now, next)
      .first();

    if (Math.random() < 0.01) {
      await env.DB.prepare("DELETE FROM rate_limits WHERE reset_at < ?").bind(now - 86400000).run();
    }
    if (row && row.n > max) {
      return { ok: false, retryAfter: Math.max(1, Math.ceil((row.reset_at - now) / 1000)) };
    }
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

export function tooMany(retryAfter) {
  return Response.json(
    { error: "Trop de tentatives. Patientez quelques minutes puis réessayez." },
    { status: 429, headers: { "Retry-After": String(retryAfter || 60) } }
  );
}

/* Anti-CSRF : une requête qui modifie des données doit venir d'un site autorisé */
export function originAllowed(request, env) {
  const m = request.method;
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return true;
  const origin = request.headers.get("Origin");
  if (!origin) return true; // appels serveur à serveur (webhooks)
  const list = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (env.APP_URL) list.push(String(env.APP_URL).replace(/\/$/, ""));
  if (list.length === 0) return true;
  if (origin === new URL(request.url).origin) return true;
  return list.includes(origin);
  }
