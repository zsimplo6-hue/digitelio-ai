import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { renderMarkdown } from "../utils/markdown.js";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input, Select } from "../components/ui/Field.jsx";

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
      <form onSubmit={handleGenerate} style={{ maxWidth: "42rem" }}>
        <Card>
          <Input
            label="Titre de votre eBook *"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Le guide ultime du marketing digital"
          />

          <div className="dg-field">
            <label className="dg-field__label">Description *</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez brièvement le sujet de votre eBook."
              className="dg-field__input"
            />
          </div>

          <Select label="Langue" value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="fr">Français</option>
            <option value="en">Anglais</option>
          </Select>

          {error && <div className="dg-alert dg-alert--error">{error}</div>}

          <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Rédaction complète en cours (peut prendre 30-60s)..." : "Générer l'eBook complet avec l'IA"}
          </Button>
        </Card>
      </form>

      {result && (
        <Card className="dg-mt-6" style={{ maxWidth: "42rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h2 className="dg-card__title" style={{ fontSize: 20 }}>{result.title}</h2>
            <Button variant="primary" size="sm" onClick={() => navigate(`/dashboard/ebooks/${result.id}`)}>
              Voir & télécharger en PDF
            </Button>
          </div>
          <div
            style={{
              marginTop: 12,
              maxHeight: 256,
              overflow: "hidden",
              fontSize: 14,
              color: "var(--dg-text-secondary)",
              maskImage: "linear-gradient(to bottom, black 60%, transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent)",
            }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(result.content) }}
          />
        </Card>
      )}
    </DashboardLayout>
  );
                }
