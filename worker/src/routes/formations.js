import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";

async function getAuthenticatedUser(request, env) {
  const cookies = parseCookies(request);
  const token = cookies["digitelio_session"];
  if (!token) return null;
  return await verifyJWT(token, env.JWT_SECRET);
}

const unauthorized = () => Response.json({ error: "Non authentifié." }, { status: 401 });

async function askAI(env, prompt, maxTokens) {
  const response = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    messages: [
      {
        role: "system",
        content:
          "Tu es un concepteur pédagogique expert en création de formations en ligne vendables et structurées.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: maxTokens,
  });
  return response.response || "";
}

function defaultModules(topic) {
  return [
    { title: "Introduction", summary: `Présentation de l'objectif et du parcours : ${topic}.` },
    { title: "Les bases", summary: "Les notions essentielles à maîtriser avant de démarrer." },
    { title: "Mise en pratique", summary: "Étapes concrètes et exercices guidés." },
    { title: "Stratégies avancées", summary: "Techniques pour aller plus loin et optimiser les résultats." },
    { title: "Quiz & Conclusion", summary: "Vérification des acquis et plan d'action final." },
  ];
}

function parseResources(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

const isHttpUrl = (s) => /^https?:\/\/\S+$/i.test(s);

export async function handleCreateFormation(request, env) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const body = await request.json().catch(() => null);
  const topic = (body?.topic || "").trim();
  const language = body?.language === "en" ? "en" : "fr";
  if (topic.length < 5) {
    return Response.json({ error: "Le sujet est trop court." }, { status: 400 });
  }

  const langLabel = language === "en" ? "English" : "français";

  try {
    const prompt = `Tu conçois une formation en ligne sur le sujet : "${topic}". Réponds uniquement en ${langLabel}.

Crée exactement 5 modules dans cet ordre logique :
1. Introduction
2. Les bases
3. Mise en pratique
4. Stratégies avancées
5. Quiz & Conclusion
Adapte le contenu de chaque module au sujet.

Réponds STRICTEMENT dans ce format, sans texte avant ou après :

##TITRE##
(titre accrocheur de la formation, sur une ligne)
##DESCRIPTION##
(2 phrases qui présentent la promesse de la formation)
##MODULES##
1. Titre du module | résumé en une phrase
2. Titre du module | résumé en une phrase
3. Titre du module | résumé en une phrase
4. Titre du module | résumé en une phrase
5. Quiz & Conclusion | résumé en une phrase`;

    const text = await askAI(env, prompt, 900);

    const titleMatch = text.match(/##TITRE##([\s\S]*?)##DESCRIPTION##/);
    const descMatch = text.match(/##DESCRIPTION##([\s\S]*?)##MODULES##/);
    const modulesMatch = text.match(/##MODULES##([\s\S]*)$/);

    const title = (titleMatch ? titleMatch[1].trim() : "") || topic;
    const description = descMatch ? descMatch[1].trim() : "";

    let modules = [];
    if (modulesMatch) {
      modules = [...modulesMatch[1].matchAll(/^\s*\d+\.\s*(.+)$/gm)]
        .map((m) => {
          const [t, ...rest] = m[1].split("|");
          return { title: t.trim(), summary: rest.join("|").trim() };
        })
        .filter((m) => m.title)
        .slice(0, 8);
    }
    if (modules.length < 3) modules = defaultModules(topic);

    const formationId = crypto.randomUUID();
    const statements = [
      env.DB.prepare(
        `INSERT INTO formations (id, user_id, title, description, topic, language, status)
         VALUES (?, ?, ?, ?, ?, ?, 'draft')`
      ).bind(formationId, payload.sub, title, description, topic, language),
    ];

    const savedModules = modules.map((m) => ({
      id: crypto.randomUUID(),
      title: m.title,
      summary: m.summary,
      content: "",
      video_url: "",
      resources: [],
    }));

    savedModules.forEach((m, i) => {
      statements.push(
        env.DB.prepare(
          `INSERT INTO formation_modules (id, formation_id, position, title, summary)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(m.id, formationId, i + 1, m.title, m.summary)
      );
    });

    await env.DB.batch(statements);

    return Response.json({
      formation: {
        id: formationId,
        title,
        description,
        topic,
        language,
        status: "draft",
        modules: savedModules,
      },
    });
  } catch (err) {
    return Response.json(
      { error: "Erreur lors de la génération IA.", details: err.message },
      { status: 502 }
    );
  }
}

export async function handleListFormations(request, env) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const { results } = await env.DB.prepare(
    `SELECT f.id, f.title, f.description, f.status, f.created_at,
            (SELECT COUNT(*) FROM formation_modules m WHERE m.formation_id = f.id) AS modules_count
     FROM formations f
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC`
  )
    .bind(payload.sub)
    .all();

  return Response.json({ formations: results });
}

export async function handleGetFormation(request, env, formationId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const formation = await env.DB.prepare(
    `SELECT id, title, description, topic, language, status, price, cover_url, created_at
     FROM formations WHERE id = ? AND user_id = ?`
  )
    .bind(formationId, payload.sub)
    .first();

  if (!formation) {
    return Response.json({ error: "Formation introuvable." }, { status: 404 });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, position, title, summary, content, video_url, resources
     FROM formation_modules WHERE formation_id = ? ORDER BY position ASC`
  )
    .bind(formationId)
    .all();

  const modules = results.map((m) => ({
    ...m,
    content: m.content || "",
    video_url: m.video_url || "",
    resources: parseResources(m.resources),
  }));

  return Response.json({ formation: { ...formation, modules } });
}

export async function handleDeleteFormation(request, env, formationId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const formation = await env.DB.prepare(
    "SELECT id FROM formations WHERE id = ? AND user_id = ?"
  )
    .bind(formationId, payload.sub)
    .first();

  if (!formation) {
    return Response.json({ error: "Formation introuvable." }, { status: 404 });
  }

  await env.DB.batch([
    env.DB.prepare("DELETE FROM formation_modules WHERE formation_id = ?").bind(formationId),
    env.DB.prepare("DELETE FROM formations WHERE id = ?").bind(formationId),
  ]);

  return Response.json({ success: true });
}

/* ===== ÉTAPE 2 : ÉDITEUR DE LEÇONS ===== */

export async function handleUpdateModule(request, env, formationId, moduleId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const owned = await env.DB.prepare(
    `SELECT m.id FROM formation_modules m
     JOIN formations f ON f.id = m.formation_id
     WHERE m.id = ? AND f.id = ? AND f.user_id = ?`
  )
    .bind(moduleId, formationId, payload.sub)
    .first();

  if (!owned) {
    return Response.json({ error: "Module introuvable." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const content = String(body.content || "").slice(0, 30000);

  const videoUrl = String(body.video_url || "").trim();
  if (videoUrl && (!isHttpUrl(videoUrl) || videoUrl.length > 500)) {
    return Response.json({ error: "Lien vidéo invalide." }, { status: 400 });
  }

  let resources = [];
  if (Array.isArray(body.resources)) {
    for (const r of body.resources.slice(0, 20)) {
      const label = String(r?.label || "").trim().slice(0, 100);
      const url = String(r?.url || "").trim();
      if (!label || !isHttpUrl(url) || url.length > 500) {
        return Response.json(
          { error: "Chaque ressource doit avoir un nom et un lien valide (http...)." },
          { status: 400 }
        );
      }
      resources.push({ label, url });
    }
  }

  await env.DB.prepare(
    "UPDATE formation_modules SET content = ?, video_url = ?, resources = ? WHERE id = ?"
  )
    .bind(content, videoUrl, JSON.stringify(resources), moduleId)
    .run();

  return Response.json({
    module: { id: moduleId, content, video_url: videoUrl, resources },
  });
}

export async function handleGenerateModule(request, env, formationId, moduleId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const mod = await env.DB.prepare(
    `SELECT m.id, m.title, m.summary, f.title AS formation_title, f.topic, f.language
     FROM formation_modules m
     JOIN formations f ON f.id = m.formation_id
     WHERE m.id = ? AND f.id = ? AND f.user_id = ?`
  )
    .bind(moduleId, formationId, payload.sub)
    .first();

  if (!mod) {
    return Response.json({ error: "Module introuvable." }, { status: 404 });
  }

  const langLabel = mod.language === "en" ? "English" : "français";
  const isQuiz = /quiz|conclusion/i.test(mod.title);

  const prompt = isQuiz
    ? `Tu rédiges le dernier module d'une formation en ligne en ${langLabel}.
Formation : "${mod.formation_title}". Sujet : ${mod.topic}. Module : "${mod.title}".

Rédige en Markdown, sans répéter le titre du module :
- une courte introduction (2 à 3 phrases) ;
- ### Quiz : 5 questions à choix multiples (A, B, C), puis ### Corrigé avec les bonnes réponses ;
- ### Conclusion : environ 100 mots qui résument les acquis ;
- ### Plan d'action : 4 à 5 puces concrètes pour passer à l'action.`
    : `Tu rédiges la leçon d'un module de formation en ligne en ${langLabel}.
Formation : "${mod.formation_title}". Sujet : ${mod.topic}.
Module : "${mod.title}". Objectif du module : ${mod.summary || mod.title}.

Rédige la leçon complète en Markdown, entre 400 et 600 mots, sans répéter le titre du module :
- une introduction de 2 à 3 phrases ;
- 2 à 3 sous-parties avec des titres commençant par "### " et des paragraphes clairs, avec des exemples concrets ;
- ### Exercice pratique : un exercice réalisable par l'apprenant ;
- ### Résumé : 3 à 4 puces qui reprennent l'essentiel.`;

  try {
    const content = (await askAI(env, prompt, 1500)).trim();
    if (!content) {
      return Response.json({ error: "L'IA n'a rien renvoyé, réessayez." }, { status: 502 });
    }

    await env.DB.prepare("UPDATE formation_modules SET content = ? WHERE id = ?")
      .bind(content, moduleId)
      .run();

    return Response.json({ module: { id: moduleId, content } });
  } catch (err) {
    return Response.json(
      { error: "Erreur lors de la génération IA.", details: err.message },
      { status: 502 }
    );
  }
}
