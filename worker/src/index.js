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
  handleDeleteFormation,
  handleUpdateModule,
  handleGenerateModule,
} from "./routes/formations.js";
import {
  handleListFormations,
  handleGetFormation,
  handleUpdateSettings,
  handlePublish,
  handleUnpublish,
  handleGetPublicFormation,
} from "./routes/publish.js";
import {
  handleCreateEnrollment,
  handleListEnrollments,
  handleDeleteEnrollment,
  handleGetLearnerCourse,
  handleCompleteModule,
} from "./routes/learners.js";
import { handleSalesOverview, handleGetCover } from "./routes/stats.js";
import { handleGenerateMarketing } from "./routes/marketing.js";
import { handleOverview } from "./routes/overview.js";

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

      // ===== PAGES PUBLIQUES D'UNE FORMATION (sans connexion) =====
      if (url.pathname.startsWith("/api/public/formations/") && request.method === "GET") {
        // parts = ["api", "public", "formations", id] ou [..., id, "cover"]
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts.length === 4) {
          return withCors(await handleGetPublicFormation(request, env, parts[3]), request);
        }
        if (parts.length === 5 && parts[4] === "cover") {
          return withCors(await handleGetCover(request, env, parts[3]), request);
        }
      }

      // ===== ESPACE APPRENANT (public, protégé par le lien secret) =====
      if (url.pathname.startsWith("/api/learn/")) {
        // parts = ["api", "learn", token, "modules", moduleId]
        const parts = url.pathname.split("/").filter(Boolean);
        const token = parts[2];
        if (parts.length === 3 && request.method === "GET") {
          return withCors(await handleGetLearnerCourse(request, env, token), request);
        }
        if (parts.length === 5 && parts[3] === "modules" && request.method === "POST") {
          return withCors(await handleCompleteModule(request, env, token, parts[4]), request);
        }
      }

      // ===== TABLEAU DE BORD ET VENTES =====
      if (url.pathname === "/api/overview" && request.method === "GET") {
        return withCors(await handleOverview(request, env), request);
      }
      if (url.pathname === "/api/sales" && request.method === "GET") {
        return withCors(await handleSalesOverview(request, env), request);
      }

      // ===== MARKETING DIGITAL =====
      if (url.pathname === "/api/marketing/generate" && request.method === "POST") {
        return withCors(await handleGenerateMarketing(request, env), request);
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
          if (request.method === "PUT") {
            return withCors(await handleUpdateSettings(request, env, formationId), request);
          }
          if (request.method === "DELETE") {
            return withCors(await handleDeleteFormation(request, env, formationId), request);
          }
        }

        // Accès des apprenants
        if (parts[3] === "enrollments") {
          if (parts.length === 4 && request.method === "GET") {
            return withCors(await handleListEnrollments(request, env, formationId), request);
          }
          if (parts.length === 4 && request.method === "POST") {
            return withCors(await handleCreateEnrollment(request, env, formationId), request);
          }
          if (parts.length === 5 && request.method === "DELETE") {
            return withCors(
              await handleDeleteEnrollment(request, env, formationId, parts[4]),
              request
            );
          }
        }

        if (parts.length === 4 && request.method === "POST") {
          if (parts[3] === "publish") {
            return withCors(await handlePublish(request, env, formationId), request);
          }
          if (parts[3] === "unpublish") {
            return withCors(await handleUnpublish(request, env, formationId), request);
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
