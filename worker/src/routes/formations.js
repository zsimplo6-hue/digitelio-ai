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
          "Tu es un concepteur pédagogique expert en création de formations en ligne vendables et structurées. Tu écris dans la langue demandée.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: maxTokens,
  });
  return response.response || "";
}

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

  try {
    const prompt = `Tu conçois une formation en ligne sur le sujet : "${topic}". Rédige TOUT (titre, accroche, titres et résumés des modules) uniquement en ${langLabel}, même si ces consignes sont en français.

Crée exactement 5 modules dans cet ordre logique (traduis les intitulés en ${langLabel}) :
1. ${L.modules[0]}
2. ${L.modules[1]}
3. ${L.modules[2]}
4. ${L.modules[3]}
5. ${L.modules[4]}
Adapte le contenu de chaque module au sujet.

Réponds STRICTEMENT dans ce format, sans texte avant ou après (les marqueurs ##TITRE##, ##DESCRIPTION## et ##MODULES## restent tels quels) :

##TITRE##
(titre accrocheur de la formation, sur une ligne)
##DESCRIPTION##
(une accroche courte et percutante de 1 à 2 phrases, 200 caractères maximum, qui promet un bénéfice concret au lecteur et donne envie de suivre la formation. ${L.you} Ne répète pas le titre. N'invente ni chiffre, ni délai, ni résultat garanti. Aucun emoji.)
##MODULES##
1. Titre du module | résumé en une phrase
2. Titre du module | résumé en une phrase
3. Titre du module | résumé en une phrase
4. Titre du module | résumé en une phrase
5. ${L.modules[4]} | résumé en une phrase`;

    const text = await askAI(env, prompt, 1000);

    const titleMatch = text.match(/##TITRE##([\s\S]*?)##DESCRIPTION##/);
    const descMatch = text.match(/##DESCRIPTION##([\s\S]*?)##MODULES##/);
    const modulesMatch = text.match(/##MODULES##([\s\S]*)$/);

    const title = (titleMatch ? titleMatch[1].trim() : "") || topic;
    const description = descMatch ? cleanHook(descMatch[1]) : "";

    let modules = [];
    if (modulesMatch) {
      modules = [...modulesMatch[1].matchAll(/^\s*\d+[.)]\s*(.+)$/gm)]
        .map((m) => {
          const [t, ...rest] = m[1].split("|");
          return { title: t.replace(/\*\*/g, "").trim(), summary: rest.join("|").replace(/\*\*/g, "").trim() };
        })
        .filter((m) => m.title)
        .slice(0, 8);
    }
    if (modules.length < 3) modules = defaultModules(topic, L);

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

  const L = langOf(mod.language);
  const langLabel = L.name;
  const isQuiz = QUIZ_RE.test(mod.title);

  const prompt = isQuiz
    ? `Tu rédiges le dernier module d'une formation en ligne. Rédige TOUT le texte, titres compris, en ${langLabel}, même si ces consignes sont en français.
Formation : "${mod.formation_title}". Sujet : ${mod.topic}. Module : "${mod.title}".

Rédige en Markdown, sans répéter le titre du module :
- une courte introduction (2 à 3 phrases) ;
- ### ${L.quiz} : 5 questions à choix multiples (A, B, C), puis ### ${L.answers} avec les bonnes réponses ;
- ### ${L.conclusion} : environ 100 mots qui résument les acquis ;
- ### ${L.plan} : 4 à 5 puces concrètes pour passer à l'action.`
    : `Tu rédiges la leçon d'un module de formation en ligne. Rédige TOUT le texte, titres compris, en ${langLabel}, même si ces consignes sont en français.
Formation : "${mod.formation_title}". Sujet : ${mod.topic}.
Module : "${mod.title}". Objectif du module : ${mod.summary || mod.title}.

Rédige la leçon complète en Markdown, entre 400 et 600 mots, sans répéter le titre du module :
- une introduction de 2 à 3 phrases ;
- 2 à 3 sous-parties avec des titres commençant par "### " et des paragraphes clairs, avec des exemples concrets ;
- ### ${L.exercise} : un exercice réalisable par l'apprenant ;
- ### ${L.summary} : 3 à 4 puces qui reprennent l'essentiel.`;

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
