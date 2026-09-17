// Liste des origines autorisées à appeler l'API avec des cookies (credentials)
const ALLOWED_ORIGINS = [
  "https://digitelio-ai-frontend.zsimplo6.workers.dev",
  "http://localhost:5173",
];

export function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

export function withCors(response, request) {
  const newHeaders = new Headers(response.headers);
  const cors = getCorsHeaders(request);
  Object.entries(cors).forEach(([key, value]) => newHeaders.set(key, value));
  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  });
}

