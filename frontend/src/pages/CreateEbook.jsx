import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input, Select } from "../components/ui/Field.jsx";
import { LANGUAGES } from "../utils/templates.js";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

async function postJSON(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur lors de la génération.");
  return data;
}

export default function CreateEbook() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [title, setTitle] = useState(params.get("title") || "");
  const [description, setDescription] = useState(params.get("description") || "");
  const [language, setLanguage] = useState(
    LANGUAGES.some((l) => l.id === params.get("lang")) ? params.get("lang") : "fr"
  );
  const [chapters, setChapters] = useState("8");
  const [phase, setPhase] = useState("idle"); // idle | plan | writing | done
  const [error, setError] = useState("");
  const [ebook, setEbook] = useState(null);
  const [sections, setSections] = useState([]);
  const [progress, setProgress] = useState({ done: 0, total: 0, current: "" });
  const [failed, setFailed] = useState([]);
  const [cancelled, setCancelled] = useState(false);
  const cancelRef = useRef(false);

  const busy = phase === "plan" || phase === "writing";
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const emptyCount = sections.filter((s) => !(s.content || "").trim()).length;

  async function writeSections(ebookId, list) {
    const targets = list.filter((s) => !(s.content || "").trim());
    cancelRef.current = false;
    setCancelled(false);
    setFailed([]);

    if (targets.length === 0) {
      setPhase("done");
      return;
    }

    setPhase("writing");
    setProgress({ done: 0, total: targets.length, current: targets[0].title });

    const failedTitles = [];
    let done = 0;
    let lastError = "";

    for (const s of targets) {
      if (cancelRef.current) break;
      setProgress({ done, total: targets.length, current: s.title });

      let ok = false;
      for (let attempt = 0; attempt < 2 && !ok; attempt++) {
        if (cancelRef.current) break;
        try {
          const data = await postJSON(`/api/ebooks/${ebookId}/sections/${s.id}/generate`);
          setSections((cur) =>
            cur.map((x) => (x.id === s.id ? { ...x, content: data.section.content } : x))
          );
          ok = true;
        } catch (e) {
          lastError = e.message;
        }
      }

      if (ok) done += 1;
      else if (!cancelRef.current) failedTitles.push(s.title);
    }

    setProgress({ done, total: targets.length, current: "" });
    setFailed(failedTitles);
    setCancelled(cancelRef.current);
    if (failedTitles.length > 0 && lastError) setError(lastError);
    setPhase("done");
  }

  async function handleGenerate(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setEbook(null);
    setSections([]);
    setFailed([]);
    setPhase("plan");

    try {
      const data = await postJSON("/api/generate/ebook", {
        title,
        description,
        language,
        chapters: Number(chapters),
      });
      setEbook(data.ebook);
      setSections(data.ebook.sections || []);
      await writeSections(data.ebook.id, data.ebook.sections || []);
    } catch (err) {
      setError(err.message);
      setPhase("idle");
    }
  }

  function stop() {
    cancelRef.current = true;
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
            disabled={busy}
          />

          <div className="dg-field">
            <label className="dg-field__label">Description *</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le sujet de votre eBook et à qui il s'adresse."
              className="dg-field__input"
              disabled={busy}
            />
          </div>

          <Select label="Langue du livre" value={language} onChange={(e) => setLanguage(e.target.value)} disabled={busy}>
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </Select>
          {language === "ar" && (
            <p className="dg-helper-text" style={{ marginTop: 0 }}>
              La qualité est un peu moins régulière en arabe : relisez bien le texte avant de le vendre.
            </p>
          )}

          <Select label="Longueur" value={chapters} onChange={(e) => setChapters(e.target.value)} disabled={busy}>
            <option value="5">Court : 5 chapitres</option>
            <option value="8">Standard : 8 chapitres</option>
            <option value="12">Complet : 12 chapitres</option>
          </Select>

          {error && <div className="dg-alert dg-alert--error">{error}</div>}

          <Button type="submit" variant="primary" size="lg" disabled={busy} style={{ width: "100%" }}>
            {phase === "plan"
              ? "Création du plan..."
              : phase === "writing"
              ? "Rédaction en cours..."
              : "Générer l'eBook complet avec l'IA"}
          </Button>
        </Card>
      </form>

      {phase === "writing" && (
        <Card className="dg-mt-6" style={{ maxWidth: "42rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
            <span>
              Partie {Math.min(progress.done + 1, progress.total)} sur {progress.total}
            </span>
            <span>{percent}%</span>
          </div>
          <div style={{ height: 10, borderRadius: 999, overflow: "hidden", background: "rgba(128,128,128,0.25)" }}>
            <div
              style={{
                height: "100%",
                width: `${Math.max(percent, 4)}%`,
                background: "#D4AF37",
                borderRadius: 999,
                transition: "width 0.6s ease",
              }}
            />
          </div>
          <p style={{ fontSize: 13, opacity: 0.75, marginTop: 8 }}>
            Rédaction : {progress.current}. Gardez cette page ouverte et l'écran allumé : comptez environ 20 à 30
            secondes par partie.
          </p>
          <button type="button" className="dg-chip" onClick={stop} style={{ marginTop: 8 }}>
            ⏹ Arrêter
          </button>
        </Card>
      )}

      {ebook && (phase === "writing" || phase === "done") && (
        <Card className="dg-mt-6" style={{ maxWidth: "42rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <h2 className="dg-card__title" style={{ fontSize: 20 }}>{ebook.title}</h2>
            {phase === "done" && (
              <Button variant="primary" size="sm" onClick={() => navigate(`/dashboard/ebooks/${ebook.id}`)}>
                Voir & télécharger en PDF
              </Button>
            )}
          </div>

          <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gap: 6, fontSize: 14 }}>
            {sections.map((s) => {
              const written = !!(s.content || "").trim();
              return (
                <li key={s.id} style={{ color: written ? "#16a34a" : undefined, opacity: written ? 1 : 0.7 }}>
                  {written ? "✓" : "○"} {s.title}
                </li>
              );
            })}
          </ul>

          {phase === "done" && cancelled && (
            <div className="dg-alert dg-alert--warning" style={{ marginTop: 12 }}>
              Génération arrêtée. Il reste {emptyCount} partie(s) à rédiger.
            </div>
          )}
          {phase === "done" && !cancelled && failed.length > 0 && (
            <div className="dg-alert dg-alert--warning" style={{ marginTop: 12 }}>
              {failed.length} partie(s) n'ont pas pu être rédigées. Relancez pour compléter.
            </div>
          )}
          {phase === "done" && !cancelled && failed.length === 0 && emptyCount === 0 && (
            <div className="dg-alert dg-alert--success" style={{ marginTop: 12 }}>
              ✓ eBook complet. Ouvrez-le pour relire, choisir un modèle, ajouter des images et télécharger le PDF.
            </div>
          )}

          {phase === "done" && emptyCount > 0 && (
            <Button
              variant="primary"
              size="sm"
              style={{ marginTop: 12 }}
              onClick={() => {
                setError("");
                writeSections(ebook.id, sections);
              }}
            >
              🔁 Rédiger les parties manquantes
            </Button>
          )}
        </Card>
      )}
    </DashboardLayout>
  );
      }
