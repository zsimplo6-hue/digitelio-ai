import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";

async function getAuthenticatedUser(request, env) {
  const cookies = parseCookies(request);
  const token = cookies["digitelio_session"];
  if (!token) return null;
  return await verifyJWT(token, env.JWT_SECRET);
}

const unauthorized = () => Response.json({ error: "Non authentifié." }, { status: 401 });

/* La description peut contenir des consignes de style ou du Markdown : on garde seulement le sujet */
function cleanDescription(text) {
  let t = String(text || "");
  t = t.split(/style\s+souhait[ée]/i)[0];
  t = t.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "");
  t = t.replace(/[#*_`>]+/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t.slice(0, 500);
}

function stripChapterPrefix(title) {
  return String(title || "").replace(/^Chapitre\s*\d+\s*:\s*/i, "").trim();
}

function chaptersOfEbook(row) {
  let sections = null;
  if (row.sections_json) {
    try {
      sections = JSON.parse(row.sections_json);
    } catch {
      sections = null;
    }
  }
  if (Array.isArray(sections)) {
    return sections
      .filter((s) => s.type === "chapter")
      .map((s) => ({ title: stripChapterPrefix(s.title), summary: s.summary || "" }));
  }
  return [...String(row.content || "").matchAll(/^## Chapitre\s*\d+\s*:\s*(.+)$/gm)].map((m) => ({
    title: m[1].trim(),
    summary: "",
  }));
}

const TYPES = {
  post: {
    tokens: 400,
    instruction: `Rédige UN post court pour les réseaux sociaux (Facebook, Instagram, LinkedIn), de 60 à 100 mots :
- ligne 1 : une accroche qui donne envie de lire la suite (une promesse concrète ou une question sur le problème du lecteur) ;
- 3 lignes courtes, chacune avec un bénéfice concret tiré des informations ;
- une ligne d'appel à l'action, avec le lien et le prix s'ils sont fournis ;
- une dernière ligne de 3 à 5 hashtags.
2 ou 3 émojis maximum.`,
  },
  tiktok: {
    tokens: 600,
    instruction: `Rédige le script d'une vidéo courte TikTok / Reels de 30 à 40 secondes, avec des phrases de 12 mots maximum, faciles à dire à voix haute, dans ce format :
ACCROCHE (0-3 s) : la phrase qui arrête le défilement ;
DÉVELOPPEMENT : 3 points, une phrase chacun ;
APPEL À L'ACTION : ce que le spectateur doit faire ;
TEXTE À L'ÉCRAN : 3 courts textes ;
LÉGENDE : une légende de publication avec 4 hashtags.`,
  },
  whatsapp: {
    tokens: 300,
    instruction: `Rédige un message WhatsApp court (50 à 90 mots) à envoyer à un contact ou à publier en statut :
- une salutation naturelle ;
- ce que le produit permet d'obtenir, en 2 phrases simples ;
- le prix et le lien s'ils sont fournis ;
- une question qui invite à répondre.
Ton conversationnel, 2 émojis maximum.`,
  },
  email: {
    tokens: 700,
    instruction: `Rédige un email de vente court (120 à 180 mots) :
OBJET : moins de 50 caractères ;
PRÉ-TITRE : une phrase d'aperçu ;
CORPS : une accroche, le problème du lecteur, la solution, 3 bénéfices sous forme de liste avec des tirets, le prix et le lien s'ils sont fournis, un appel à l'action clair ;
SIGNATURE : le nom de l'auteur ou du formateur s'il est fourni.`,
  },
  hooks: {
    tokens: 400,
    instruction: `Propose 10 accroches différentes, numérotées de 1 à 10.
Varie les angles : une question, un problème courant, une promesse mesurée, une curiosité, une comparaison, une erreur à éviter.
Chaque accroche fait une seule phrase de 15 mots maximum, utilisable en première ligne d'un post ou d'une vidéo.`,
  },
};

const TONES = {
  professionnel: "professionnel, clair et rassurant",
  amical: "amical, chaleureux, proche du lecteur",
  energique: "énergique, dynamique et motivant",
  inspirant: "inspirant, positif, tourné vers la progression personnelle",
};

