import { getCorsHeaders, withCors } from "./utils/cors.js";
import {
  handleSignup,
  handleLogin,
  handleMe,
  handleLogout,
  handleGoogleLogin,
  handleGoogleCallback,
} from "./routes/auth.js";
import { handleGenerateEbook, handleListEbooks, handleGetEbook } from "./routes/ebooks.js";
import {
  handleCreateFormation,
  handleListFormations,
  handleGetFormation,
  handleDeleteFormation,
  handleUpdateModule,
  handleGenerateModule,
} from "./routes/formations.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: getCorsHeaders(request) });
    }

    try {
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
      if (url.pathname === "/api/auth/google" && request.method === "GET") {
        return await handleGoogleLogin(request, env);
      }
      if (url.pathname === "/api/auth/callback/google" && request.method === "GET") {
        return await handleGoogleCallback(request, env);
      }

      if (url.pathname === "/api/generate/ebook" && request.method === "POST") {
        return withCors(await handleGenerateEbook(request, env), request);
      }
      if (url.pathname === "/api/ebooks" && request.method === "GET") {
        return withCors(await handleListEbooks(request, env), request);
      }
      if (url.pathname.startsWith("/api/ebooks/") && request.method === "GET") {
        const ebookId = url.pathname.split("/api/ebooks/")[1];
        return withCors(await handleGetEbook(request, env, ebookId), request);
      }

      // ===== FORMATIONS =====
      if (url.pathname === "/api/formations" && request.method === "GET") {
        return withCors(await handleListFormations(request, env), request);
      }
      if (url.pathname === "/api/formations" && request.method === "POST") {
        return withCors(await handleCreateFormation(request, env), request);
      }
      if (url.pathname.startsWith("/api/formations/")) {
        // parts = ["api", "formations", id, "modules", moduleId, "generate"]
        const parts = url.pathname.split("/").filter(Boolean);
        const formationId = parts[2];

        if (parts.length === 3) {
          if (request.method === "GET") {
            return withCors(await handleGetFormation(request, env, formationId), request);
          }
          if (request.method === "DELETE") {
            return withCors(await handleDeleteFormation(request, env, formationId), request);
          }
        }

        if (parts[3] === "modules" && parts[4]) {
          const moduleId = parts[4];
          if (parts.length === 5 && request.method === "PUT") {
            return withCors(
              await handleUpdateModule(request, env, formationId, moduleId),
              request
            );
          }
          if (parts.length === 6 && parts[5] === "generate" && request.method === "POST") {
            return withCors(
              await handleGenerateModule(request, env, formationId, moduleId),
              request
            );
          }
        }
      }

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
