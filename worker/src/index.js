import { getCorsHeaders, withCors } from "./utils/cors.js";
import { handleSignup, handleLogin, handleMe, handleLogout } from "./routes/auth.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Pré-vol CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: getCorsHeaders(request) });
    }

    try {
      // Healthcheck
      if (url.pathname === "/api/health") {
        return withCors(
          Response.json({
            status: "ok",
            service: "digitelio-ai-worker",
            environment: env.ENVIRONMENT || "development",
          }),
          request
        );
      }

      // --- Authentification ---
      if (url.pathname === "/api/auth/signup" && request.method === "POST") {
        return withCors(await handleSignup(request, env), request);
      }
      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        return withCors(await handleLogin(request, env), request);
      }
      if (url.pathname === "/api/auth/me" && request.method === "GET") {
        return withCors(await handleMe(request, env), request);
      }
      if (url.pathname === "/api/auth/logout" && request.method === "POST") {
        return withCors(await handleLogout(), request);
      }

      // Placeholders des routes à venir (Sprint 3+)
      // /api/projects
      // /api/generate/ebook

      return withCors(
        Response.json({ error: "Route non trouvée" }, { status: 404 }),
        request
      );
    } catch (err) {
      return withCors(
        Response.json({ error: "Erreur serveur", details: err.message }, { status: 500 }),
        request
      );
    }
  },
};

