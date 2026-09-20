import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import FormationDoc, { printFormation } from "./FormationExport.jsx";
import CertificateDoc, { printCertificate } from "./CertificateExport.jsx";
import LearnersPanel from "./LearnersPanel.jsx";

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

const PRESETS = [19, 49, 99];

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

export default function PublishPanel({ formation, onChange }) {
  const { user } = useAuth();
  const startPrice = formation.price;
  const [price, setPrice] = useState(startPrice == null ? "" : String(startPrice));
  const [custom, setCustom] = useState(startPrice != null && !PRESETS.includes(startPrice));
  const [cover, setCover] = useState(formation.cover_url || "");
  const [certificate, setCertificate] = useState(!!formation.certificate);
  const [payment, setPayment] = useState(formation.payment_url || "");
  const [learner, setLearner] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const isPublished = formation.status === "published";
  const modules = formation.modules || [];
  const written = modules.filter((m) => (m.content || "").trim()).length;
  const allWritten = modules.length > 0 && written === modules.length;
  const priceNum = price === "" ? null : Number(price);
  const priceOk = priceNum !== null && Number.isInteger(priceNum) && priceNum >= 0 && priceNum <= 9999;
  const payTrim = payment.trim();
  const payOk = /^https:\/\/\S+$/i.test(payTrim);
  const shareLink = `${window.location.origin}/formation/${formation.id}`;

  function pickPreset(p) {
    setCustom(false);
    setPrice(String(p));
  }

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

  async function saveSettings() {
    if (payTrim && !payOk) {
      throw new Error("Le lien de paiement doit commencer par https://");
    }
    const data = await api(`/formations/${formation.id}`, {
      method: "PUT",
      body: JSON.stringify({
        price: priceOk ? priceNum : null,
        cover_url: cover || null,
        certificate,
        payment_url: payTrim || null,
      }),
    });
    onChange({
      price: data.formation.price,
      cover_url: data.formation.cover_url,
      certificate: data.formation.certificate,
      payment_url: data.formation.payment_url,
    });
  }

  async function handleSave() {
    setBusy("save");
    setErr("");
    setMsg("");
    try {
      await saveSettings();
      setMsg("Réglages enregistrés ✓");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  }

  async function handlePublish() {
    setErr("");
    setMsg("");
    if (!priceOk) {
      setErr("Choisissez un prix avant de publier.");
      return;
    }
    if (!allWritten) {
      setErr("Rédigez d'abord toutes les leçons (bouton « Générer toute la formation »).");
      return;
    }
    setBusy("publish");
    try {
      await saveSettings();
      await api(`/formations/${formation.id}/publish`, { method: "POST" });
      onChange({ status: "published" });
      setMsg("Formation publiée ✓ Votre page de vente est en ligne.");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  }

  async function handleUnpublish() {
    if (!window.confirm("Repasser cette formation en brouillon ? Sa page de vente ne sera plus accessible.")) return;
    setBusy("unpublish");
    setErr("");
    setMsg("");
    try {
      await api(`/formations/${formation.id}/unpublish`, { method: "POST" });
      onChange({ status: "draft" });
      setMsg("Formation repassée en brouillon.");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  }

  async function copyLink() {
    setErr("");
    try {
      await navigator.clipboard.writeText(shareLink);
      setMsg("Lien copié ✓");
    } catch {
      window.prompt("Copiez ce lien :", shareLink);
    }
  }

  return (
    <>
      <div className="fm-screen no-print">
        <div className="fm-card">
          <div className="pb-head">
            <div className="fm-label" style={{ marginBottom: 0 }}>Publication</div>
            <span className={isPublished ? "pb-badge on" : "pb-badge"}>
              {isPublished ? "✓ Publiée" : "Brouillon"}
            </span>
          </div>

          {/* Vérifications */}
          <ul className="pb-checks">
            <li className={allWritten ? "ok" : ""}>
              {allWritten ? "✓" : "○"} Leçons rédigées : {written}/{modules.length}
            </li>
            <li className={priceOk ? "ok" : ""}>{priceOk ? "✓" : "○"} Prix défini</li>
            <li className={cover ? "ok" : ""}>{cover ? "✓" : "○"} Image de couverture (recommandée)</li>
            <li className={payOk ? "ok" : ""}>{payOk ? "✓" : "○"} Lien de paiement (pour vendre)</li>
          </ul>

          {/* Prix */}
          <div className="fm-label" style={{ marginTop: "1.2rem" }}>Prix</div>
          <div className="pb-prices">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className={!custom && price === String(p) ? "pb-price on" : "pb-price"}
                onClick={() => pickPreset(p)}
              >
                {p} €
              </button>
            ))}
            <button
              type="button"
              className={custom ? "pb-price on" : "pb-price"}
              onClick={() => setCustom(true)}
            >
              Autre
            </button>
          </div>
          {custom && (
            <input
              className="fm-input"
              type="number"
              inputMode="numeric"
              min="0"
              max="9999"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Montant en € (0 = gratuit)"
              style={{ marginTop: "0.6rem" }}
            />
          )}

          {/* Lien de paiement */}
          <div className="fm-label" style={{ marginTop: "1.2rem" }}>Lien de paiement</div>
          <input
            className="fm-input"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
            placeholder="https://... (Stripe, PayPal, Wave, Mobile Money...)"
            inputMode="url"
          />
          <div className="fm-muted fm-small">
            Le bouton « Acheter » de votre page de vente renverra vers ce lien. Créez-le chez votre
            prestataire de paiement (lien de paiement Stripe, PayPal.me, etc.).
          </div>

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
              Délivrer un certificat de réussite
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
                Format paysage A4, signé au nom de {user?.fullName || "Digitelio AI"}. Vos apprenants
                peuvent aussi le télécharger eux-mêmes à la fin de leur formation.
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

          {/* Page de vente */}
          <div className="fm-label" style={{ marginTop: "1.4rem" }}>Page de vente</div>
          {isPublished ? (
            <div className="pb-share">
              <input className="fm-input" value={shareLink} readOnly onFocus={(e) => e.target.select()} />
              <div className="pb-share-actions">
                <button type="button" className="fm-chip" onClick={copyLink}>
                  📋 Copier le lien
                </button>
                <a className="fm-chip" href={shareLink} target="_blank" rel="noopener noreferrer">
                  👁 Voir la page
                </a>
              </div>
              {!payOk && (
                <div className="fm-warn">
                  Ajoutez un lien de paiement puis enregistrez les réglages, sinon le bouton d'achat
                  restera inactif.
                </div>
              )}
            </div>
          ) : (
            <div className="fm-muted fm-small">
              Publiez la formation pour obtenir le lien de votre page de vente à partager.
            </div>
          )}

          {err && <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{err}</div>}
          {msg && <div className="fm-ok">{msg}</div>}

          <div className="fm-actions">
            {!isPublished ? (
              <button className="fm-btn fm-btn-gold" style={{ marginBottom: 0 }} onClick={handlePublish} disabled={!!busy}>
                {busy === "publish" ? "Publication..." : "🚀 Publier la formation"}
              </button>
            ) : (
              <button className="fm-btn fm-btn-outline" onClick={handleUnpublish} disabled={!!busy}>
                {busy === "unpublish" ? "..." : "Repasser en brouillon"}
              </button>
            )}
            <button className="btn-primary fm-btn" onClick={handleSave} disabled={!!busy}>
              {busy === "save" ? "Enregistrement..." : "💾 Enregistrer les réglages"}
            </button>
          </div>
        </div>

        <style>{`
          .pb-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.8rem; }
          .pb-badge {
            font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.7rem; border-radius: 999px;
            border: 1px solid rgba(128,128,128,0.4);
          }
          .pb-badge.on { background: #16a34a; color: #fff; border-color: #16a34a; }
          .pb-checks { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.3rem; font-size: 0.88rem; opacity: 0.85; }
          .pb-checks li.ok { color: #16a34a; opacity: 1; font-weight: 600; }
          .pb-prices { display: flex; flex-wrap: wrap; gap: 0.5rem; }
          .pb-price {
            flex: 1; min-width: 4.5rem; padding: 0.7rem 0.5rem; border-radius: 10px; font-weight: 700;
            border: 1px solid rgba(128,128,128,0.4); background: transparent; color: inherit;
          }
          .pb-price.on { background: #D4AF37; color: #0B0B0B; border-color: #D4AF37; }
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
          .pb-share { display: grid; gap: 0.6rem; }
          .pb-share-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
          .pb-share-actions a { text-decoration: none; }
        `}</style>
      </div>

      {/* Apprenants */}
      <LearnersPanel formation={formation} />

      {/* Documents imprimés (invisibles à l'écran) */}
      <FormationDoc formation={formation} />
      <CertificateDoc formation={formation} name={learner} instructor={user?.fullName} />
    </>
  );
          }
