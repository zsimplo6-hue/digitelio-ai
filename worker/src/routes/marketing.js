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
  if (price === null || price === undefined || price === "") return "";
  if (Number(price) === 0) return "gratuit";
  return `${Number(price).toLocaleString("fr-FR")} ${SYMBOLS[currency] || currency || "€"}`;
}

const STRUCTURE = `Structure obligatoire, dans cet ordre :
1. HOOK : 1 à 2 lignes percutantes qui arrêtent le lecteur (jamais de phrase générique).
2. PROBLÈME : la difficulté précise que vit le public visé.
3. PROMESSE : ce que la personne va apprendre, créer ou obtenir, de façon concrète.
4. TRANSFORMATION : le passage du "avant" au "après" (de "..." à "...").
5. PRODUIT : nom, format, pour qui il est conçu.
6. CONTENU : "À l'intérieur, tu vas découvrir :" puis 4 éléments tirés du programme, chacun formulé comme un bénéfice (ce que ça permet de faire), pas comme un simple titre.
7. BÉNÉFICES : "Ce produit est fait pour toi si tu veux :" puis 3 lignes commençant par ✅.
8. BONUS : seulement s'ils sont fournis. Sinon, saute cette partie.
9. PREUVE : seulement si elle est fournie (expérience, résultat, témoignage). Sinon, saute cette partie.
10. OFFRE : le prix et ce que l'acheteur reçoit (format, accès) ; offre de lancement seulement si fournie.
11. CTA : UNE seule action, avec le lien s'il existe, sous la forme "👉 Accède maintenant : lien".
Le texte doit répondre clairement à : Qu'est-ce que c'est ? Pour qui ? Quel problème ça résout ? Quel résultat concret ? Pourquoi agir maintenant ?`;

const TYPES = {
  post: {
    tokens: 1300,
    instruction: `Rédige UN post premium pour les réseaux sociaux (Facebook / Instagram / LinkedIn), 180 à 280 mots.
${STRUCTURE}
Paragraphes courts, une ligne vide entre les blocs, émojis dosés (🔥 📚 🎁 ✅ 💰 👉 ⚡). Termine par une phrase d'action forte, puis 4 à 6 hashtags.`,
  },
  tiktok: {
    tokens: 900,
    instruction: `Rédige le script d'une vidéo TikTok / Reels de 30 à 40 secondes, dans ce format :
ACCROCHE (0-3 s) : la phrase parlée qui arrête le défilement ;
PROBLÈME (3-10 s) : la difficulté du public, en 1 ou 2 phrases ;
SOLUTION (10-28 s) : le produit, la transformation et 3 bénéfices concrets, phrases faciles à dire à voix haute ;
APPEL À L'ACTION (28-40 s) : une seule action, avec le prix et le lien s'ils existent ;
TEXTE À L'ÉCRAN : 3 à 4 courts textes ;
LÉGENDE : une légende de publication avec 5 hashtags.`,
  },
  whatsapp: {
    tokens: 700,
    instruction: `Rédige un message WhatsApp (statut ou message direct) de 100 à 160 mots :
- une accroche naturelle sur le problème ou le résultat recherché ;
- ce que le produit permet d'obtenir (transformation), puis 3 lignes ✅ de bénéfices ;
- les bonus et l'offre de lancement seulement s'ils sont fournis ;
- le prix et UN seul appel à l'action avec le lien s'il existe.
Ton conversationnel, lignes courtes, 3 à 5 émojis.`,
  },
  email: {
    tokens: 1400,
    instruction: `Rédige un email de vente premium :
OBJET : moins de 60 caractères, accrocheur ;
PRÉ-TITRE : une phrase d'aperçu ;
CORPS : suis la structure ci-dessous, en phrases fluides avec une liste pour le contenu et les bénéfices ;
SIGNATURE : le nom de l'auteur s'il est fourni.
${STRUCTURE}`,
  },
  hooks: {
    tokens: 700,
    instruction: `Propose 10 accroches différentes, numérotées de 1 à 10, utilisables en première ligne d'un post ou d'une vidéo.
Varie les angles : problème, transformation avant/après, question, promesse mesurée, curiosité, erreur courante, comparaison, "tu n'as pas besoin de... tu as besoin de...".
Chaque accroche tient en une ou deux phrases courtes, sans générique.`,
  },
};

const TONES = {
  professionnel: "professionnel, clair et rassurant",
  amical: "amical, chaleureux, proche du lecteur",
  energique: "énergique, dynamique et motivant",
  inspirant: "inspirant, positif, tourné vers la progression personnelle",
};

function stripChapterPrefix(title) {
  return String(title || "").replace(/^Chapitre\s*\d+\s*:\s*/i, "").trim();
}

function clip(v, n) {
  return String(v || "").replace(/\s+/g, " ").trim().slice(0, n);
}

