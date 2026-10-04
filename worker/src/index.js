import { getCorsHeaders, withCors } from "./utils/cors.js";
import { secure, clientIp, rateLimit, tooMany, originAllowed } from "./utils/security.js";
import {
  handleSignup,
  handleLogin,
  handleMe,
  handleLogout,
  handleForgotPassword,
  handleResetPassword,
  handleGoogleLogin,
  handleGoogleCallback,
} from "./routes/auth.js";
import {
  handleGenerateEbook,
  handleGenerateEbookSection,
  handleListEbooks,
  handleGetEbook,
} from "./routes/ebooks.js";
import {
  handleUpdateEbookSettings,
  handlePublishEbook,
  handleUnpublishEbook,
  handleGetPublicEbook,
} from "./routes/ebook_publish.js";
import { handleGetEbookReader } from "./routes/ebook_read.js";
import {
  handleGetMyShop,
  handleUpdateShop,
  handleGetPublicShop,
  handleListProductLinks,
} from "./routes/shop.js";
import {
  handleGetPayInfo,
  handleCreateProductCheckout,
  handleVerifyProductPayment,
} from "./routes/shop_payments.js";
import { handleGetWallet, handleRequestWithdrawal } from "./routes/wallet.js";
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
import { handleTrack, handleTrackEbook, handleAnalytics } from "./routes/analytics.js";
import {
  handleGetSettings,
  handleUpdateSettings as handleUpdateAccountSettings,
} from "./routes/settings.js";
import { handleChangePassword } from "./routes/account.js";
import {
  checkAccess,
  checkQuota,
  checkLearners,
  checkFeature,
  recordUsage,
  handleBilling,
} from "./routes/billing.js";
import {
  handleCreateCheckout,
  handleVerifyPayment,
  handleSaspayWebhook,
} from "./routes/payments.js";
import {
  handleGetStyle,
  handleSetTemplate,
  handleGetBrand,
  handleSaveBrand,
  handleIdeas,
} from "./routes/styles.js";
import {
  handleGetFormationStyle,
  handleSetFormationTemplate,
} from "./routes/formation_styles.js";
import { handleAdminStats } from "./routes/admin.js";

const GATED_EXACT = new Set([
  "/api/generate/ebook",
  "/api/overview",
  "/api/sales",
  "/api/analytics",
  "/api/settings",
]);

const MAX_BODY_BYTES = 8 * 1024 * 1024;

function needsSubscription(path) {
  return (
    GATED_EXACT.has(path) ||
    path.startsWith("/api/ebooks") ||
    path.startsWith("/api/marketing") ||
    path.startsWith("/api/formations") ||
    path.startsWith("/api/ideas")
  );
}

/* Lit le corps JSON sans consommer la requête (le handler pourra le relire) */
async function bodyOf(request) {
  return await request.clone().json().catch(() => null);
}

/* Limite de tentatives : retourne une réponse 429 si dépassée, sinon null */
async function limited(request, env, name, max, windowSec, extra = "") {
  const r = await rateLimit(env, `${name}:${clientIp(request)}${extra}`, max, windowSec);
  return r.ok ? null : tooMany(r.retryAfter);
}

