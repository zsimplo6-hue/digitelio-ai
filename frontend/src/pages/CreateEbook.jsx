import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout.jsx";

function renderMarkdown(text) {
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
      html += `<h3 class="mt-6 mb-2 text-lg font-bold">${escapeHtml(trimmed.slice(4))}</h3>`;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h2 class="mt-8 mb-3 text-xl font-bold">${escapeHtml(trimmed.slice(3))}</h2>`;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h1 class="mt-8 mb-4 text-2xl font-bold">${escapeHtml(trimmed.slice(2))}</h1>`;
      continue;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) { html += '<ul class="list-disc pl-5 space-y-1">'; inList = true; }
      let item = escapeHtml(trimmed.slice(2));
      item = item.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      html += `<li>${item}</li>`;
      continue;
    }

    if (inList) { html += "</ul>"; inList = false; }

    if (trimmed === "") {
      html += "";
      continue;
    }

    let paragraph = escapeHtml(trimmed);
    paragraph = paragraph.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html += `<p class="mt-3 leading-relaxed">${paragraph}</p>`;
  }

  if (inList) html += "</ul>";

  return html;
}

export default function CreateEbook() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("fr");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleGenerate(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/generate/ebook`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, language }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la génération.");
      }

      setResult(data.ebook);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout title="Créer un eBook">
      <form onSubmit={handleGenerate} className="card max-w-2xl space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Titre de votre eBook *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Le guide ultime du marketing digital"
            className="w-full rounded-lg border border-digi-navy/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-digi-blue dark:border-white/15 dark:bg-white/5"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Description *</label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez brièvement le sujet de votre eBook."
            className="w-full rounded-lg border border-digi-navy/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-digi-blue dark:border-white/15 dark:bg-white/5"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Langue</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-lg border border-digi-navy/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-digi-blue dark:border-white/15 dark:bg-white/5"
          >
            <option value="fr">Français</option>
            <option value="en">Anglais</option>
          </select>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Génération en cours..." : "Générer le contenu avec l'IA"}
        </button>
      </form>

      {result && (
        <div className="card mt-6 max-w-2xl">
          <h2 className="text-2xl font-bold">{result.title}</h2>
          <div
            className="mt-2 text-sm text-digi-navy/80 dark:text-white/80"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(result.content) }}
          />
        </div>
      )}
    </DashboardLayout>
  );
      }
