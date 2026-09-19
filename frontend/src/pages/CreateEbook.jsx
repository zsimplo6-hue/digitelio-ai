import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout.jsx";

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
          <h2 className="text-lg font-bold">{result.title}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-digi-navy/80 dark:text-white/80">
            {result.content}
          </p>
        </div>
      )}
    </DashboardLayout>
  );
            }
