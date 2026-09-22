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

async function askAI(env, prompt, maxTokens) {
  const response = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    messages: [
      { role: "system", content: "Tu es un auteur professionnel spécialisé dans la rédaction d'eBooks vendables et structurés." },
      { role: "user", content: prompt },
    ],
    max_tokens: maxTokens,
  });
  return response.response || "";
}

/* ===== Structure en parties modifiables (intro, chapitres, conclusion) ===== */

export function buildSections(introduction, chapters, conclusion) {
  const sections = [
    { id: "intro", type: "intro", title: "Introduction", content: (introduction || "").trim(), image: "" },
  ];
  chapters.forEach((ch, i) => {
    sections.push({
      id: `chapter-${i}`,
      type: "chapter",
      title: `Chapitre ${i + 1} : ${ch.title}`,
      content: (ch.content || "").trim(),
      image: "",
    });
  });
  sections.push({ id: "conclusion", type: "conclusion", title: "Conclusion", content: (conclusion || "").trim(), image: "" });
  return sections;
}

export function sectionsToContent(title, sections) {
  let content = `# ${title}\n\n`;
  for (const s of sections) {
    content += `## ${s.title}\n\n${s.content}\n\n`;
  }
  return content;
}

/* Reconstruit les parties à partir du texte markdown, pour les eBooks créés avant cette mise à jour */
export function parseContentToSections(content) {
  const rawChapters = String(content || "").split(/^## /m).slice(1);
  return rawChapters.map((raw, i) => {
    const lines = raw.split("\n");
    const title = (lines[0] || "").trim();
    const body = lines.slice(1).join("\n").trim();
    const isIntro = /^Introduction/i.test(title);
    const isConclusion = /^Conclusion/i.test(title);
    const type = isIntro ? "intro" : isConclusion ? "conclusion" : "chapter";
    const id = isIntro ? "intro" : isConclusion ? "conclusion" : `chapter-${i - 1}`;
    return { id, type, title, content: body, image: "" };
  });
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

  try {
    // Étape 1 — Génération du plan (intro + chapitres + conclusion)
    const planPrompt = `Tu structures un eBook intitulé "${title}" sur le sujet suivant : ${description}. Réponds uniquement en ${langLabel}.

Choisis un nombre de chapitres pertinent, entre 1 et 5, selon la complexité du sujet.

Réponds STRICTEMENT dans ce format, sans aucun texte avant ou après :

##INTRODUCTION##
(rédige ici une introduction complète de 200 à 300 mots qui présente le sujet et donne envie de lire le livre)
##CHAPITRES##
1. (titre du chapitre 1)
2. (titre du chapitre 2, si pertinent)
##CONCLUSION##
(rédige ici une conclusion de 150 à 250 mots qui résume les apports du livre et incite le lecteur à passer à l'action)`;

    const planText = await askAI(env, planPrompt, 1200);

    const introMatch = planText.match(/##INTRODUCTION##([\s\S]*?)##CHAPITRES##/);
    const chaptersMatch = planText.match(/##CHAPITRES##([\s\S]*?)##CONCLUSION##/);
    const conclusionMatch = planText.match(/##CONCLUSION##([\s\S]*)$/);

    const introduction = introMatch ? introMatch[1].trim() : "";
    const conclusion = conclusionMatch ? conclusionMatch[1].trim() : "";

    let chapterTitles = [];
    if (chaptersMatch) {
      chapterTitles = [...chaptersMatch[1].matchAll(/^\s*\d+\.\s*(.+)$/gm)].map((m) =>
        m[1].trim()
      );
    }

    // Sécurité : si le parsing échoue, on a au moins un chapitre par défaut
    if (chapterTitles.length === 0) {
      chapterTitles = ["Développement du sujet"];
    }
    chapterTitles = chapterTitles.slice(0, 5);

    // Étape 2 — Rédaction complète de chaque chapitre
    const chapters = [];
    for (const chapterTitle of chapterTitles) {
      const chapterPrompt = `Tu rédiges un chapitre d'eBook professionnel en ${langLabel}. Titre du livre : "${title}". Sujet global : ${description}. Rédige intégralement le chapitre intitulé "${chapterTitle}", entre 300 et 500 mots, avec un contenu concret et structuré en paragraphes clairs. Ne répète pas le titre du chapitre dans le texte, commence directement par le contenu.`;

      const chapterContent = await askAI(env, chapterPrompt, 800);
      chapters.push({ title: chapterTitle, content: chapterContent.trim() });
    }

    // Étape 3 — Assemblage du contenu final en Markdown
    let fullContent = `# ${title}\n\n## Introduction\n\n${introduction}\n\n`;
    chapters.forEach((ch, i) => {
      fullContent += `## Chapitre ${i + 1} : ${ch.title}\n\n${ch.content}\n\n`;
    });
    fullContent += `## Conclusion\n\n${conclusion}\n`;

    // Étape 4 — Structure en parties modifiables
    const sections = buildSections(introduction, chapters, conclusion);

    const ebookId = generateId();

    await env.DB.prepare(
      `INSERT INTO ebooks (id, user_id, title, description, language, content, sections_json, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`
    )
      .bind(ebookId, payload.sub, title, description, language || "fr", fullContent, JSON.stringify(sections))
      .run();

    return Response.json({
      ebook: { id: ebookId, title, description, language, content: fullContent, sections, status: "draft" },
    });
  } catch (err) {
    return Response.json(
      { error: "Erreur lors de la génération IA.", details: err.message },
      { status: 502 }
    );
  }
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

export async function handleGetEbook(request, env, ebookId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) {
    return Response.json({ error: "Non authentifié." }, { status: 401 });
  }

  const ebook = await env.DB.prepare(
    "SELECT id, title, description, language, content, sections_json, status, created_at FROM ebooks WHERE id = ? AND user_id = ?"
  )
    .bind(ebookId, payload.sub)
    .first();

  if (!ebook) {
    return Response.json({ error: "eBook introuvable." }, { status: 404 });
  }

  let sections = null;
  if (ebook.sections_json) {
    try {
      sections = JSON.parse(ebook.sections_json);
    } catch {
      sections = null;
    }
  }
  if (!sections) sections = parseContentToSections(ebook.content);

  const { sections_json, ...rest } = ebook;
  return Response.json({ ebook: { ...rest, sections } });
      }
