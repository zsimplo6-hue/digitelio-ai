import { useState } from "react";
import {
  CURRENCIES,
  MAX_PRICE,
  currencyOf,
  formatPrice,
  getDefaultCurrency,
  saveDefaultCurrency,
} from "../utils/currency.js";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

/* Doit rester identique à worker/src/routes/ebook_publish.js (RATES_TO_XOF) */
const MIN_PRICE_XOF = 200;
const RATES_TO_XOF = {
  XOF: 1, XAF: 1, EUR: 655.957, USD: 605, GBP: 765, CAD: 440, CHF: 690,
  MAD: 60, DZD: 4.5, TND: 195, NGN: 0.39, GHS: 40, KES: 4.7, ZAR: 34,
  GNF: 0.07, CDF: 0.22,
};
function minPriceFor(currency) {
  const rate = RATES_TO_XOF[currency];
  if (!rate) return null;
  return Math.ceil(MIN_PRICE_XOF / rate);
}

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
  const startPrice = ebook.price;
  const startCurrency =
    startPrice == null ? getDefaultCurrency() : ebook.currency || "EUR";

  const [currency, setCurrency] = useState(startCurrency);
  const [price, setPrice] = useState(startPrice == null ? "" : String(startPrice));
  const [custom, setCustom] = useState(
    startPrice != null && !currencyOf(startCurrency).presets.includes(startPrice)
  );
  const [cover, setCover] = useState(ebook.cover_url || "");
  const [payCode, setPayCode] = useState(ebook.pay_code || "");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [payWarning, setPayWarning] = useState("");

  const cur = currencyOf(currency);
  const isPublished = ebook.status === "published";
  const hasContent = !!(ebook.content || "").trim();
  const priceNum = price === "" ? null : Number(price);
  const minPrice = minPriceFor(currency);
  const priceOk =
    priceNum !== null &&
    Number.isInteger(priceNum) &&
    priceNum >= 0 &&
    priceNum <= MAX_PRICE &&
    (minPrice === null || priceNum >= minPrice);
  const shareLink = `${window.location.origin}/ebook/${ebook.id}`;
  const payLink = payCode ? `${window.location.origin}/pay/${payCode}` : "";

  function pickPreset(p) {
    setCustom(false);
    setPrice(String(p));
  }

  function changeCurrency(code) {
    setCurrency(code);
    if (price !== "" && !currencyOf(code).presets.includes(Number(price))) {
      setCustom(true);
    }
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
    const data = await api(`/ebooks/${ebook.id}`, {
      method: "PUT",
      body: JSON.stringify({
        price: priceOk ? priceNum : null,
        currency,
        cover_url: cover || null,
      }),
    });
    saveDefaultCurrency(currency);
    if (data.ebook.pay_code) setPayCode(data.ebook.pay_code);
    setPayWarning(data.payment_warning || "");
    onChange({
      price: data.ebook.price,
      currency: data.ebook.currency,
      cover_url: data.ebook.cover_url,
      pay_code: data.ebook.pay_code,
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
      setErr(
        minPrice !== null
          ? `Choisissez un prix d'au moins ${formatPrice(minPrice, currency)} avant de publier.`
          : "Choisissez un prix avant de publier."
      );
      return;
    }
    if (!hasContent) {
      setErr("Générez d'abord le contenu de l'eBook.");
      return;
    }
    setBusy("publish");
    try {
      await saveSettings();
      const data = await api(`/ebooks/${ebook.id}/publish`, { method: "POST" });
      if (data.ebook?.pay_code) setPayCode(data.ebook.pay_code);
      onChange({ status: "published", pay_code: data.ebook?.pay_code });
      setMsg("eBook publié ✓ Votre page de vente est en ligne.");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  }

  async function handleUnpublish() {
    if (!window.confirm("Repasser cet eBook en brouillon ? Sa page de vente ne sera plus accessible.")) return;
    setBusy("unpublish");
    setErr("");
    setMsg("");
    try {
      await api(`/ebooks/${ebook.id}/unpublish`, { method: "POST" });
      onChange({ status: "draft" });
      setMsg("eBook repassé en brouillon.");
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

  async function copyPayLink() {
    setErr("");
    try {
      await navigator.clipboard.writeText(payLink);
      setMsg("Lien de paiement copié ✓");
    } catch {
      window.prompt("Copiez ce lien :", payLink);
    }
  }

  return (
    <div className="no-print" style={{ marginTop: 24 }}>
      <div className="dg-card" style={{ padding: "1.2rem", borderRadius: 14 }}>
        <div className="pb-head">
          <div className="dg-field__label" style={{ marginBottom: 0 }}>Publication</div>
          <span className={isPublished ? "pb-badge on" : "pb-badge"}>
            {isPublished ? "✓ Publié" : "Brouillon"}
          </span>
        </div>

        {/* Vérifications */}
        <ul className="pb-checks">
          <li className={hasContent ? "ok" : ""}>{hasContent ? "✓" : "○"} Contenu généré</li>
          <li className={priceOk ? "ok" : ""}>
            {priceOk
              ? `✓ Prix : ${formatPrice(priceNum, currency)}`
              : minPrice !== null
              ? `○ Prix défini (minimum ${formatPrice(minPrice, currency)})`
              : "○ Prix défini"}
          </li>
          <li className={cover ? "ok" : ""}>{cover ? "✓" : "○"} Image de couverture (recommandée)</li>
        </ul>

        {/* Monnaie */}
        <div className="dg-field__label" style={{ marginTop: "1.2rem" }}>Monnaie</div>
        <select
          className="dg-field__input"
          value={currency}
          onChange={(e) => changeCurrency(e.target.value)}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        <div className="dg-helper-text">
          Choisissez la monnaie de vos clients. Elle s'affiche sur votre page de vente.
        </div>

        {/* Prix */}
        <div className="dg-field__label" style={{ marginTop: "1.2rem" }}>Prix</div>
        <div className="pb-prices">
          {cur.presets.map((p) => (
            <button
              key={p}
              type="button"
              className={!custom && price === String(p) ? "pb-price on" : "pb-price"}
              onClick={() => pickPreset(p)}
            >
              {formatPrice(p, currency)}
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
            className="dg-field__input"
            type="number"
            inputMode="numeric"
            min="0"
            max={MAX_PRICE}
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={`Montant en ${cur.symbol}${minPrice !== null ? ` (minimum ${minPrice})` : ""}`}
            style={{ marginTop: "0.6rem" }}
          />
        )}
        {minPrice !== null && priceNum !== null && priceNum > 0 && priceNum < minPrice && (
          <div className="dg-alert dg-alert--warning" style={{ marginTop: "0.5rem" }}>
            Le prix minimum pour {cur.label} est {formatPrice(minPrice, currency)}.
          </div>
        )}

        {/* Couverture */}
        <div className="dg-field__label" style={{ marginTop: "1.2rem" }}>Image de couverture</div>
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

        {/* Page de vente */}
        <div className="dg-field__label" style={{ marginTop: "1.4rem" }}>Page de vente</div>
        {isPublished ? (
          <div className="pb-share">
            <input className="dg-field__input" value={shareLink} readOnly onFocus={(e) => e.target.select()} />
            <div className="pb-share-actions">
              <button type="button" className="dg-chip" onClick={copyLink}>
                📋 Copier le lien
              </button>
              <a className="dg-chip" href={shareLink} target="_blank" rel="noopener noreferrer">
                👁 Voir la page
              </a>
            </div>
          </div>
        ) : (
          <div className="dg-helper-text">
            Publiez l'eBook pour obtenir le lien de votre page de vente à partager.
          </div>
        )}

        {/* Lien de paiement (généré automatiquement) */}
        {isPublished && (
          <>
            <div className="dg-field__label" style={{ marginTop: "1.4rem" }}>Lien de paiement</div>
            {payLink ? (
              <div className="pb-share">
                <input className="dg-field__input" value={payLink} readOnly onFocus={(e) => e.target.select()} />
                <div className="pb-share-actions">
                  <button type="button" className="dg-chip" onClick={copyPayLink}>
                    📋 Copier le lien
                  </button>
                  <a className="dg-chip" href={payLink} target="_blank" rel="noopener noreferrer">
                    👁 Voir la page
                  </a>
                </div>
                <div className="dg-helper-text">
                  C'est le lien vers lequel renvoie le bouton « Acheter » de votre page de vente.
                </div>
              </div>
            ) : (
              <div className="dg-alert dg-alert--warning">
                Le lien de paiement n'a pas pu être créé. Enregistrez de nouveau les réglages.
              </div>
            )}
          </>
        )}
        {payWarning && <div className="dg-alert dg-alert--warning">{payWarning}</div>}

        {err && <div className="dg-alert dg-alert--error">{err}</div>}
        {msg && <div className="dg-alert dg-alert--success">{msg}</div>}

        <div className="fm-actions" style={{ marginTop: "1.2rem" }}>
          {!isPublished ? (
            <button className="fm-btn fm-btn-gold" style={{ marginBottom: 0 }} onClick={handlePublish} disabled={!!busy}>
              {busy === "publish" ? "Publication..." : "🚀 Publier l'eBook"}
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
          flex: 1; min-width: 5.5rem; padding: 0.7rem 0.4rem; border-radius: 10px; font-weight: 700;
          font-size: 0.9rem; border: 1px solid rgba(128,128,128,0.4); background: transparent; color: inherit;
        }
        .pb-price.on { background: #D4AF37; color: #0B0B0B; border-color: #D4AF37; }
        .pb-file { cursor: pointer; }
        .pb-share { display: grid; gap: 0.6rem; }
        .pb-share-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .pb-share-actions a { text-decoration: none; }
        .fm-actions { display: grid; gap: 0.6rem; }
        .fm-btn { width: 100%; padding: 0.85rem; border-radius: 10px; font-weight: 600; }
        .fm-btn:disabled { opacity: 0.5; }
        .fm-btn-gold { background: #D4AF37; color: #0B0B0B; }
        .fm-btn-outline { border: 1px solid rgba(128,128,128,0.45); background: transparent; color: inherit; }
      `}</style>
    </div>
  );
    }
