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
      {
        role: "system",
        content:
          "Tu es un auteur et éditeur professionnel d'eBooks premium : style clair, concret, structuré, sans remplissage. Tu respectes strictement le format demandé.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: maxTokens,
  });
  return response.response || "";
}

/* ===== Libellés selon la langue ===== */

function labelsFor(language) {
  if (language === "en") {
    return {
      lang: "English",
      takeaway: "Key takeaway",
      practice: "Put it into practice",
      next: "Your next steps",
      learn: "What you will learn",
      introSummary: "Present the topic, the promise of the book and how to use it.",
      conclusionSummary: "Summarize the essentials and give the next steps.",
    };
  }
  return {
    lang: "français",
    takeaway: "À retenir",
    practice: "À mettre en pratique",
    next: "Vos prochaines étapes",
    learn: "Ce que vous allez apprendre",
    introSummary: "Présenter le sujet, la promesse du livre et la façon de l'utiliser.",
    conclusionSummary: "Résumer l'essentiel et donner les prochaines étapes.",
  };
}

/* La description peut contenir des consignes de style ou du Markdown : on garde seulement le sujet */
function cleanDescription(text) {
  let t = String(text || "");
  t = t.split(/style\s+souhait[ée]/i)[0];
  t = t.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "");
  t = t.replace(/[#*_`>]+/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t.slice(0, 1200);
}

function stripChapterPrefix(title) {
  return String(title || "").replace(/^Chapitre\s*\d+\s*:\s*/i, "").trim();
}

/* Nettoie le texte renvoyé par l'IA : titres uniformisés, pas d'émojis, pas de blocs de code */
function cleanAiText(raw) {
  let t = String(raw || "").replace(/\r/g, "").trim();
  t = t.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "").trim();
  t = t.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "");

  const out = [];
  let seenContent = false;
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*(#{1,6})\s+(.*)$/);
    if (m) {
      const text = m[2].replace(/\*\*/g, "").trim();
      // un titre de niveau 1 ou 2 en première ligne répète presque toujours le titre du chapitre : on le retire
      if (!seenContent && m[1].length <= 2) continue;
      out.push(`### ${text}`);
      seenContent = true;
      continue;
    }
    if (line.trim() !== "") seenContent = true;
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* ===== Accroche courte pour la couverture ===== */

function cleanTagline(raw, max = 220) {
  let t = String(raw || "").replace(/\r/g, "").trim();
  t = t.split("\n").find((l) => l.trim()) || "";
  t = t.replace(/^(accroche|tagline|description|hook)\s*:\s*/i, "");
  t = t.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "");
  t = t.replace(/[#*_`>"«»]+/g, "");
  t = t.replace(/\s+/g, " ").trim();
  if (t.length > max) {
    const cut = t.slice(0, max);
    const lastEnd = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
    if (lastEnd > 80) {
      t = cut.slice(0, lastEnd + 1);
    } else {
      const sp = cut.lastIndexOf(" ");
      t = (sp > 80 ? cut.slice(0, sp) : cut).replace(/[\s,;:.\-–]+$/, "") + "…";
    }
  }
  return t.length >= 20 ? t : "";
}

async function makeTagline(env, title, subject, lbl, language) {
  try {
    const youRule =
      language === "en"
        ? "Address the reader directly with \"you\"."
        : "Vouvoie le lecteur.";
    const prompt = `Tu es un copywriter expert. Transforme la description ci-dessous en une accroche courte et virale pour la couverture d'un eBook.

Titre : "${title}"
Description fournie : ${subject}
Langue : ${lbl.lang}.

Règles :
- 1 ou 2 phrases, 140 caractères idéalement, 200 maximum.
- Commence par un bénéfice concret ou une promesse claire pour le lecteur, et donne envie de lire.
- ${youRule}
- Ne répète pas le titre. N'invente aucun chiffre, délai, résultat garanti ou témoignage qui ne figure pas dans la description.
- Aucun emoji, aucun hashtag, aucun guillemet, aucune mise en forme.
- Réponds uniquement avec l'accroche, sans introduction.`;
    const raw = await askAI(env, prompt, 150);
    return cleanTagline(raw);
  } catch {
    return "";
  }
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

/* Plan vide : les parties sont rédigées ensuite, une par une */
export function buildPlanSections(chapters, lbl) {
  const sections = [
    { id: "intro", type: "intro", title: "Introduction", summary: lbl.introSummary, content: "", image: "" },
  ];
  chapters.forEach((ch, i) => {
    sections.push({
      id: `chapter-${i}`,
      type: "chapter",
      title: `Chapitre ${i + 1} : ${ch.title}`,
      summary: ch.summary || "",
      content: "",
      image: "",
    });
  });
  sections.push({
    id: "conclusion",
    type: "conclusion",
    title: "Conclusion",
    summary: lbl.conclusionSummary,
    content: "",
    image: "",
  });
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

function loadSections(row) {
  let sections = null;
  if (row.sections_json) {
    try {
      sections = JSON.parse(row.sections_json);
    } catch {
      sections = null;
    }
  }
  if (!sections) sections = parseContentToSections(row.content);
  return sections;
}

/* Lit les lignes "1. Titre | Résumé" du plan renvoyé par l'IA */
function parsePlan(text, max) {
  const items = [];
  for (const line of String(text || "").split("\n")) {
    const m = line.match(/^\s*(?:\d+[.)]|[-*])\s*(.+)$/);
    if (!m) continue;
    const [titlePart, ...rest] = m[1].split("|");
    const title = titlePart
      .replace(/\*\*/g, "")
      .replace(/^chapitre\s*\d+\s*[:\-–]\s*/i, "")
      .replace(/^["«\s]+|["»\s]+$/g, "")
      .trim();
    const summary = rest.join("|").replace(/\*\*/g, "").trim();
    if (title.length < 3) continue;
    items.push({ title: title.slice(0, 120), summary: summary.slice(0, 240) });
  }
  return items.slice(0, max);
}

/* ===== Étape 1 : création du plan ===== */

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
    return Response.json({ error: "Le titre et la description sont requis." }, { status: 400 });
  }

  const lbl = labelsFor(language);
  const count = Math.min(12, Math.max(3, parseInt(body.chapters, 10) || 8));
  const cleanTitle = String(title).trim().slice(0, 150);
  const subject = cleanDescription(description) || cleanTitle;

  try {
    const planPrompt = `Tu conçois le plan d'un eBook premium intitulé "${cleanTitle}".
Sujet et public visé : ${subject}
Langue de rédaction : ${lbl.lang}.

Crée exactement ${count} chapitres, dans un ordre logique et progressif, sans doublons ni chevauchements. Chaque chapitre a un titre accrocheur de 10 mots maximum et un résumé d'une phrase.

Réponds STRICTEMENT dans ce format, sans aucun texte avant ou après :

##CHAPITRES##
1. Titre du chapitre 1 | Résumé en une phrase
2. Titre du chapitre 2 | Résumé en une phrase`;

    let items = [];
    for (let attempt = 0; attempt < 2 && items.length < 3; attempt++) {
      const planText = await askAI(env, planPrompt, 1400);
      const afterMarker = planText.includes("##CHAPITRES##")
        ? planText.split("##CHAPITRES##")[1]
        : planText;
      items = parsePlan(afterMarker, count);
    }

    if (items.length < 3) {
      return Response.json(
        { error: "Le plan n'a pas pu être créé. Réessayez dans un instant." },
        { status: 502 }
      );
    }

    // Accroche courte pour la couverture (n'empêche jamais la création en cas d'échec)
    const tagline = await makeTagline(env, cleanTitle, subject, lbl, language);

    const sections = buildPlanSections(items, lbl);
    const fullContent = sectionsToContent(cleanTitle, sections);
    const ebookId = generateId();

    await env.DB.prepare(
      `INSERT INTO ebooks (id, user_id, title, description, language, content, sections_json, tagline, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
    )
      .bind(
        ebookId,
        payload.sub,
        cleanTitle,
        description,
        language || "fr",
        fullContent,
        JSON.stringify(sections),
        tagline || null
      )
      .run();

    return Response.json({
      ebook: {
        id: ebookId,
        title: cleanTitle,
        description,
        tagline,
        language,
        content: fullContent,
        sections,
        status: "draft",
      },
    });
  } catch (err) {
    return Response.json(
      { error: "Erreur lors de la génération IA.", details: err.message },
      { status: 502 }
    );
  }
}

/* ===== Étape 2 : rédaction d'une partie ===== */

export async function handleGenerateEbookSection(request, env, ebookId, sectionId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) {
    return Response.json({ error: "Non authentifié." }, { status: 401 });
  }

  const ebook = await env.DB.prepare(
    "SELECT id, title, description, language, content, sections_json FROM ebooks WHERE id = ? AND user_id = ?"
  )
    .bind(ebookId, payload.sub)
    .first();
  if (!ebook) return Response.json({ error: "eBook introuvable." }, { status: 404 });

  const sections = loadSections(ebook);
  const section = sections.find((s) => s.id === sectionId);
  if (!section) return Response.json({ error: "Section introuvable." }, { status: 404 });

  const lbl = labelsFor(ebook.language);
  const chapters = sections.filter((s) => s.type === "chapter");
  const outline = chapters.map((c, i) => `${i + 1}. ${stripChapterPrefix(c.title)}`).join("\n");
  const subject = cleanDescription(ebook.description) || ebook.title;

  // Sous-titres déjà utilisés dans les autres parties, pour éviter les répétitions
  const usedSubtitles = sections
    .filter((s) => s.id !== section.id && (s.content || "").trim())
    .flatMap((s) => [...s.content.matchAll(/^###\s+(.+)$/gm)].map((m) => m[1].trim()))
    .filter((t) => t && t !== lbl.takeaway && t !== lbl.practice && t !== lbl.learn && t !== lbl.next)
    .slice(0, 40);

  const bookInfo = `Livre : "${ebook.title}"
Sujet et public visé : ${subject}
Langue de rédaction : ${lbl.lang}.
Plan complet du livre (pour éviter les répétitions) :
${outline}`;

  const commonRules = `- Vouvoie le lecteur dans tout le texte.
- N'invente ni statistiques, ni pourcentages, ni durées chiffrées, ni études, ni citations de personnes réelles. Les tableaux ne contiennent que des informations qualitatives (types, étapes, outils, critères, exemples).
- Aucun emoji, aucun commentaire sur ta réponse, aucun titre de niveau "#" ou "##".
- Paragraphes courts de 2 à 4 phrases, séparés par une ligne vide.
- Va droit au but : pas de phrases vagues du type "il est essentiel de" ; donne des exemples concrets, des phrases-modèles ou des mini-cas.`;

  let prompt;
  let maxTokens;

  if (section.type === "intro") {
    maxTokens = 1000;
    prompt = `${bookInfo}

Tu rédiges UNIQUEMENT l'introduction du livre, entre 250 et 350 mots.
- Commence par une accroche qui parle du problème du lecteur.
- Explique à qui s'adresse le livre et ce qu'il va y gagner.
- Ajoute un sous-titre "### ${lbl.learn}" suivi d'une liste de 4 à 6 puces ("- ...") qui annoncent les chapitres.
- Termine par une phrase qui donne envie de passer au chapitre 1.
${commonRules}`;
  } else if (section.type === "conclusion") {
    maxTokens = 1000;
    prompt = `${bookInfo}

Tu rédiges UNIQUEMENT la conclusion du livre, entre 200 et 300 mots.
- Résume l'essentiel en 3 ou 4 idées fortes, sans reprendre les chapitres phrase par phrase.
- Encourage le lecteur à passer à l'action.
- Termine par le sous-titre "### ${lbl.next}" suivi d'une checklist de 3 à 5 éléments, chacun sous la forme "- [ ] action concrète".
${commonRules}`;
  } else {
    maxTokens = 2000;
    const number = chapters.findIndex((c) => c.id === section.id) + 1;
    prompt = `${bookInfo}

Tu rédiges UNIQUEMENT le chapitre ${number} : "${stripChapterPrefix(section.title)}".
Objectif du chapitre : ${section.summary || "traiter ce sujet de façon concrète et utile"}.

Contenu :
- 700 à 900 mots, concret, avec des exemples réalistes et des conseils applicables immédiatement.
- Ne répète pas ce que disent les autres chapitres, ne te présente pas, ne conclus pas le livre.
- Inclus au moins un exemple concret ou un mini-cas réaliste, sans chiffres inventés.
- Ces sous-titres sont déjà utilisés dans d'autres chapitres : n'en reprends aucun et choisis des angles différents : ${usedSubtitles.length ? usedSubtitles.join(" ; ") : "(aucun pour le moment)"}.

Mise en forme (Markdown simple, obligatoire) :
- Commence directement par un court paragraphe d'accroche, sans titre.
- 3 à 4 sous-titres commençant par "### ".
- Un encadré clé : une ligne qui commence exactement par "> **${lbl.takeaway} :** " suivie d'une idée forte.
- Un tableau récapitulatif de 3 à 5 lignes, au format :
| Colonne A | Colonne B |
| --- | --- |
| valeur | valeur |
- Une liste à puces ("- ") ou numérotée ("1. ") quand c'est utile.
- Termine par le sous-titre "### ${lbl.practice}" suivi d'une checklist de 3 à 5 éléments, chacun sous la forme "- [ ] action concrète".
${commonRules}`;
  }

  let text;
  try {
    text = cleanAiText(await askAI(env, prompt, maxTokens));
  } catch (err) {
    return Response.json(
      { error: "Erreur lors de la génération IA.", details: err.message },
      { status: 502 }
    );
  }

  if (text.length < 200) {
    return Response.json({ error: "La rédaction a échoué. Réessayez." }, { status: 502 });
  }

  // On relit juste avant d'écrire, pour ne pas écraser une modification faite pendant la rédaction
  const fresh = await env.DB.prepare(
    "SELECT title, content, sections_json FROM ebooks WHERE id = ? AND user_id = ?"
  )
    .bind(ebookId, payload.sub)
    .first();
  if (!fresh) return Response.json({ error: "eBook introuvable." }, { status: 404 });

  const freshSections = loadSections(fresh);
  const idx = freshSections.findIndex((s) => s.id === sectionId);
  if (idx === -1) return Response.json({ error: "Section introuvable." }, { status: 404 });

  freshSections[idx].content = text;
  const newContent = sectionsToContent(fresh.title, freshSections);

  await env.DB.prepare("UPDATE ebooks SET content = ?, sections_json = ? WHERE id = ? AND user_id = ?")
    .bind(newContent, JSON.stringify(freshSections), ebookId, payload.sub)
    .run();

  return Response.json({ section: freshSections[idx] });
}

export async function handleListEbooks(request, env) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) {
    return Response.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { results } = await env.DB.prepare(
    "SELECT id, title, description, language, status, price, currency, created_at FROM ebooks WHERE user_id = ? ORDER BY created_at DESC"
  )
    .bind(payload.sub)
    .all();

  return Response.json({ ebooks: results });
}

async function getPayCodeForEbook(env, ebookId) {
  try {
    const row = await env.DB.prepare(
      "SELECT pay_code FROM product_links WHERE product_type = 'ebook' AND product_id = ? AND active = 1 LIMIT 1"
    )
      .bind(ebookId)
      .first();
    return row?.pay_code || "";
  } catch {
    return "";
  }
}

export async function handleGetEbook(request, env, ebookId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) {
    return Response.json({ error: "Non authentifié." }, { status: 401 });
  }

  const ebook = await env.DB.prepare(
    `SELECT id, title, description, tagline, language, content, sections_json, status,
            price, currency, cover_url, published_at, created_at
     FROM ebooks WHERE id = ? AND user_id = ?`
  )
    .bind(ebookId, payload.sub)
    .first();

  if (!ebook) {
    return Response.json({ error: "eBook introuvable." }, { status: 404 });
  }

  const sections = loadSections(ebook);
  const payCode = await getPayCodeForEbook(env, ebookId);

  const { sections_json, ...rest } = ebook;
  return Response.json({
    ebook: { ...rest, currency: rest.currency || "EUR", pay_code: payCode, sections },
  });
    }
