import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";
import {
  touchFormation,
  removeFormationMeta,
  sanitizeBrief,
  briefToPrompt,
  ensurePlanTables,
  getBrief,
} from "./formation_manage.js";

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
          "Tu es un concepteur pédagogique expert en création de formations en ligne vendables et structurées. Tu écris dans la langue demandée.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: maxTokens,
  });
  return response.response || "";
}

/* Intitulé de l'encadré « À retenir » selon la langue (même principe que les e-books) */
const TAKEAWAY = {
  fr: "À retenir", en: "Key takeaway", es: "Para recordar", pt: "Para lembrar",
  de: "Das Wichtigste", it: "Da ricordare", ar: "للتذكير",
};

/* ===== Langues prises en charge ===== */
const LANGS = {
  fr: {
    name: "français", you: "Vouvoie le lecteur.",
    modules: ["Introduction", "Les bases", "Mise en pratique", "Stratégies avancées", "Quiz & Conclusion"],
    intro: (t) => `Présentation de l'objectif et du parcours : ${t}.`,
    sums: ["Les notions essentielles à maîtriser avant de démarrer.", "Étapes concrètes et exercices guidés.", "Techniques pour aller plus loin et optimiser les résultats.", "Vérification des acquis et plan d'action final."],
    quiz: "Quiz", answers: "Corrigé", conclusion: "Conclusion", plan: "Plan d'action", exercise: "Exercice pratique", summary: "Résumé",
  },
  en: {
    name: "English", you: 'Address the reader directly with "you".',
    modules: ["Introduction", "The basics", "Putting it into practice", "Advanced strategies", "Quiz & Conclusion"],
    intro: (t) => `Presentation of the goal and the course: ${t}.`,
    sums: ["The essential notions to master before starting.", "Concrete steps and guided exercises.", "Techniques to go further and optimize results.", "Review of what you learned and final action plan."],
    quiz: "Quiz", answers: "Answers", conclusion: "Conclusion", plan: "Action plan", exercise: "Practical exercise", summary: "Summary",
  },
  es: {
    name: "español", you: "Háblale al lector de tú.",
    modules: ["Introducción", "Lo básico", "Puesta en práctica", "Estrategias avanzadas", "Quiz y Conclusión"],
    intro: (t) => `Presentación del objetivo y del recorrido: ${t}.`,
    sums: ["Las nociones esenciales que hay que dominar antes de empezar.", "Pasos concretos y ejercicios guiados.", "Técnicas para ir más lejos y optimizar los resultados.", "Repaso de lo aprendido y plan de acción final."],
    quiz: "Quiz", answers: "Respuestas", conclusion: "Conclusión", plan: "Plan de acción", exercise: "Ejercicio práctico", summary: "Resumen",
  },
  pt: {
    name: "português", you: "Trate o leitor por «você».",
    modules: ["Introdução", "O essencial", "Colocar em prática", "Estratégias avançadas", "Quiz e Conclusão"],
    intro: (t) => `Apresentação do objetivo e do percurso: ${t}.`,
    sums: ["As noções essenciais a dominar antes de começar.", "Etapas concretas e exercícios guiados.", "Técnicas para ir mais longe e otimizar os resultados.", "Revisão do que foi aprendido e plano de ação final."],
    quiz: "Quiz", answers: "Respostas", conclusion: "Conclusão", plan: "Plano de ação", exercise: "Exercício prático", summary: "Resumo",
  },
  de: {
    name: "Deutsch", you: "Sprich den Leser mit «Sie» an.",
    modules: ["Einführung", "Die Grundlagen", "Praktische Umsetzung", "Fortgeschrittene Strategien", "Quiz & Fazit"],
    intro: (t) => `Vorstellung des Ziels und des Kursverlaufs: ${t}.`,
    sums: ["Die wesentlichen Grundlagen vor dem Start.", "Konkrete Schritte und angeleitete Übungen.", "Techniken, um weiterzukommen und Ergebnisse zu optimieren.", "Überprüfung des Gelernten und abschließender Aktionsplan."],
    quiz: "Quiz", answers: "Lösungen", conclusion: "Fazit", plan: "Aktionsplan", exercise: "Praktische Übung", summary: "Zusammenfassung",
  },
  it: {
    name: "italiano", you: "Dai del «tu» al lettore.",
    modules: ["Introduzione", "Le basi", "Messa in pratica", "Strategie avanzate", "Quiz e Conclusione"],
    intro: (t) => `Presentazione dell'obiettivo e del percorso: ${t}.`,
    sums: ["Le nozioni essenziali da padroneggiare prima di iniziare.", "Passi concreti ed esercizi guidati.", "Tecniche per andare oltre e ottimizzare i risultati.", "Verifica di quanto appreso e piano d'azione finale."],
    quiz: "Quiz", answers: "Soluzioni", conclusion: "Conclusione", plan: "Piano d'azione", exercise: "Esercizio pratico", summary: "Riepilogo",
  },
  ar: {
    name: "العربية (arabe standard moderne)", you: "خاطب القارئ مباشرة بصيغة المخاطب.",
    modules: ["المقدمة", "الأساسيات", "التطبيق العملي", "استراتيجيات متقدمة", "اختبار وخاتمة"],
    intro: (t) => `عرض الهدف ومسار الدورة: ${t}.`,
    sums: ["المفاهيم الأساسية التي يجب إتقانها قبل البدء.", "خطوات عملية وتمارين موجّهة.", "تقنيات للتقدم أكثر وتحسين النتائج.", "مراجعة ما تم تعلمه وخطة العمل النهائية."],
    quiz: "اختبار", answers: "الإجابات", conclusion: "الخاتمة", plan: "خطة العمل", exercise: "تمرين عملي", summary: "الملخص",
  },
};

