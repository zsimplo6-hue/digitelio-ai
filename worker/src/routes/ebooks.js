import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";

function generateId() {
  return crypto.randomUUID();
}

async function getAuthenticatedUser(request, env) {
  const cookies = parseCookies(request);
  const token = cookies["digitelio_session"];
  if (!token) return null;

  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return null;

  return payload;
}

export async function handleGenerateEbook(request, env) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) {
    return Response.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { title, description, language } = body;
  if (!title || !description) {
    return Response.json(
      { error: "Le titre et la description sont requis." },
      { status: 400 }
    );
  }

  const langLabel = language === "en" ? "English" : "français";

  const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Rédige le plan détaillé et l'introduction d'un eBook en ${langLabel}, intitulé "${title}". Description du sujet : ${description}. Structure la réponse avec une introduction complète et un sommaire détaillé en chapitres.`,
        },
      ],
    }),
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    return Response.json(
      { error: "Erreur lors de la génération IA.", details: errText },
      { status: 502 }
    );
  }

  const aiData = await aiResponse.json();
  const content = aiData.content?.[0]?.text || "";

  const ebookId = generateId();

  await env.DB.prepare(
    `INSERT INTO ebooks (id, user_id, title, description, language, content, status)
     VALUES (?, ?, ?, ?, ?, ?, 'draft')`
  )
    .bind(ebookId, payload.sub, title, description, language || "fr", content)
    .run();

  return Response.json({
    ebook: { id: ebookId, title, description, language, content, status: "draft" },
  });
}

export async function handleListEbooks(request, env) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) {
    return Response.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { results } = await env.DB.prepare(
    "SELECT id, title, description, language, status, created_at FROM ebooks WHERE user_id = ? ORDER BY created_at DESC"
  )
    .bind(payload.sub)
    .all();

  return Response.json({ ebooks: results });
      }
