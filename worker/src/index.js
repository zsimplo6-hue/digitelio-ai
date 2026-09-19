import { getCorsHeaders, withCors } from "./utils/cors.js";
import {
  handleSignup,
  handleLogin,
  handleMe,
  handleLogout,
  handleGoogleLogin,
  handleGoogleCallback,
} from "./routes/auth.js";
import { handleGenerateEbook, handleListEbooks } from "./routes/ebooks.js";

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
      // 🔧 ROUTE DE TEST TEMPORAIRE — à retirer après debug
      if (url.pathname === "/api/test/ai" && request.method === "GET") {
        try {
          const testResponse = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
            messages: [{ role: "user", content: "Dis juste bonjour." }],
            max_tokens: 50,
          });
          return Response.json({ success: true, result: testResponse });
        } catch (err) {
          return Response.json({ success: false, error: err.message, stack: err.stack });
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
