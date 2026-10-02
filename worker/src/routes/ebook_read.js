const TOKEN_RE = /^[0-9a-f]{48}$/;
const TEMPLATE_IDS = ["business", "finance", "wellness", "growth", "spirit", "cuisine"];
const LANG_CODES = ["fr", "en", "es", "pt", "de", "it", "ar"];
const HEX = /^#[0-9a-fA-F]{6}$/;

function parseSections(raw, content) {
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    } catch {
      /* on retombe sur le parsing du markdown */
    }
  }
  const rawChapters = String(content || "").split(/^## /m).slice(1);
  return rawChapters.map((chunk, i) => {
    const lines = chunk.split("\n");
    const title = (lines[0] || "").trim();
    const body = lines.slice(1).join("\n").trim();
    const isIntro = /^(Introduction|Introducción|Introdução|Einleitung|Introduzione|المقدمة)/i.test(title);
    const isConclusion = /^(Conclusion|Conclusión|Conclusão|Fazit|Conclusione|الخاتمة)/i.test(title);
    const type = isIntro ? "intro" : isConclusion ? "conclusion" : "chapter";
    const id = isIntro ? "intro" : isConclusion ? "conclusion" : `chapter-${i - 1}`;
    return { id, type, title, content: body, image: "" };
  });
}

/* Modèle et kit de marque du vendeur (tolérant : si les tables n'existent pas, valeurs par défaut) */
async function readStyle(env, ebookId, userId) {
  let template = "";
  let brand = {};
  try {
    const row = await env.DB.prepare("SELECT template FROM ebook_styles WHERE ebook_id = ?")
      .bind(ebookId)
      .first();
    if (TEMPLATE_IDS.includes(row?.template)) template = row.template;
  } catch {
    /* table absente */
  }
  try {
    const b = await env.DB.prepare(
      "SELECT brand_name, author_name, tagline, accent_color, cover_color, default_template FROM brand_kits WHERE user_id = ?"
    )
      .bind(userId)
      .first();
    if (b) {
      brand = {
        brand_name: b.brand_name || "",
        author_name: b.author_name || "",
        tagline: b.tagline || "",
        accent_color: HEX.test(b.accent_color || "") ? b.accent_color : "",
        cover_color: HEX.test(b.cover_color || "") ? b.cover_color : "",
      };
      if (!template && TEMPLATE_IDS.includes(b.default_template)) template = b.default_template;
    }
  } catch {
    /* table absente */
  }
  return { template: template || "finance", brand };
}

/* ===== GET /api/read/:token : accès de lecture de l'acheteur (public, protégé par le token secret) ===== */
export async function handleGetEbookReader(request, env, token) {
  if (!TOKEN_RE.test(token)) {
    return Response.json({ error: "Lien d'accès invalide." }, { status: 404 });
  }

  const a = await env.DB.prepare(
    `SELECT a.id, a.buyer_name,
            e.id AS ebook_id, e.user_id, e.title, e.description, e.language, e.content, e.sections_json,
            u.full_name AS author
     FROM ebook_access a
     JOIN ebooks e ON e.id = a.ebook_id
     LEFT JOIN users u ON u.id = e.user_id
     WHERE a.token = ?`
  )
    .bind(token)
    .first();

  if (!a) {
    return Response.json({ error: "Lien d'accès invalide ou expiré." }, { status: 404 });
  }

  const sections = parseSections(a.sections_json, a.content);
  const { template, brand } = await readStyle(env, a.ebook_id, a.user_id);

  return Response.json({
    buyer_name: a.buyer_name || "",
    ebook: {
      id: a.ebook_id,
      title: a.title,
      description: a.description || "",
      author: a.author || "",
      language: LANG_CODES.includes(a.language) ? a.language : "fr",
      template,
      brand,
      sections,
    },
  });
      }
