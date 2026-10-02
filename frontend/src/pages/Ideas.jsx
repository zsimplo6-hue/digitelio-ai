import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Select } from "../components/ui/Field.jsx";
import { LANGUAGES } from "../utils/templates.js";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

const COUNTRIES = [
  "Bénin", "Burkina Faso", "Cameroun", "Côte d'Ivoire", "Congo-Brazzaville", "RD Congo", "Gabon",
  "Guinée", "Mali", "Niger", "Sénégal", "Togo", "Madagascar", "Maroc", "Algérie", "Tunisie",
  "Nigeria", "Ghana", "Kenya", "Afrique du Sud", "France", "Belgique", "Suisse", "Canada",
  "États-Unis", "Royaume-Uni", "Espagne", "Portugal", "Brésil", "Allemagne", "Italie",
];

export default function Ideas() {
  const navigate = useNavigate();
  const [country, setCountry] = useState("");
  const [interest, setInterest] = useState("");
  const [language, setLanguage] = useState("fr");
  const [ideas, setIdeas] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function generate(e) {
    e.preventDefault();
    if (busy || !country.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`${API}/api/ideas`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: country.trim(), interest: interest.trim(), language }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur lors de la génération.");
      setIdeas(data.ideas || []);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  function createFrom(idea) {
    const q = new URLSearchParams({
      title: idea.title,
      description: idea.description,
      lang: language,
    });
    navigate(`/dashboard/ebooks/create?${q.toString()}`);
  }

  return (
    <DashboardLayout title="Idées de produits">
      <div className="dg-settings-wrap" style={{ maxWidth: "44rem" }}>
        <h1 className="text-2xl font-bold">Idées de produits</h1>
        <p className="dg-page__subtitle">
          Trouvez des niches adaptées à votre pays, puis créez l'eBook en un clic.
        </p>

        <form onSubmit={generate} style={{ marginTop: 16 }}>
          <Card>
            <div className="dg-field">
              <label className="dg-field__label">Pays ou public visé *</label>
              <input
                className="dg-field__input"
                list="ideas-countries"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Choisissez ou tapez un pays"
                required
                maxLength={60}
              />
              <datalist id="ideas-countries">
                {COUNTRIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div className="dg-field">
              <label className="dg-field__label">Votre centre d'intérêt (facultatif)</label>
              <input
                className="dg-field__input"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                placeholder="Ex : cuisine, argent, spiritualité, études..."
                maxLength={120}
              />
            </div>

            <Select label="Langue des idées et du livre" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </Select>

            {err && <div className="dg-alert dg-alert--error">{err}</div>}

            <Button type="submit" variant="primary" size="lg" disabled={busy} style={{ width: "100%" }}>
              {busy ? "Recherche d'idées..." : "✨ Trouver des idées"}
            </Button>
          </Card>
        </form>

        {ideas.length > 0 && (
          <>
            <p className="dg-helper-text" style={{ marginTop: 20 }}>
              Ces idées sont générées par IA pour vous inspirer. Ce ne sont pas des données de marché : vérifiez
              la demande réelle avant de vous lancer.
            </p>
            <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
              {ideas.map((idea, i) => (
                <Card key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <span className="dg-badge dg-badge--brand">{idea.niche}</span>
                    <span className="dg-pill">{idea.type === "formation" ? "Formation" : "eBook"}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{idea.title}</div>
                  <div style={{ fontSize: 14 }}>{idea.description}</div>
                  <div className="dg-helper-text" style={{ marginTop: 0 }}>{idea.why}</div>
                  <Button variant="primary" size="sm" onClick={() => createFrom(idea)}>
                    Créer cet eBook
                  </Button>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
        }
