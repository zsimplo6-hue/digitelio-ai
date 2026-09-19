export function renderMarkdown(text) {
  if (!text) return "";

  const escapeHtml = (str) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const lines = text.split("\n");
  let html = "";
  let inList = false;

  for (let line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("### ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h3>${escapeHtml(trimmed.slice(4))}</h3>`;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h1>${escapeHtml(trimmed.slice(2))}</h1>`;
      continue;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) { html += "<ul>"; inList = true; }
      let item = escapeHtml(trimmed.slice(2));
      item = item.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      html += `<li>${item}</li>`;
      continue;
    }

    if (inList) { html += "</ul>"; inList = false; }

    if (trimmed === "") continue;

    let paragraph = escapeHtml(trimmed);
    paragraph = paragraph.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html += `<p>${paragraph}</p>`;
  }

  if (inList) html += "</ul>";

  return html;
}

export function extractChapterTitles(content) {
  const matches = [...content.matchAll(/^## (Chapitre.+)$/gm)];
  return matches.map((m) => m[1]);
}
