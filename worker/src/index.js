import { corsHeaders, withCors } from "./utils/cors.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Pré-vol CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Healthcheck
    if (url.pathname === "/api/health") {
      return withCors(
        Response.json({
          status: "ok",
          service: "digitelio-ai-worker",
          environment: env.ENVIRONMENT || "development",
        })
      );
    }

    // Placeholders des routes à venir (Sprint 2+)
    // /api/auth/signup
    // /api/auth/login
    // /api/projects
    // /api/generate/ebook

    return withCors(
      Response.json({ error: "Route non trouvée" }, { status: 404 })
    );
  },
};

