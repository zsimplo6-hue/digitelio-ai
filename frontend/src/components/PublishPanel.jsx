import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import FormationDoc, { printFormation } from "./FormationExport.jsx";
import CertificateDoc, { printCertificate } from "./CertificateExport.jsx";
import TemplatePreview from "./TemplatePreview.jsx";
import { getDefaultCurrency } from "../utils/currency.js";
import {
  FORMATION_TEMPLATES,
  FORMATION_ORDER,
  formationFontsImport,
} from "../utils/formationTemplates.js";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

async function api(path, options = {}) {
  const res = await fetch(`${API}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Une erreur est survenue.");
  return data;
}

const LANG_LABELS = {
  fr: "Français", en: "English", es: "Español", pt: "Português",
  de: "Deutsch", it: "Italiano", ar: "العربية",
};

export default function PublishPanel({ formation, onChange }) {
  const { user } = useAuth();
  const cover = formation.cover_url || ""; // conservé tel quel (non modifiable ici)
  const [certificate, setCertificate] = useState(!!formation.certificate);
  const [learner, setLearner] = useState("");
  const [template, setTemplate] = useState("academy");
  const [brand, setBrand] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const language = LANG_LABELS[formation.language] ? formation.language : "fr";
  const modules = formation.modules || [];
  const written = modules.filter((m) => (m.content || "").trim()).length;
  const allWritten = modules.length > 0 && written === modules.length;

  useEffect(() => {
    api(`/formations/${formation.id}/style`)
      .then((d) => d.template && setTemplate(d.template))
      .catch(() => {});
    api("/brand")
      .then((d) => setBrand(d.brand || {}))
      .catch(() => {});
  }, [formation.id]);

  async function chooseTemplate(id) {
    const previous = template;
    setTemplate(id);
    setErr("");
    try {
      await api(`/formations/${formation.id}/style`, {
        method: "PUT",
        body: JSON.stringify({ template: id }),
      });
    } catch (e) {
      setTemplate(previous);
      setErr(e.message);
    }
  }

  async function handleSave() {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const data = await api(`/formations/${formation.id}`, {
        method: "PUT",
        body: JSON.stringify({
          price: formation.price ?? null,
          currency: formation.currency || getDefaultCurrency(),
          cover_url: cover || null,
          certificate,
        }),
      });
      onChange({
        cover_url: data.formation.cover_url,
        certificate: data.formation.certificate,
      });
      setMsg("Réglages enregistrés ✓");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="fm-screen no-print">
        <div className="fm-card">
          <div className="fm-label">Finalisation</div>

          <ul className="pb-checks">
            <li className={allWritten ? "ok" : ""}>
              {allWritten ? "✓" : "○"} Leçons rédigées : {written}/{modules.length}
            </li>
          </ul>

          {/* Modèle */}
          <div className="fm-label" style={{ marginTop: "1.2rem" }}>Modèle de la formation</div>
          <style>{formationFontsImport(FORMATION_ORDER)}</style>
          <div className="pb-tpls">
            {FORMATION_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                className="fm-chip"
                style={template === id ? { borderColor: "#D4AF37", background: "rgba(212,175,55,0.15)", fontWeight: 700 } : undefined}
                onClick={() => chooseTemplate(id)}
              >
                {FORMATION_TEMPLATES[id].name}
              </button>
            ))}
          </div>
          <div style={{ marginTop: "0.9rem" }}>
            <TemplatePreview
              kind="formation"
              templateId={template}
              brand={brand}
              title={formation.title}
              author={brand.author_name || ""}
              slogan={brand.tagline || ""}
              size="sm"
            />
          </div>
          <div className="fm-muted fm-small">
            Le modèle change la couverture, les polices et les couleurs du PDF.{" "}
            <Link to="/dashboard/templates" style={{ color: "#D4AF37", fontWeight: 600 }}>Voir la galerie</Link>
            {" · "}
            <Link to="/dashboard/brand" style={{ color: "#D4AF37", fontWeight: 600 }}>Mon style</Link>
          </div>

          {/* Certificat */}
          <label className="pb-cert">
            <input
              type="checkbox"
              checked={certificate}
              onChange={(e) => setCertificate(e.target.checked)}
            />
            <span>
              Inclure un certificat de réussite
              <small>Enregistrez les réglages pour conserver ce choix.</small>
            </span>
          </label>

          {certificate && (
            <div className="pb-certbox">
              <div className="fm-label">Créer un certificat</div>
              <input
                className="fm-input"
                value={learner}
                onChange={(e) => setLearner(e.target.value)}
                placeholder="Nom de l'apprenant (ex : Awa Traoré)"
                maxLength={60}
              />
              <button
                type="button"
                className="fm-btn fm-btn-outline"
                style={{ marginTop: "0.7rem" }}
                onClick={printCertificate}
                disabled={learner.trim().length < 2}
              >
                🎓 Télécharger le certificat (PDF)
              </button>
              <div className="fm-muted fm-small">
                Format paysage A4, signé au nom de {user?.fullName || "Digitelio AI"}. Langue du certificat :{" "}
                {LANG_LABELS[language]}.
              </div>
            </div>
          )}

          {/* Export PDF */}
          <div className="fm-label" style={{ marginTop: "1.4rem" }}>Export</div>
          <button
            type="button"
            className="fm-btn fm-btn-outline"
            onClick={() => printFormation(template, language)}
            disabled={written === 0}
          >
            📘 Télécharger la formation en PDF
          </button>
          <div className="fm-muted fm-small">
            Couverture premium, sommaire, modules enchaînés, vidéos, images et ressources cliquables.
            {!allWritten && written > 0 && ` ${modules.length - written} leçon(s) non rédigée(s) seront ignorées.`}
            {written === 0 && " Rédigez au moins une leçon pour activer l'export."}
          </div>

          {err && <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{err}</div>}
          {msg && <div className="fm-ok">{msg}</div>}

          <div className="fm-actions">
            <button className="btn-primary fm-btn" onClick={handleSave} disabled={busy}>
              {busy ? "Enregistrement..." : "💾 Enregistrer les réglages"}
            </button>
          </div>
        </div>

        <style>{`
          .pb-checks { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.3rem; font-size: 0.88rem; opacity: 0.85; }
          .pb-checks li.ok { color: #16a34a; opacity: 1; font-weight: 600; }
          .pb-tpls { display: flex; flex-wrap: wrap; gap: 0.5rem; }
          .pb-cert { display: flex; gap: 0.7rem; align-items: flex-start; margin-top: 1.2rem; cursor: pointer; }
          .pb-cert input { width: 1.2rem; height: 1.2rem; margin-top: 0.15rem; accent-color: #D4AF37; }
          .pb-cert span { display: flex; flex-direction: column; font-weight: 600; }
          .pb-cert small { font-weight: 400; opacity: 0.65; font-size: 0.78rem; }
          .pb-certbox {
            margin-top: 0.9rem; padding: 0.9rem; border-radius: 12px;
            border: 1px dashed rgba(212,175,55,0.6); background: rgba(212,175,55,0.06);
          }
        `}</style>
      </div>

      {/* Documents imprimés (invisibles à l'écran) */}
      <FormationDoc formation={formation} language={language} template={template} brand={brand} />
      <CertificateDoc
        formation={formation}
        name={learner}
        instructor={user?.fullName}
        language={language}
      />
    </>
  );
        }
