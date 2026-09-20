import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { formatPrice } from "../utils/currency.js";

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

const TYPES = [
  { id: "post", icon: "📱", label: "Post réseaux sociaux", hint: "Facebook, Instagram, LinkedIn" },
  { id: "tiktok", icon: "🎬", label: "Script TikTok / Reels", hint: "Vidéo de 30 à 45 secondes" },
  { id: "whatsapp", icon: "💬", label: "Message WhatsApp", hint: "Message ou statut" },
  { id: "email", icon: "✉️", label: "Email de vente", hint: "Objet et texte complet" },
  { id: "hooks", icon: "🔥", label: "10 accroches", hint: "À tester sur vos contenus" },
];

const TONES = [
  { id: "professionnel", label: "Professionnel" },
  { id: "amical", label: "Amical" },
  { id: "energique", label: "Énergique" },
  { id: "inspirant", label: "Inspirant" },
];

export default function Marketing() {
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formationId, setFormationId] = useState("");
  const [type, setType] = useState("post");
  const [tone, setTone] = useState("professionnel");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;
    api("/formations")
      .then((d) => {
        if (!alive) return;
        const list = d.formations || [];
        setFormations(list);
        const first = list.find((f) => f.status === "published") || list[0];
        if (first) setFormationId(first.id);
      })
      .catch((e) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const selected = formations.find((f) => f.id === formationId);
  const isPublished = selected?.status === "published";
  const link = selected ? `${window.location.origin}/formation/${selected.id}` : "";

  async function generate() {
    if (!formationId || busy) return;
    if (text.trim() && !window.confirm("Remplacer le texte actuel par un nouveau contenu ?")) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const data = await api("/marketing/generate", {
        method: "POST",
        body: JSON.stringify({
          formation_id: formationId,
          type,
          tone,
          link: isPublished ? link : "",
        }),
      });
      setText(data.text);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    setErr("");
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Texte copié ✓");
    } catch {
      window.prompt("Copiez ce texte :", text);
    }
  }

  const waHref = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <DashboardLayout>
      <div className="mk-page">
        <h1 className="text-2xl font-bold">Marketing digital</h1>
        <p className="mk-muted">
          Générez en quelques secondes vos textes de vente, à partir de votre vraie formation.
        </p>

        {loading ? (
          <p className="mk-muted" style={{ marginTop: "1.5rem" }}>Chargement...</p>
        ) : formations.length === 0 ? (
          <div className="mk-empty">
            <div className="mk-empty-icon">🎓</div>
            <p>Créez d'abord une formation pour générer vos contenus marketing.</p>
            <Link className="mk-gold" to="/dashboard/formations">Créer une formation</Link>
          </div>
        ) : (
          <>
            <div className="mk-card">
              <div className="mk-label">1. Formation à promouvoir</div>
              <select
                className="mk-input"
                value={formationId}
                onChange={(e) => setFormationId(e.target.value)}
              >
                {formations.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                    {f.price !== null && f.price !== undefined ? ` · ${formatPrice(f.price, f.currency)}` : ""}
                    {f.status === "published" ? "" : " (brouillon)"}
                  </option>
                ))}
              </select>
              {selected && !isPublished && (
                <div className="mk-note">
                  Cette formation n'est pas encore publiée : le texte sera écrit sans lien de page de
                  vente. Publiez-la pour l'inclure automatiquement.
                </div>
              )}
              {selected && isPublished && (
                <div className="mk-note mk-note-ok">✓ Le lien de votre page de vente sera inclus.</div>
              )}

              <div className="mk-label" style={{ marginTop: "1.3rem" }}>2. Format</div>
              <div className="mk-types">
                {TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={type === t.id ? "mk-type on" : "mk-type"}
                    onClick={() => setType(t.id)}
                  >
                    <span className="mk-type-icon">{t.icon}</span>
                    <span>
                      <span className="mk-type-name">{t.label}</span>
                      <span className="mk-type-hint">{t.hint}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="mk-label" style={{ marginTop: "1.3rem" }}>3. Ton</div>
              <div className="mk-tones">
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={tone === t.id ? "mk-tone on" : "mk-tone"}
                    onClick={() => setTone(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <button className="mk-gen" onClick={generate} disabled={busy || !formationId}>
                {busy ? "Rédaction en cours..." : text ? "🔁 Régénérer" : "✨ Générer le contenu"}
              </button>
            </div>

            {err && <div className="mk-err">{err}</div>}

            {text && (
              <div className="mk-card">
                <div className="mk-label">Votre contenu</div>
                <textarea
                  className="mk-input mk-textarea"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <div className="mk-count">{text.length} caractères</div>

                <div className="mk-actions">
                  <button type="button" className="mk-chip" onClick={copy}>
                    📋 Copier
                  </button>
                  <a className="mk-chip" href={waHref} target="_blank" rel="noopener noreferrer">
                    💬 Envoyer sur WhatsApp
                  </a>
                </div>
                {msg && <div className="mk-ok">{msg}</div>}
                <div className="mk-muted mk-small">
                  Relisez et adaptez le texte avant de le publier : il est généré par IA.
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .mk-page { max-width: 44rem; }
        .mk-muted { opacity: 0.7; margin-top: 0.4rem; }
        .mk-small { font-size: 0.8rem; margin-top: 0.8rem; }
        .mk-card {
          margin-top: 1.5rem; padding: 1.2rem; border-radius: 14px;
          background: rgba(128,128,128,0.10); border: 1px solid rgba(128,128,128,0.25);
        }
        .mk-label {
          font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #D4AF37; margin-bottom: 0.7rem;
        }
        .mk-input {
          width: 100%; padding: 0.8rem 1rem; border-radius: 10px; font-size: 1rem;
          background: rgba(128,128,128,0.12); border: 1px solid rgba(128,128,128,0.3);
          color: inherit; outline: none; font-family: inherit;
        }
        .mk-input:focus { border-color: #D4AF37; }
        .mk-textarea { min-height: 18rem; line-height: 1.65; font-size: 0.95rem; resize: vertical; }
        .mk-note { margin-top: 0.6rem; font-size: 0.82rem; opacity: 0.8; color: #d97706; }
        .mk-note-ok { color: #16a34a; }
        .mk-types { display: grid; gap: 0.5rem; }
        .mk-type {
          display: flex; gap: 0.8rem; align-items: center; text-align: left; padding: 0.7rem 0.9rem;
          border-radius: 12px; cursor: pointer; font-family: inherit; color: inherit;
          border: 1px solid rgba(128,128,128,0.35); background: transparent;
        }
        .mk-type.on { border-color: #D4AF37; background: rgba(212,175,55,0.1); }
        .mk-type-icon { font-size: 1.4rem; }
        .mk-type-name { display: block; font-weight: 700; }
        .mk-type-hint { display: block; font-size: 0.78rem; opacity: 0.7; }
        .mk-tones { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .mk-tone {
          padding: 0.5rem 0.95rem; border-radius: 999px; font-size: 0.88rem; cursor: pointer;
          border: 1px solid rgba(128,128,128,0.4); background: transparent; color: inherit; font-family: inherit;
        }
        .mk-tone.on { background: #D4AF37; color: #0B0B0B; border-color: #D4AF37; font-weight: 700; }
        .mk-gen {
          width: 100%; margin-top: 1.5rem; padding: 0.95rem; border-radius: 10px; border: 0;
          background: #D4AF37; color: #0B0B0B; font-weight: 700; font-size: 1rem; cursor: pointer;
          font-family: inherit;
        }
        .mk-gen:disabled { opacity: 0.55; }
        .mk-err {
          margin-top: 1rem; padding: 0.6rem 1rem; border-radius: 10px; font-size: 0.9rem;
          color: #ef4444; background: rgba(239,68,68,0.1);
        }
        .mk-count { font-size: 0.75rem; opacity: 0.6; margin-top: 0.4rem; text-align: right; }
        .mk-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.6rem; }
        .mk-chip {
          font-size: 0.85rem; padding: 0.5rem 0.9rem; border-radius: 999px; cursor: pointer;
          border: 1px solid rgba(128,128,128,0.4); background: transparent; color: inherit;
          text-decoration: none; font-family: inherit;
        }
        .mk-ok { margin-top: 0.7rem; color: #16a34a; font-size: 0.9rem; font-weight: 600; }
        .mk-empty { text-align: center; padding: 2.5rem 1rem; }
        .mk-empty-icon { font-size: 2.4rem; margin-bottom: 0.4rem; }
        .mk-empty p { opacity: 0.8; margin-bottom: 1rem; }
        .mk-gold {
          display: inline-block; padding: 0.8rem 1.2rem; border-radius: 10px; font-weight: 700;
          text-decoration: none; background: #D4AF37; color: #0B0B0B;
        }
      `}</style>
    </DashboardLayout>
  );
   }
