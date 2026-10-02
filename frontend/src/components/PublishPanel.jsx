import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import FormationDoc, { printFormation } from "./FormationExport.jsx";
import CertificateDoc, { printCertificate } from "./CertificateExport.jsx";
import { getDefaultCurrency } from "../utils/currency.js";

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

function compressImage(file, maxW = 1000, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire l'image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image illisible."));
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const LANG_LABELS = {
  fr: "Français", en: "English", es: "Español", pt: "Português",
  de: "Deutsch", it: "Italiano", ar: "العربية",
};

export default function PublishPanel({ formation, onChange }) {
  const { user } = useAuth();
  const [cover, setCover] = useState(formation.cover_url || "");
  const [certificate, setCertificate] = useState(!!formation.certificate);
  const [learner, setLearner] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const language = LANG_LABELS[formation.language] ? formation.language : "fr";
  const modules = formation.modules || [];
  const written = modules.filter((m) => (m.content || "").trim()).length;
  const allWritten = modules.length > 0 && written === modules.length;

  async function onCoverFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    setMsg("");
    if (!file.type.startsWith("image/")) {
      setErr("Choisissez un fichier image (JPG, PNG ou WebP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErr("Image trop lourde (10 Mo maximum).");
      return;
    }
    try {
      let data = await compressImage(file, 1000, 0.82);
      if (data.length > 850000) data = await compressImage(file, 800, 0.6);
      setCover(data);
    } catch (e2) {
      setErr(e2.message);
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
            <li className={cover ? "ok" : ""}>
              {cover ? "✓" : "○"} Image de couverture (recommandée)
            </li>
          </ul>

          {/* Couverture */}
          <div className="fm-label" style={{ marginTop: "1.2rem" }}>Image de couverture</div>
          {cover ? (
            <div className="pb-cover">
              <img src={cover} alt="Couverture de la formation" />
            </div>
          ) : (
            <div className="pb-cover pb-cover-empty">Aucune image</div>
          )}
          <div className="pb-cover-actions">
            <label className="fm-chip pb-file">
              {cover ? "Changer l'image" : "+ Ajouter une image"}
              <input type="file" accept="image/*" onChange={onCoverFile} hidden />
            </label>
            {cover && (
              <button type="button" className="fm-chip" onClick={() => setCover("")}>
                Retirer
              </button>
            )}
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
            onClick={printFormation}
            disabled={written === 0}
          >
            📘 Télécharger la formation en PDF
          </button>
          <div className="fm-muted fm-small">
            Couverture premium, sommaire, modules enchaînés, vidéos et ressources cliquables.
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
          .pb-cover {
            width: 100%; aspect-ratio: 16 / 9; border-radius: 10px; overflow: hidden;
            border: 1px solid rgba(128,128,128,0.3);
          }
          .pb-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .pb-cover-empty {
            display: flex; align-items: center; justify-content: center;
            font-size: 0.85rem; opacity: 0.6; border-style: dashed;
          }
          .pb-cover-actions { display: flex; gap: 0.5rem; margin-top: 0.6rem; }
          .pb-file { cursor: pointer; }
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
      <FormationDoc formation={formation} language={language} />
      <CertificateDoc
        formation={formation}
        name={learner}
        instructor={user?.fullName}
        language={language}
      />
    </>
  );
    }
