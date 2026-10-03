export function renderMarkdown(text) {
  if (!text) return "";

  const escapeHtml = (str) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const inline = (str) =>
    escapeHtml(str).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  const PRINT = "-webkit-print-color-adjust:exact;print-color-adjust:exact;";
  const isSeparator = (l) =>
    /^\|?[\s|:-]+\|?$/.test(l) && l.includes("-") && l.includes("|");
  const splitRow = (l) =>
    l.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

  const TH =
    "text-align:left;padding:0.6rem 0.7rem;font-weight:700;border:1px solid rgba(128,128,128,0.35);background:var(--accent-head,rgba(212,175,55,0.3));color:var(--ink,#0B0B0B);" +
    PRINT;
  const TD =
    "padding:0.55rem 0.7rem;vertical-align:top;border:1px solid rgba(128,128,128,0.35);";
  const TD_ALT =
    "padding:0.55rem 0.7rem;vertical-align:top;border:1px solid rgba(128,128,128,0.35);background:var(--accent-soft,rgba(212,175,55,0.12));" +
    PRINT;
  const CALLOUT =
    "margin:1.3rem 0;padding:0.9rem 1.1rem;border-left:4px solid var(--accent,#D4AF37);background:var(--accent-soft,rgba(212,175,55,0.17));border-radius:0 8px 8px 0;line-height:1.7;" +
    PRINT;

  const lines = String(text).replace(/\r/g, "").split("\n");
  let html = "";
  let listKind = null; // "ul" | "ol" | "check"

  const closeList = () => {
    if (listKind) {
      html += listKind === "ol" ? "</ol>" : "</ul>";
      listKind = null;
    }
  };
  const openList = (kind) => {
    if (listKind === kind) return;
    closeList();
    html +=
      kind === "ol"
        ? `<ol style="list-style:decimal;padding-left:1.5rem;margin:1rem 0">`
        : kind === "check"
        ? `<ul style="list-style:none;padding-left:0.2rem;margin:1rem 0">`
        : `<ul style="list-style:disc;padding-left:1.5rem;margin:1rem 0">`;
    listKind = kind;
  };

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Titres
    const hm = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (hm) {
      closeList();
      const tag = hm[1].length === 1 ? "h1" : hm[1].length === 2 ? "h2" : "h3";
      html += `<${tag}>${escapeHtml(hm[2])}</${tag}>`;
      continue;
    }

    // Tableau
    if (trimmed.startsWith("|") && i + 1 < lines.length && isSeparator(lines[i + 1].trim())) {
      closeList();
      const head = splitRow(trimmed);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i].trim()));
        i++;
      }
      i--;
      html += `<div class="md-table-wrap" style="margin:1.2rem 0"><table style="width:100%;border-collapse:collapse;font-size:0.92em">`;
      html += `<thead><tr>${head.map((c) => `<th style="${TH}">${inline(c)}</th>`).join("")}</tr></thead><tbody>`;
      rows.forEach((r, ri) => {
        const cell = ri % 2 === 1 ? TD_ALT : TD;
        html += `<tr style="break-inside:avoid;page-break-inside:avoid">${head
          .map((_, ci) => `<td style="${cell}">${inline(r[ci] ?? "")}</td>`)
          .join("")}</tr>`;
      });
      html += "</tbody></table></div>";
      continue;
    }

    // Encadré (lignes commençant par ">")
    if (trimmed.startsWith(">")) {
      closeList();
      const parts = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        parts.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      i--;
      html += `<blockquote style="${CALLOUT}">${parts.map((p) => inline(p)).join("<br>")}</blockquote>`;
      continue;
    }

    // Checklist
    const chk = trimmed.match(/^[-*]\s+\[( |x|X)\]\s+(.*)$/);
    if (chk) {
      openList("check");
      html += `<li style="margin:0.35rem 0;line-height:1.6">${chk[1].trim() ? "☑" : "☐"} ${inline(chk[2])}</li>`;
      continue;
    }

    // Liste à puces
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      openList("ul");
      html += `<li>${inline(trimmed.slice(2))}</li>`;
      continue;
    }

    // Liste numérotée
    const ol = trimmed.match(/^\d{1,2}[.)]\s+(.*)$/);
    if (ol) {
      openList("ol");
      html += `<li>${inline(ol[1])}</li>`;
      continue;
    }

    closeList();

    if (trimmed === "") continue;
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) continue;

    html += `<p>${inline(trimmed)}</p>`;
  }

  closeList();

  return html;
}

export function extractChapterTitles(content) {
  const matches = [
    ...String(content || "").matchAll(
      /^## ((?:Chapitre|Chapter|Capítulo|Kapitel|Capitolo|الفصل).+)$/gm
    ),
  ];
  return matches.map((m) => m[1]);
                                                                        }