/* Nettoie la sortie : pas de Markdown, pas de crochets, pas de mots-clés isolés à la fin */
function cleanOutput(raw, type) {
  let t = String(raw || "").replace(/\r/g, "").trim();
  t = t.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "");
  t = t.replace(/\*\*/g, "").replace(/^#{1,6}\s+/gm, "");
  const lines = t.split("\n");
  while (lines.length) {
    const last = lines[lines.length - 1].trim();
    const isKeywordLine =
      last !== "" &&
      !/#/.test(last) &&
      !/https?:\/\//.test(last) &&
      !/[.!?:»)]$/.test(last) &&
      (last.split(/\s+/).length <= 2 || /^[\p{L}\s,'’-]+(\s*[\p{Extended_Pictographic}\uFE0F\s]*)$/u.test(last) && last.includes(","));
    if (last === "" || (type !== "hooks" && isKeywordLine)) lines.pop();
    else break;
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function handleGenerateMarketing(request, env) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const type = String(body.type || "");
  const tone = String(body.tone || "professionnel");
  if (!TYPES[type]) return Response.json({ error: "Format non pris en charge." }, { status: 400 });
  if (!TONES[tone]) return Response.json({ error: "Ton non pris en charge." }, { status: 400 });

  const isEbook = body.product_type === "ebook" || !!body.ebook_id;
  const productId = String(body.product_id || body.ebook_id || body.formation_id || "");

  let p; // produit normalisé
  if (isEbook) {
    const e = await env.DB.prepare(
      `SELECT e.id, e.title, e.description, e.language, e.price, e.currency, e.sections_json,
              u.full_name AS author
       FROM ebooks e LEFT JOIN users u ON u.id = e.user_id
       WHERE e.id = ? AND e.user_id = ?`
    )
      .bind(productId, payload.sub)
      .first();
    if (!e) return Response.json({ error: "eBook introuvable." }, { status: 404 });

    let chapters = [];
    try {
      chapters = JSON.parse(e.sections_json || "[]")
        .filter((s) => s.type === "chapter")
        .map((s) => ({ title: stripChapterPrefix(s.title), summary: s.summary || "" }));
    } catch {
      chapters = [];
    }
    p = {
      kind: "eBook",
      title: e.title,
      description: e.description,
      language: e.language,
      price: e.price,
      currency: e.currency,
      author: e.author,
      program: chapters,
      extra: `Format : eBook numérique (${chapters.length} chapitres, avec tableaux récapitulatifs et checklists d'action)`,
    };
  } else {
    const f = await env.DB.prepare(
      `SELECT f.id, f.title, f.description, f.language, f.price, f.currency, f.certificate,
              u.full_name AS instructor
       FROM formations f LEFT JOIN users u ON u.id = f.user_id
       WHERE f.id = ? AND f.user_id = ?`
    )
      .bind(productId, payload.sub)
      .first();
    if (!f) return Response.json({ error: "Formation introuvable." }, { status: 404 });

    const { results } = await env.DB.prepare(
      "SELECT title, summary FROM formation_modules WHERE formation_id = ? ORDER BY position ASC"
    )
      .bind(f.id)
      .all();
    p = {
      kind: "formation",
      title: f.title,
      description: f.description,
      language: f.language,
      price: f.price,
      currency: f.currency,
      author: f.instructor,
      program: results.map((m) => ({ title: m.title, summary: m.summary || "" })),
      extra: `Format : formation en ligne (${results.length} modules). Certificat de réussite : ${f.certificate ? "oui" : "non"}`,
    };
  }

  // Lien : tout lien https valide (Chariow, Maketou, page de vente...)
  let link = "";
  const rawLink = String(body.link || "").trim();
  if (/^https?:\/\/\S+$/i.test(rawLink) && rawLink.length <= 300) link = rawLink;

  // Prix : celui saisi par l'utilisateur sinon celui du produit
  const customPrice = clip(body.price_text, 40);
  const price = customPrice || priceText(p.price, p.currency);

  const langLabel = p.language === "en" ? "English" : "français";
  const program = p.program
    .map((m, i) => `${i + 1}. ${m.title}${m.summary ? " : " + m.summary : ""}`)
    .join("\n");

  const audience = clip(body.audience, 200);
  const problem = clip(body.problem, 300);
  const bonus = clip(body.bonus, 400);
  const proof = clip(body.proof, 400);
  const offer = clip(body.offer, 300);

  const facts = `INFORMATIONS SUR LE PRODUIT
Type : ${p.kind}
Titre : ${p.title}
Description : ${clip(p.description, 800) || "non fournie"}
${p.extra}
Contenu / programme :
${program || "non fourni"}
Public visé : ${audience || "à déduire du titre et de la description"}
Problème du public : ${problem || "à déduire du titre et de la description"}
Bonus : ${bonus || "AUCUN (ne mentionne aucun bonus)"}
Preuve / crédibilité : ${proof || "AUCUNE (ne mentionne aucune preuve ni témoignage)"}
Offre de lancement : ${offer || "AUCUNE (ne crée pas d'urgence ni de rareté)"}
Prix : ${price || "non défini"}
Auteur : ${p.author || "non fourni"}
Lien : ${link || "aucun lien à insérer"}`;

  const prompt = `Tu écris un texte de lancement premium en ${langLabel} pour vendre le produit digital décrit ci-dessous.
Un texte premium vend la TRANSFORMATION, pas seulement le produit.
Ton à adopter : ${TONES[tone]}.
Tutoie le lecteur (tu / ton / ta), sauf si la langue est l'anglais.

${facts}

${TYPES[type].instruction}

RÈGLES STRICTES :
- Base-toi uniquement sur les informations ci-dessus. N'invente ni chiffres, ni résultats, ni témoignages, ni statistiques, ni bonus, ni offre limitée.
- Ne promets jamais de revenus garantis ni de résultats certains ; parle de méthode, de compétences et de passage à l'action.
- Transforme les titres de chapitres en bénéfices concrets.
- Un seul appel à l'action. Si le prix ou le lien n'est pas fourni, n'en parle pas.
- Aucun crochet, aucun texte à remplacer, aucun mot-clé isolé à la fin.
- Pas de Markdown (pas de ** ni de #). Réponds uniquement avec le texte final, prêt à publier, sans introduction ni commentaire.`;

  try {
    const response = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        {
          role: "system",
          content:
            "Tu es un copywriter expert en lancement de produits digitaux (eBooks, formations) vendus via Chariow, Maketou et d'autres plateformes. Tu écris des textes premium, concrets, orientés transformation, honnêtes et prêts à publier.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: TYPES[type].tokens,
    });

    const text = cleanOutput(response.response, type);
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
