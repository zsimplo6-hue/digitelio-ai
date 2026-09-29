const TOKEN_RE = /^[0-9a-f]{48}$/;

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
    const isIntro = /^Introduction/i.test(title);
    const isConclusion = /^Conclusion/i.test(title);
    const type = isIntro ? "intro" : isConclusion ? "conclusion" : "chapter";
    const id = isIntro ? "intro" : isConclusion ? "conclusion" : `chapter-${i - 1}`;
    return { id, type, title, content: body, image: "" };
  });
}

/* ===== GET /api/read/:token : accès de lecture de l'acheteur (public, protégé par le token secret) ===== */
export async function handleGetEbookReader(request, env, token) {
  if (!TOKEN_RE.test(token)) {
    return Response.json({ error: "Lien d'accès invalide." }, { status: 404 });
  }

  const a = await env.DB.prepare(
    `SELECT a.id, a.buyer_name,
            e.id AS ebook_id, e.title, e.description, e.content, e.sections_json,
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

  return Response.json({
    buyer_name: a.buyer_name || "",
    ebook: {
      id: a.ebook_id,
      title: a.title,
      description: a.description || "",
      author: a.author || "",
      sections,
    },
  });
                          }