const langOf = (code) => LANGS[code] || LANGS.fr;

const QUIZ_RE = /quiz|conclusion|conclusión|conclusão|fazit|conclusione|اختبار|خاتمة/i;

/* Nettoie une accroche renvoyée par l'IA : une seule ligne, sans symboles ni émojis, 220 caractères maximum */
function cleanHook(raw, max = 220) {
  let t = String(raw || "").replace(/\r/g, " ").replace(/\n+/g, " ");
  t = t.replace(/^(accroche|description|tagline|hook)\s*:\s*/i, "");
  t = t.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "");
  t = t.replace(/[#*_`>"«»]+/g, "");
  t = t.replace(/\s+/g, " ").trim();
  if (t.length > max) {
    const cut = t.slice(0, max);
    const lastEnd = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"), cut.lastIndexOf("؟"));
    if (lastEnd > 80) {
      t = cut.slice(0, lastEnd + 1);
    } else {
      const sp = cut.lastIndexOf(" ");
      t = (sp > 80 ? cut.slice(0, sp) : cut).replace(/[\s,;:.\-–]+$/, "") + "…";
    }
  }
  return t.length >= 20 ? t : "";
}

function defaultModules(topic, L) {
  return [
    { title: L.modules[0], summary: L.intro(topic) },
    { title: L.modules[1], summary: L.sums[0] },
    { title: L.modules[2], summary: L.sums[1] },
    { title: L.modules[3], summary: L.sums[2] },
    { title: L.modules[4], summary: L.sums[3] },
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
  const language = LANGS[body?.language] ? body.language : "fr";
  if (topic.length < 5) {
    return Response.json({ error: "Le sujet est trop court." }, { status: 400 });
  }

  const L = langOf(language);
  const langLabel = L.name;
  const brief = sanitizeBrief(body);
  const briefText = briefToPrompt(brief);
  const wanted = brief.modules_count; // "auto" ou un nombre

  try {
    const countRule =
      wanted === "auto"
        ? "Choisis toi-même le nombre de modules (entre 4 et 8) selon l'ampleur du sujet, le niveau et la durée."
        : `Crée exactement ${wanted} modules.`;

    const prompt = `Tu conçois une formation en ligne sur le sujet : "${topic}". Rédige TOUT (titre, accroche, titres, résumés, objectifs et compétences des modules) uniquement en ${langLabel}, même si ces consignes sont en français.
${briefText ? `\nContexte fourni par le créateur de la formation (à respecter réellement) :\n${briefText}\n` : ""}
${countRule}
Construis une progression pédagogique logique, adaptée au sujet, au public et au niveau : chaque module prépare le suivant. Les titres de modules doivent être précis et propres au sujet (pas d'intitulés génériques). Le premier module pose le cadre et le parcours. Le DERNIER module s'intitule « ${L.modules[4]} » (vérification des acquis et plan d'action).

Réponds STRICTEMENT dans ce format, sans texte avant ou après (les marqueurs ##TITRE##, ##DESCRIPTION## et ##MODULES## restent tels quels) :

##TITRE##
(titre accrocheur de la formation, sur une ligne)
##DESCRIPTION##
(une accroche courte et percutante de 1 à 2 phrases, 200 caractères maximum, qui promet un bénéfice concret au lecteur et donne envie de suivre la formation. ${L.you} Ne répète pas le titre. N'invente ni chiffre, ni délai, ni résultat garanti. Aucun emoji.)
##MODULES##
1. Titre du module | résumé en une phrase | objectif pédagogique en une phrase | compétence 1, compétence 2, compétence 3
2. Titre du module | résumé en une phrase | objectif pédagogique en une phrase | compétence 1, compétence 2, compétence 3
(une ligne par module, numérotée, avec exactement 4 parties séparées par « | »)`;

    const text = await askAI(env, prompt, 2200);

    const titleMatch = text.match(/##TITRE##([\s\S]*?)##DESCRIPTION##/);
    const descMatch = text.match(/##DESCRIPTION##([\s\S]*?)##MODULES##/);
    const modulesMatch = text.match(/##MODULES##([\s\S]*)$/);

    const title = (titleMatch ? titleMatch[1].trim() : "") || topic;
    const description = descMatch ? cleanHook(descMatch[1]) : "";

    const strip = (v) => String(v || "").replace(/\*\*/g, "").trim();
    const maxModules = wanted === "auto" ? 10 : wanted;

    let modules = [];
    if (modulesMatch) {
      modules = [...modulesMatch[1].matchAll(/^\s*\d+[.)]\s*(.+)$/gm)]
        .map((m) => {
          const parts = m[1].split("|").map(strip);
          return {
            title: parts[0] || "",
            summary: parts[1] || "",
            objective: parts[2] || "",
            skills: (parts[3] || "")
              .split(/[,;،]/)
              .map((x) => x.trim())
              .filter(Boolean)
              .slice(0, 6),
          };
        })
        .filter((m) => m.title)
        .slice(0, maxModules);
    }
    if (modules.length < 3) modules = defaultModules(topic, L).map((m) => ({ ...m, objective: "", skills: [] }));

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
      objective: m.objective || "",
      skills: m.skills || [],
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

    /* Paramètres de création, objectifs et compétences : stockés à part (ne bloque jamais la création) */
    let savedBrief = null;
    try {
      await ensurePlanTables(env);
      const extra = [
        env.DB.prepare(
          "INSERT INTO formation_brief (formation_id, user_id, brief_json) VALUES (?, ?, ?)"
        ).bind(formationId, payload.sub, JSON.stringify(brief)),
      ];
      savedModules.forEach((m) => {
        extra.push(
          env.DB.prepare(
            "INSERT INTO formation_module_meta (module_id, formation_id, objective, skills) VALUES (?, ?, ?, ?)"
          ).bind(m.id, formationId, m.objective, JSON.stringify(m.skills))
        );
      });
      await env.DB.batch(extra);
      savedBrief = brief;
    } catch {
      /* la formation existe et reste utilisable sans ces informations */
    }
    await touchFormation(env, formationId, payload.sub);

    return Response.json({
      formation: {
        id: formationId,
        title,
        description,
        topic,
        language,
        status: "draft",
        brief: savedBrief,
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
  await removeFormationMeta(env, formationId);

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

  /* Ressources : image (data URL), vidéo (lien YouTube/Vimeo) ou lien simple */
  let resources = [];
  let imageBudget = 0;
  if (Array.isArray(body.resources)) {
    for (const r of body.resources.slice(0, 20)) {
      const url = String(r?.url || "").trim();
      const label = String(r?.label || "").trim().slice(0, 100);

      if (r?.type === "image" || url.startsWith("data:image/")) {
        const okFormat = /^data:image\/(jpeg|png|webp);base64,/.test(url);
        imageBudget += url.length;
        if (!okFormat || url.length > 400000 || imageBudget > 1200000) {
          return Response.json(
            { error: "Image invalide ou trop lourde (3 images par leçon environ)." },
            { status: 400 }
          );
        }
        const alt = String(r?.alt || "").trim().slice(0, 200);
        resources.push({ type: "image", label: label || "Image", alt, url });
        continue;
      }

      if (r?.type === "video") {
        if (!isHttpUrl(url) || url.length > 500) {
          return Response.json({ error: "Lien vidéo invalide (http...)." }, { status: 400 });
        }
        resources.push({ type: "video", label: label || "Vidéo", url });
        continue;
      }

      if (!label || !isHttpUrl(url) || url.length > 500) {
        return Response.json(
          { error: "Chaque ressource doit avoir un nom et un lien valide (http...)." },
          { status: 400 }
        );
      }
      resources.push({ type: "link", label, url });
    }
  }

  await env.DB.prepare(
    "UPDATE formation_modules SET content = ?, video_url = ?, resources = ? WHERE id = ?"
  )
    .bind(content, videoUrl, JSON.stringify(resources), moduleId)
    .run();
  await touchFormation(env, formationId, payload.sub);

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

  const L = langOf(mod.language);
  const langLabel = L.name;
  const isQuiz = QUIZ_RE.test(mod.title);
  const takeLbl = TAKEAWAY[mod.language] || TAKEAWAY.fr;

  /* Contexte de la formation (public, niveau, ton...) et objectif / compétences du module */
  let context = "";
  try {
    await ensurePlanTables(env);
    const brief = await getBrief(env, formationId);
    const meta = await env.DB.prepare(
      "SELECT objective, skills FROM formation_module_meta WHERE module_id = ?"
    )
      .bind(moduleId)
      .first();
    const lines = [];
    const bt = briefToPrompt(brief);
    if (bt) lines.push(bt);
    if (meta?.objective) lines.push(`Objectif pédagogique du module : ${meta.objective}`);
    try {
      const sk = JSON.parse(meta?.skills || "[]");
      if (Array.isArray(sk) && sk.length) lines.push(`Compétences à acquérir : ${sk.join(", ")}.`);
    } catch {
      /* ignoré */
    }
    if (lines.length) context = `\nContexte à respecter :\n${lines.join("\n")}\n`;
  } catch {
    /* sans contexte, la génération fonctionne comme avant */
  }

  const prompt = isQuiz
    ? `Tu rédiges le dernier module d'une formation en ligne. Rédige TOUT le texte, titres compris, en ${langLabel}, même si ces consignes sont en français.
Formation : "${mod.formation_title}". Sujet : ${mod.topic}. Module : "${mod.title}".
${context}
Rédige en Markdown, sans répéter le titre du module :
- une courte introduction (2 à 3 phrases) ;
- ### ${L.quiz} : 5 questions à choix multiples (A, B, C), puis ### ${L.answers} avec les bonnes réponses ;
- ### ${L.conclusion} : environ 100 mots qui résument les acquis ;
- ### ${L.plan} : 4 à 5 puces concrètes pour passer à l'action.`
    : `Tu rédiges la leçon d'un module de formation en ligne. Rédige TOUT le texte, titres compris, en ${langLabel}, même si ces consignes sont en français.
Formation : "${mod.formation_title}". Sujet : ${mod.topic}.
Module : "${mod.title}". Objectif du module : ${mod.summary || mod.title}.
${context}
Rédige la leçon complète en Markdown, entre 450 et 650 mots, sans répéter le titre du module :
- une introduction de 2 à 3 phrases ;
- 2 à 3 sous-parties avec des titres commençant par "### " et des paragraphes clairs, avec des exemples concrets ;
- un encadré clé : une ligne qui commence exactement par "> **${takeLbl} :** " suivie d'une idée forte ;
- un tableau récapitulatif de 3 à 5 lignes quand c'est utile, au format :
| Colonne A | Colonne B |
| --- | --- |
| valeur | valeur |
- ### ${L.exercise} : un exercice réalisable par l'apprenant ;
- pour terminer, un encadré de résumé : une première ligne "> **${L.summary} :**" puis 3 à 4 lignes qui commencent chacune par "> - " et reprennent l'essentiel.`;

  try {
    const content = (await askAI(env, prompt, isQuiz ? 1500 : 2200)).trim();
    if (!content) {
      return Response.json({ error: "L'IA n'a rien renvoyé, réessayez." }, { status: 502 });
    }

    await env.DB.prepare("UPDATE formation_modules SET content = ? WHERE id = ?")
      .bind(content, moduleId)
      .run();
    await touchFormation(env, formationId, payload.sub);

    return Response.json({ module: { id: moduleId, content } });
  } catch (err) {
    return Response.json(
      { error: "Erreur lors de la génération IA.", details: err.message },
      { status: 502 }
    );
  }
  }
