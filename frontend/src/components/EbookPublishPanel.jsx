import { useState } from "react";
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

export default function EbookPublishPanel({ ebook, onChange }) {
  const [cover, setCover] = useState(ebook.cover_url || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const hasContent = !!(ebook.content || "").trim();
  const changed = cover !== (ebook.cover_url || "");

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
      const data = await api(`/ebooks/${ebook.id}`, {
        method: "PUT",
        body: JSON.stringify({
          price: ebook.price ?? null,
          currency: ebook.currency || getDefaultCurrency(),
          cover_url: cover || null,
        }),
      });
      onChange({ cover_url: data.ebook.cover_url });
      setMsg("Couverture enregistrée ✓");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print" style={{ marginTop: 24 }}>
      <div className="dg-card" style={{ padding: "1.2rem", borderRadius: 14 }}>
        <div className="dg-field__label">Finalisation</div>

        <ul className="pb-checks">
          <li className={hasContent ? "ok" : ""}>{hasContent ? "✓" : "○"} Contenu généré</li>
          <li className={cover ? "ok" : ""}>{cover ? "✓" : "○"} Couverture de la page de vente</li>
        </ul>

        <div className="dg-field__label" style={{ marginTop: "1.2rem" }}>
          Couverture de la page de vente
        </div>
        <p className="dg-helper-text" style={{ marginTop: 0, marginBottom: 10 }}>
          Cette image s'affiche sur la page de vente de votre eBook. Pour obtenir une image 3D à publier sur
          les réseaux, utilisez « Mockup 3D de la couverture » ci-dessus, téléchargez-le, puis ajoutez-le ici
          avec « Changer l'image ».
        </p>
        {cover ? (
          <div className="dg-cover-box">
            <img src={cover} alt="Couverture de l'eBook" />
          </div>
        ) : (
          <div className="dg-cover-box dg-cover-box--empty">Aucune image</div>
        )}
        <div className="dg-cover-actions">
          <label className="dg-chip pb-file">
            {cover ? "Changer l'image" : "+ Ajouter une image"}
            <input type="file" accept="image/*" onChange={onCoverFile} hidden />
          </label>
          {cover && (
            <button type="button" className="dg-chip" onClick={() => setCover("")}>
              Retirer
            </button>
          )}
        </div>

        {err && <div className="dg-alert dg-alert--error">{err}</div>}
        {msg && !changed && <div className="dg-alert dg-alert--success">{msg}</div>}

        <div className="fm-actions" style={{ marginTop: "1.2rem" }}>
          <button className="btn-primary fm-btn" onClick={handleSave} disabled={busy || !changed}>
            {busy ? "Enregistrement..." : "💾 Enregistrer la couverture"}
          </button>
        </div>
      </div>

      <style>{`
        .pb-checks { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.3rem; font-size: 0.88rem; opacity: 0.85; }
        .pb-checks li.ok { color: #16a34a; opacity: 1; font-weight: 600; }
        .pb-file { cursor: pointer; }
        .fm-actions { display: grid; gap: 0.6rem; }
        .fm-btn { width: 100%; padding: 0.85rem; border-radius: 10px; font-weight: 600; }
        .fm-btn:disabled { opacity: 0.5; }
      `}</style>
    </div>
  );
  }
