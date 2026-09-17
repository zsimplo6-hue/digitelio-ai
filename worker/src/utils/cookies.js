export function parseCookies(request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = {};
  cookieHeader.split(";").forEach((pair) => {
    const [key, ...rest] = pair.trim().split("=");
    if (key) cookies[key] = decodeURIComponent(rest.join("="));
  });
  return cookies;
}

export function buildAuthCookie(token, maxAgeSeconds = 60 * 60 * 24 * 7) {
  // Secure + HttpOnly + SameSite=None pour fonctionner entre le domaine frontend et le domaine worker
  return `digitelio_session=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${maxAgeSeconds}`;
}

export function buildClearCookie() {
  return `digitelio_session=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0`;
}

