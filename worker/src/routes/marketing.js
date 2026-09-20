import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";

async function getAuthenticatedUser(request, env) {
  const cookies = parseCookies(request);
  const token = cookies["digitelio_session"];
  if (!token) return null;
  return await verifyJWT(token, env.JWT_SECRET);
}

const unauthorized = () => Response.json({ error: "Non authentifié." }, { status: 401 });

const SYMBOLS = {
  EUR: "€", USD: "$", XOF: "FCFA", XAF: "FCFA", GBP: "£", CAD: "CA$", CHF: "CHF",
  MAD: "DH", DZD: "DA", TND: "DT", NGN: "₦", GHS: "GH₵", KES: "KSh", ZAR: "R",
  GNF: "GNF", CDF: "FC",
};

function priceText(price, currency) {
  if (price === null || price === undefined) return "";
  if (price === 0) return "gratuit";
  return `${Number(price).toLocaleString("fr-FR")} ${SYMBOLS[currency] || currency || "€"}`;
}

const TYPES = {
  post: {
    tokens: 700,
    instruction: `Rédige UN post pour les réseaux sociaux (Facebook / Instagram / LinkedIn) :
- une première ligne d'accroche qui donne envie de lire la suite ;
- 3 à 5 courtes lignes qui présentent la transformation promise et 3 bénéfices concrets du programme ;
- le prix et un appel à l'action clair ;
- 4 à 6 hashtags pertinents à la fin.
Utilise quelques émojis avec parcimonie.`,
  },
  tiktok: {
    tokens: 800,
    instruction: `Rédige le script d'une vidéo courte TikTok / Reels de 30 à 45 secondes, dans ce format :
ACCROCHE (0-3 s) : la phrase parlée qui arrête le défilement ;
DÉVELOPPEMENT (3-30 s) : 3 points courts, phrases faciles à dire à voix haute ;
APPEL À L'ACTION (30-40 s) : ce que le spectateur doit faire ;
TEXTE À L'ÉCRAN : 3 à 4 courts textes à afficher ;
LÉGENDE : une légende de publication avec 5 hashtags.`,
  },
  whatsapp: {
    tokens: 500,
    instruction: `Rédige un message WhatsApp court (80 à 130 mots) à envoyer à un contact ou à publier en statut :
- une salutation naturelle, comme un vrai message entre personnes ;
- ce que la formation permet d'obtenir, en 2 ou 3 phrases simples ;
- le prix et le lien s'ils sont fournis ;
- une question ou un appel à l'action qui invite à répondre.
Ton conversationnel, pas de gros bloc de texte, 2 ou 3 émojis maximum.`,
  },
  email: {
    tokens: 900,
    instruction: `Rédige un email de vente complet :
OBJET : un objet court et accrocheur (moins de 60 caractères) ;
PRÉ-TITRE : une phrase d'aperçu ;
CORPS : une accroche, le problème du lecteur, la solution (la formation), 4 bénéfices sous forme de liste avec des tirets, le programme résumé, le prix, un appel à l'action clair ;
SIGNATURE : le nom du formateur s'il est fourni.`,
  },
  hooks: {
    tokens: 500,
    instruction: `Propose 10 accroches différentes pour promouvoir cette formation, numérotées de 1 à 10.
Varie les angles : une question, un chiffre, un problème courant, une promesse mesurée, une curiosité, une comparaison.
Chaque accroche fait une seule phrase courte, utilisable en première ligne d'un post ou d'une vidéo.`,
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

  const f = await env.DB.prepare(
    `SELECT f.id, f.title, f.description, f.language, f.price, f.currency, f.status,
            f.certificate, u.full_name AS instructor
     FROM formations f
     LEFT JOIN users u ON u.id = f.user_id
     WHERE f.id = ? AND f.user_id = ?`
  )
    .bind(String(body.formation_id || ""), payload.sub)
    .first();

  if (!f) {
    return Response.json({ error: "Formation introuvable." }, { status: 404 });
  }

  const { results } = await env.DB.prepare(
    "SELECT title, summary FROM formation_modules WHERE formation_id = ? ORDER BY position ASC"
  )
    .bind(f.id)
    .all();

  // Le lien n'est utilisé que si la page de vente est publiée
  let link = "";
  const rawLink = String(body.link || "").trim();
  if (f.status === "published" && /^https?:\/\/\S+$/i.test(rawLink) && rawLink.length <= 200) {
    link = rawLink;
  }

  const price = priceText(f.price, f.currency);
  const langLabel = f.language === "en" ? "English" : "français";
  const program = results
    .map((m, i) => `${i + 1}. ${m.title}${m.summary ? " : " + m.summary : ""}`)
    .join("\n");

  const facts = `INFORMATIONS SUR LA FORMATION
Titre : ${f.title}
Description : ${f.description || "non fournie"}
Programme :
${program || "non fourni"}
Prix : ${price || "non défini"}
Certificat de réussite : ${f.certificate ? "oui" : "non"}
Formateur : ${f.instructor || "non fourni"}
Lien de la page de vente : ${link || "aucun lien à insérer"}`;

  const prompt = `Tu écris un contenu marketing en ${langLabel} pour vendre la formation décrite ci-dessous.
Ton à adopter : ${TONES[tone]}.

${facts}

${TYPES[type].instruction}

RÈGLES STRICTES :
- Base-toi uniquement sur les informations ci-dessus. N'invente ni chiffres, ni résultats, ni témoignages, ni statistiques, ni noms de clients.
- Ne promets jamais de revenus garantis ni de résultats certains ; parle de compétences acquises, de méthode et d'accompagnement.
- N'utilise pas de crochets ni de texte à remplacer : si le prix ou le lien n'est pas fourni, n'en parle pas.
- Réponds uniquement avec le texte final, prêt à publier, sans introduction, sans commentaire et sans mise en forme Markdown (pas de ** ni de #).`;

  try {
    const response = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        {
          role: "system",
          content:
            "Tu es un expert en copywriting et marketing de formations en ligne. Tu écris des textes honnêtes, clairs et efficaces.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: TYPES[type].tokens,
    });

    const text = String(response.response || "").trim();
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
