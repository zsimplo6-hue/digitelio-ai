import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";
import { parseContentToSections, sectionsToContent } from "./ebooks.js";

async function getAuthenticatedUser(request, env) {
  const cookies = parseCookies(request);
  const token = cookies["digitelio_session"];
  if (!token) return null;
  return await verifyJWT(token, env.JWT_SECRET);
}

function isValidImage(s) {
  if (!s) return true; // chaîne vide = retirer l'image, autorisé
  if (typeof s !== "string") return false;
  const ok =
    s.startsWith("data:image/jpeg;base64,") ||
    s.startsWith("data:image/png;base64,") ||
    s.startsWith("data:image/webp;base64,");
  return ok && s.length <= 900000;
}

export async function handleUpdateEbookSection(request, env, ebookId, sectionId) {
  const payload = await getAuthenticatedUser(request, env);
  if (!payload) return Response.json({ error: "Non authentifié." }, { status: 401 });

  const ebook = await env.DB.prepare(
    "SELECT id, title, content, sections_json FROM ebooks WHERE id = ? AND user_id = ?"
  )
    .bind(ebookId, payload.sub)
    .first();
  if (!ebook) return Response.json({ error: "eBook introuvable." }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Corps de requête invalide." }, { status: 400 });

  const content = typeof body.content === "string" ? body.content.slice(0, 30000) : null;
  const image = body.image;
  if (image !== undefined && !isValidImage(image)) {
    return Response.json({ error: "Image invalide ou trop lourde." }, { status: 400 });
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

  const idx = sections.findIndex((s) => s.id === sectionId);
  if (idx === -1) return Response.json({ error: "Section introuvable." }, { status: 404 });

  if (content !== null) sections[idx].content = content;
  if (image !== undefined) sections[idx].image = image || "";

  const newContent = sectionsToContent(ebook.title, sections);

  await env.DB.prepare("UPDATE ebooks SET content = ?, sections_json = ? WHERE id = ?")
    .bind(newContent, JSON.stringify(sections), ebookId)
    .run();

  return Response.json({ section: sections[idx] });
                         }
