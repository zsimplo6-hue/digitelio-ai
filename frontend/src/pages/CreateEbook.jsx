import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { renderMarkdown } from "../utils/markdown.js";

export default function CreateEbook() {
  const navigate = useNavigate();
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
          {loading ? "Rédaction complète en cours (peut prendre 30-60s)..." : "Générer l'eBook complet avec l'IA"}
        </button>
      </form>

      {result && (
        <div className="card mt-6 max-w-2xl">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">{result.title}</h2>
            <button
              onClick={() => navigate(`/dashboard/ebooks/${result.id}`)}
              className="btn-primary whitespace-nowrap text-sm"
            >
              Voir & télécharger en PDF
            </button>
          </div>
          <div
            className="mt-3 max-h-64 overflow-hidden text-sm text-digi-navy/70 dark:text-white/70"
            style={{ maskImage: "linear-gradient(to bottom, black 60%, transparent)" }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(result.content) }}
          />
        </div>
      )}
    </DashboardLayout>
  );
}