export async function handleGenerateMarketing(request, env) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const type = String(body.type || "");
  const tone = String(body.tone || "professionnel");
  if (!TYPES[type]) {
    return Response.json({ error: "Format non pris en charge." }, { status: 400 });
  }
  if (!TONES[tone]) {
    return Response.json({ error: "Ton non pris en charge." }, { status: 400 });
  }

  const isEbook = body.product_type === "ebook";
  const productId = String(body.product_id || body.formation_id || "");

  let product = null;
  let program = [];
  let certificate = false;

  if (isEbook) {
    let row = null;
    try {
      row = await env.DB.prepare(
        `SELECT e.id, e.title, e.description, e.tagline, e.language, e.content, e.sections_json,
                u.full_name AS author
         FROM ebooks e LEFT JOIN users u ON u.id = e.user_id
         WHERE e.id = ? AND e.user_id = ?`
      )
        .bind(productId, payload.sub)
        .first();
    } catch {
      // colonne "tagline" absente : on lit sans elle
      row = await env.DB.prepare(
        `SELECT e.id, e.title, e.description, e.language, e.content, e.sections_json,
                u.full_name AS author
         FROM ebooks e LEFT JOIN users u ON u.id = e.user_id
         WHERE e.id = ? AND e.user_id = ?`
      )
        .bind(productId, payload.sub)
        .first();
    }
    if (!row) {
      return Response.json({ error: "eBook introuvable." }, { status: 404 });
    }
    product = row;
    program = chaptersOfEbook(row);
  } else {
    const row = await env.DB.prepare(
      `SELECT f.id, f.title, f.description, f.language, f.certificate, u.full_name AS author
       FROM formations f LEFT JOIN users u ON u.id = f.user_id
       WHERE f.id = ? AND f.user_id = ?`
    )
      .bind(productId, payload.sub)
      .first();
    if (!row) {
      return Response.json({ error: "Formation introuvable." }, { status: 404 });
    }
    product = row;
    certificate = !!row.certificate;
    const { results } = await env.DB.prepare(
      "SELECT title, summary FROM formation_modules WHERE formation_id = ? ORDER BY position ASC"
    )
      .bind(row.id)
      .all();
    program = results.map((m) => ({ title: m.title, summary: m.summary || "" }));
  }

  // Lien et prix saisis par l'utilisateur (Chariow, Maketou, etc.)
  let link = "";
  const rawLink = String(body.link || "").trim();
  if (/^https?:\/\/\S+$/i.test(rawLink) && rawLink.length <= 200) link = rawLink;

  const price = String(body.price || "").replace(/[<>\r\n]/g, " ").trim().slice(0, 40);

  const langLabel = product.language === "en" ? "English" : "français";
  const summary = (product.tagline || cleanDescription(product.description) || "").slice(0, 400);
  const programText = program
    .map((m, i) => `${i + 1}. ${m.title}${m.summary ? " : " + m.summary : ""}`)
    .join("\n");

  const facts = `INFORMATIONS SUR LE PRODUIT
Type : ${isEbook ? "eBook (livre numérique à télécharger)" : "formation en ligne"}
Titre : ${product.title}
Résumé : ${summary || "non fourni"}
${isEbook ? "Chapitres" : "Programme"} :
${programText || "non fourni"}
${isEbook ? "" : `Certificat de réussite : ${certificate ? "oui" : "non"}\n`}${isEbook ? "Auteur" : "Formateur"} : ${product.author || "non fourni"}
Prix à mentionner : ${price || "ne pas mentionner de prix"}
Lien à insérer : ${link || "aucun lien"}`;

  const prompt = `Tu écris un contenu marketing en ${langLabel} pour vendre le produit décrit ci-dessous.
Ton à adopter : ${TONES[tone]}.

${facts}

${TYPES[type].instruction}

RÈGLES STRICTES :
- Base-toi uniquement sur les informations ci-dessus. N'invente ni chiffres, ni résultats, ni témoignages, ni statistiques, ni bonus, ni garanties, ni noms de clients.
- Ne promets jamais de revenus garantis ni de résultats certains ; parle de méthode, de compétences et d'étapes concrètes.
- Phrases courtes, mots simples, une idée par phrase. Pas de remplissage.
- Si un lien est fourni, insère-le tel quel. S'il n'y en a pas, invite à commenter ou à écrire en message privé. Si aucun prix n'est fourni, n'en parle pas.
- N'utilise pas de crochets ni de texte à remplacer.
- Réponds uniquement avec le texte final, prêt à publier, sans introduction, sans commentaire et sans mise en forme Markdown (pas de ** ni de #).`;

  try {
    const response = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        {
          role: "system",
          content:
            "Tu es un expert en copywriting pour produits digitaux. Tu écris des textes honnêtes, courts et efficaces.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: TYPES[type].tokens,
    });

    let text = String(response.response || "").trim();
    text = text.replace(/\*\*/g, "").replace(/^#{1,6}\s+/gm, "").trim();
    if (!text) {
      return Response.json({ error: "L'IA n'a rien renvoyé, réessayez." }, { status: 502 });
    }

    return Response.json({ text });
  } catch (err) {
    return Response.json(
      { error: "Erreur lors de la génération IA.", details: err.message },
      { status: 502 }
    );
  }
                                                                }
