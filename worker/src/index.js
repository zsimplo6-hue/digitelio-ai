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
import { handleUpdateEbookSection } from "./routes/ebook_sections.js";
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
import { handleTrack, handleAnalytics } from "./routes/analytics.js";
import {
  handleGetSettings,
  handleUpdateSettings as handleUpdateAccountSettings,
} from "./routes/settings.js";
import { handleChangePassword } from "./routes/account.js";
import {
  checkAccess,
  checkQuota,
  checkLearners,
  recordUsage,
  handleBilling,
} from "./routes/billing.js";
import {
  handleCreateCheckout,
  handleVerifyPayment,
  handleSaspayWebhook,
} from "./routes/payments.js";

/* Routes réservées aux comptes dont l'abonnement n'a pas expiré. */
const GATED_EXACT = new Set([
  "/api/generate/ebook",
  "/api/overview",
  "/api/sales",
  "/api/analytics",
  "/api/settings",
]);

function needsSubscription(path) {
  return (
    GATED_EXACT.has(path) ||
    path.startsWith("/api/ebooks") ||
    path.startsWith("/api/marketing") ||
    path.startsWith("/api/formations")
  );
}

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

      // ===== BLOCAGE DES ABONNEMENTS EXPIRÉS =====
      if (needsSubscription(url.pathname)) {
        const blocked = await checkAccess(request, env);
        if (blocked) return withCors(blocked, request);
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

      // ===== EBOOKS (quota : eBooks générés par période) =====
      if (url.pathname === "/api/generate/ebook" && request.method === "POST") {
        const gate = await checkQuota(request, env, "ebook");
        if (gate.blocked) return withCors(gate.blocked, request);
        const res = await handleGenerateEbook(request, env);
        if (res.ok) await recordUsage(env, gate.userId, "ebook", gate.period);
        return withCors(res, request);
      }
      if (url.pathname === "/api/ebooks" && request.method === "GET") {
        return withCors(await handleListEbooks(request, env), request);
      }
      if (url.pathname.startsWith("/api/ebooks/")) {
        // parts = ["api", "ebooks", id, "sections", sectionId]
        const parts = url.pathname.split("/").filter(Boolean);
        const ebookId = parts[2];
        if (parts.length === 3 && request.method === "GET") {
          return withCors(await handleGetEbook(request, env, ebookId), request);
        }
        if (parts.length === 5 && parts[3] === "sections" && request.method === "PUT") {
          return withCors(
            await handleUpdateEbookSection(request, env, ebookId, parts[4]),
            request
          );
        }
      }

      // ===== PAGES PUBLIQUES D'UNE FORMATION (sans connexion) =====
      if (url.pathname.startsWith("/api/public/formations/")) {
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts.length === 4 && request.method === "GET") {
          return withCors(await handleGetPublicFormation(request, env, parts[3]), request);
        }
        if (parts.length === 5 && parts[4] === "cover" && request.method === "GET") {
          return withCors(await handleGetCover(request, env, parts[3]), request);
        }
        if (parts.length === 5 && parts[4] === "track" && request.method === "POST") {
          return withCors(await handleTrack(request, env, parts[3]), request);
        }
      }

      // ===== ESPACE APPRENANT (public, protégé par le lien secret) =====
      if (url.pathname.startsWith("/api/learn/")) {
        const parts = url.pathname.split("/").filter(Boolean);
        const token = parts[2];
        if (parts.length === 3 && request.method === "GET") {
          return withCors(await handleGetLearnerCourse(request, env, token), request);
        }
        if (parts.length === 5 && parts[3] === "modules" && request.method === "POST") {
          return withCors(await handleCompleteModule(request, env, token, parts[4]), request);
        }
      }

      // ===== TABLEAU DE BORD, VENTES, ANALYTICS, PARAMÈTRES ET ABONNEMENT =====
      if (url.pathname === "/api/overview" && request.method === "GET") {
        return withCors(await handleOverview(request, env), request);
      }
      if (url.pathname === "/api/sales" && request.method === "GET") {
        return withCors(await handleSalesOverview(request, env), request);
      }
      if (url.pathname === "/api/analytics" && request.method === "GET") {
        return withCors(await handleAnalytics(request, env), request);
      }
      if (url.pathname === "/api/billing" && request.method === "GET") {
        return withCors(await handleBilling(request, env), request);
      }

      // ===== PAIEMENT DES ABONNEMENTS (SasPay) =====
      if (url.pathname === "/api/billing/checkout" && request.method === "POST") {
        return withCors(await handleCreateCheckout(request, env), request);
      }
      if (url.pathname === "/api/billing/verify" && request.method === "GET") {
        return withCors(await handleVerifyPayment(request, env), request);
      }
      if (url.pathname === "/api/webhooks/saspay" && request.method === "POST") {
        return withCors(await handleSaspayWebhook(request, env), request);
      }

      if (url.pathname === "/api/settings" && request.method === "GET") {
        return withCors(await handleGetSettings(request, env), request);
      }
      if (url.pathname === "/api/settings" && request.method === "PUT") {
        return withCors(await handleUpdateAccountSettings(request, env), request);
      }
      if (url.pathname === "/api/account/password" && request.method === "POST") {
        return withCors(await handleChangePassword(request, env), request);
      }

      // ===== MARKETING DIGITAL (quota : contenus marketing par période) =====
      if (url.pathname === "/api/marketing/generate" && request.method === "POST") {
        const gate = await checkQuota(request, env, "marketing");
        if (gate.blocked) return withCors(gate.blocked, request);
        const res = await handleGenerateMarketing(request, env);
        if (res.ok) await recordUsage(env, gate.userId, "marketing", gate.period);
        return withCors(res, request);
      }

      // ===== FORMATIONS =====
      if (url.pathname === "/api/formations" && request.method === "GET") {
        return withCors(await handleListFormations(request, env), request);
      }
      if (url.pathname === "/api/formations" && request.method === "POST") {
        const gate = await checkQuota(request, env, "formation");
        if (gate.blocked) return withCors(gate.blocked, request);
        const res = await handleCreateFormation(request, env);
        if (res.ok) await recordUsage(env, gate.userId, "formation", gate.period);
        return withCors(res, request);
      }
      if (url.pathname.startsWith("/api/formations/")) {
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

        if (parts[3] === "enrollments") {
          if (parts.length === 4 && request.method === "GET") {
            return withCors(await handleListEnrollments(request, env, formationId), request);
          }
          if (parts.length === 4 && request.method === "POST") {
            const blocked = await checkLearners(request, env, formationId);
            if (blocked) return withCors(blocked, request);
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
            const gate = await checkQuota(request, env, "lesson");
            if (gate.blocked) return withCors(gate.blocked, request);
            const res = await handleGenerateModule(request, env, formationId, moduleId);
            if (res.ok) await recordUsage(env, gate.userId, "lesson", gate.period);
            return withCors(res, request);
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