async function route(request, env, ctx) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(request) });
  }

  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > MAX_BODY_BYTES) {
    return withCors(Response.json({ error: "Requête trop volumineuse." }, { status: 413 }), request);
  }

  // Anti-CSRF (les webhooks serveur à serveur n'ont pas d'Origin)
  if (!url.pathname.startsWith("/api/webhooks/") && !originAllowed(request, env)) {
    return Response.json({ error: "Origine non autorisée." }, { status: 403 });
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

    if (needsSubscription(url.pathname)) {
      const blocked = await checkAccess(request, env);
      if (blocked) return withCors(blocked, request);
    }

    // ===== AUTHENTIFICATION =====
    if (url.pathname === "/api/auth/signup" && request.method === "POST") {
      const rl = await limited(request, env, "signup", 8, 3600);
      if (rl) return withCors(rl, request);
      return withCors(await handleSignup(request, env), request);
    }
    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      const rl = await limited(request, env, "login-ip", 20, 900);
      if (rl) return withCors(rl, request);
      const body = await bodyOf(request);
      const email = String(body?.email || "").trim().toLowerCase().slice(0, 254);
      if (email) {
        const rl2 = await rateLimit(env, `login-email:${email}`, 8, 900);
        if (!rl2.ok) return withCors(tooMany(rl2.retryAfter), request);
      }
      return withCors(await handleLogin(request, env), request);
    }
    if (url.pathname === "/api/auth/forgot-password" && request.method === "POST") {
      const rl = await limited(request, env, "forgot", 6, 3600);
      if (rl) return withCors(rl, request);
      return withCors(await handleForgotPassword(request, env), request);
    }
    if (url.pathname === "/api/auth/reset-password" && request.method === "POST") {
      const rl = await limited(request, env, "reset", 10, 3600);
      if (rl) return withCors(rl, request);
      return withCors(await handleResetPassword(request, env), request);
    }
    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      return withCors(await handleMe(request, env), request);
    }
    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      return withCors(await handleLogout(), request);
    }
    if (url.pathname === "/api/auth/google" && request.method === "GET") {
      const rl = await limited(request, env, "google", 30, 900);
      if (rl) return withCors(rl, request);
      return await handleGoogleLogin(request, env);
    }
    if (url.pathname === "/api/auth/callback/google" && request.method === "GET") {
      const rl = await limited(request, env, "google-cb", 30, 900);
      if (rl) return withCors(rl, request);
      return await handleGoogleCallback(request, env);
    }

    // ===== ADMIN (réservé aux adresses de ADMIN_EMAILS) =====
    if (url.pathname === "/api/admin/stats" && request.method === "GET") {
      const rl = await limited(request, env, "admin", 120, 60);
      if (rl) return withCors(rl, request);
      return withCors(await handleAdminStats(request, env), request);
    }

    if (url.pathname === "/api/generate/ebook" && request.method === "POST") {
      const body = await bodyOf(request);
      const lock = await checkFeature(request, env, "language", body?.language || "fr");
      if (lock) return withCors(lock, request);
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
      const parts = url.pathname.split("/").filter(Boolean);
      const ebookId = parts[2];

      if (parts.length === 3) {
        if (request.method === "GET") {
          return withCors(await handleGetEbook(request, env, ebookId), request);
        }
        if (request.method === "PUT") {
          return withCors(await handleUpdateEbookSettings(request, env, ebookId), request);
        }
      }

      if (parts.length === 5 && parts[3] === "sections" && request.method === "PUT") {
        return withCors(
          await handleUpdateEbookSection(request, env, ebookId, parts[4]),
          request
        );
      }

      if (
        parts.length === 6 &&
        parts[3] === "sections" &&
        parts[5] === "generate" &&
        request.method === "POST"
      ) {
        return withCors(
          await handleGenerateEbookSection(request, env, ebookId, parts[4]),
          request
        );
      }

      if (parts.length === 4 && parts[3] === "style") {
        if (request.method === "GET") {
          return withCors(await handleGetStyle(request, env, ebookId), request);
        }
        if (request.method === "PUT") {
          const body = await bodyOf(request);
          const lock = await checkFeature(request, env, "ebook_template", body?.template);
          if (lock) return withCors(lock, request);
          return withCors(await handleSetTemplate(request, env, ebookId), request);
        }
      }

      if (parts.length === 4 && request.method === "POST") {
        if (parts[3] === "publish") {
          return withCors(await handlePublishEbook(request, env, ebookId), request);
        }
        if (parts[3] === "unpublish") {
          return withCors(await handleUnpublishEbook(request, env, ebookId), request);
        }
      }
    }

    // ===== PAIEMENT D'UN PRODUIT (sans connexion) =====
    if (url.pathname === "/api/pay/verify" && request.method === "GET") {
      return withCors(await handleVerifyProductPayment(request, env), request);
    }
    if (url.pathname.startsWith("/api/pay/")) {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length === 3 && request.method === "GET") {
        return withCors(await handleGetPayInfo(request, env, parts[2]), request);
      }
      if (parts.length === 4 && parts[3] === "checkout" && request.method === "POST") {
        const rl = await limited(request, env, "pay-checkout", 20, 600);
        if (rl) return withCors(rl, request);
        return withCors(await handleCreateProductCheckout(request, env, parts[2]), request);
      }
    }

    // ===== BOUTIQUE PUBLIQUE (sans connexion) =====
    if (url.pathname.startsWith("/api/public/shop/")) {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length === 4 && request.method === "GET") {
        return withCors(await handleGetPublicShop(request, env, parts[3]), request);
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

    // ===== PAGE PUBLIQUE D'UN EBOOK (sans connexion) =====
    if (url.pathname.startsWith("/api/public/ebooks/")) {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length === 4 && request.method === "GET") {
        return withCors(await handleGetPublicEbook(request, env, parts[3]), request);
      }
      if (parts.length === 5 && parts[4] === "track" && request.method === "POST") {
        return withCors(await handleTrackEbook(request, env, parts[3]), request);
      }
    }

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

    // ===== LECTURE D'UN EBOOK ACHETÉ (sans connexion) =====
    if (url.pathname.startsWith("/api/read/")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const token = parts[2];
      if (parts.length === 3 && request.method === "GET") {
        const rl = await limited(request, env, "read", 120, 600);
        if (rl) return withCors(rl, request);
        return withCors(await handleGetEbookReader(request, env, token), request);
      }
    }

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

    if (url.pathname === "/api/billing/checkout" && request.method === "POST") {
      const rl = await limited(request, env, "checkout", 20, 600);
      if (rl) return withCors(rl, request);
      return withCors(await handleCreateCheckout(request, env), request);
    }
    if (url.pathname === "/api/billing/verify" && request.method === "GET") {
      return withCors(await handleVerifyPayment(request, env), request);
    }
    if (url.pathname === "/api/webhooks/saspay" && request.method === "POST") {
      return withCors(await handleSaspayWebhook(request, env), request);
    }

    if (url.pathname === "/api/shop" && request.method === "GET") {
      return withCors(await handleGetMyShop(request, env), request);
    }
    if (url.pathname === "/api/shop" && request.method === "PUT") {
      return withCors(await handleUpdateShop(request, env), request);
    }
    if (url.pathname === "/api/shop/products" && request.method === "GET") {
      return withCors(await handleListProductLinks(request, env), request);
    }

    // ===== WALLET =====
    if (url.pathname === "/api/wallet" && request.method === "GET") {
      return withCors(await handleGetWallet(request, env), request);
    }
    if (url.pathname === "/api/wallet/withdraw" && request.method === "POST") {
      const rl = await limited(request, env, "withdraw", 10, 3600);
      if (rl) return withCors(rl, request);
      return withCors(await handleRequestWithdrawal(request, env), request);
    }

    if (url.pathname === "/api/settings" && request.method === "GET") {
      return withCors(await handleGetSettings(request, env), request);
    }
    if (url.pathname === "/api/settings" && request.method === "PUT") {
      return withCors(await handleUpdateAccountSettings(request, env), request);
    }
    if (url.pathname === "/api/account/password" && request.method === "POST") {
      const rl = await limited(request, env, "chgpwd", 10, 3600);
      if (rl) return withCors(rl, request);
      return withCors(await handleChangePassword(request, env), request);
    }

    if (url.pathname === "/api/marketing/generate" && request.method === "POST") {
      const gate = await checkQuota(request, env, "marketing");
      if (gate.blocked) return withCors(gate.blocked, request);
      const res = await handleGenerateMarketing(request, env);
      if (res.ok) await recordUsage(env, gate.userId, "marketing", gate.period);
      return withCors(res, request);
    }

    if (url.pathname === "/api/formations" && request.method === "GET") {
      return withCors(await handleListFormations(request, env), request);
    }
    if (url.pathname === "/api/formations" && request.method === "POST") {
      const body = await bodyOf(request);
      const lock = await checkFeature(request, env, "language", body?.language || "fr");
      if (lock) return withCors(lock, request);
      const gate = await checkQuota(request, env, "formation");
      if (gate.blocked) return withCors(gate.blocked, request);
      const res = await handleCreateFormation(request, env);
      if (res.ok) await recordUsage(env, gate.userId, "formation", gate.period);
      return withCors(res, request);
    }
    if (url.pathname.startsWith("/api/formations/")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const formationId = parts[2];

      if (parts.length === 4 && parts[3] === "style") {
        if (request.method === "GET") {
          return withCors(await handleGetFormationStyle(request, env, formationId), request);
        }
        if (request.method === "PUT") {
          const body = await bodyOf(request);
          const lock = await checkFeature(request, env, "formation_template", body?.template);
          if (lock) return withCors(lock, request);
          return withCors(await handleSetFormationTemplate(request, env, formationId), request);
        }
      }

      if (parts.length === 3) {
        if (request.method === "GET") {
          return withCors(await handleGetFormation(request, env, formationId), request);
        }
        if (request.method === "PUT") {
          const body = await bodyOf(request);
          if (body?.certificate) {
            const lock = await checkFeature(request, env, "certificate");
            if (lock) return withCors(lock, request);
          }
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

    // ===== STYLE, MARQUE ET IDÉES =====
    if (url.pathname === "/api/brand" && request.method === "GET") {
      return withCors(await handleGetBrand(request, env), request);
    }
    if (url.pathname === "/api/braand" && request.method === "GET") {
      return withCors(await handleGetBrand(request, env), request);
    }
    if (url.pathname === "/api/brand" && request.method === "PUT") {
      const body = await bodyOf(request);
      if (body?.default_template) {
        const lock = await checkFeature(request, env, "ebook_template", body.default_template);
        if (lock) return withCors(lock, request);
      }
      return withCors(await handleSaveBrand(request, env), request);
    }
    if (url.pathname === "/api/ideas" && request.method === "POST") {
      const lock = await checkFeature(request, env, "ideas");
      if (lock) return withCors(lock, request);
      const rl = await limited(request, env, "ideas", 20, 3600);
      if (rl) return withCors(rl, request);
      return withCors(await handleIdeas(request, env), request);
    }

    return withCors(
      Response.json({ error: "Route non trouvée" }, { status: 404 }),
      request
    );
  } catch (err) {
    // On garde le détail dans les journaux, jamais dans la réponse
    console.error("Erreur serveur", url.pathname, err?.message);
    return withCors(Response.json({ error: "Erreur serveur" }, { status: 500 }), request);
  }
}

export default {
  async fetch(request, env, ctx) {
    const res = await route(request, env, ctx);
    return secure(res);
  },
};
