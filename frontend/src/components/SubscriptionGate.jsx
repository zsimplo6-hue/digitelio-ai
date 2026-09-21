import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "./DashboardLayout.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

function fmtDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmtShort(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} j ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

export default function SubscriptionGate({ children }) {
  const [state, setState] = useState({ loading: true, data: null });

  useEffect(() => {
    let alive = true;
    fetch(`${API}/api/billing`, { credentials: "include" })
      .then(async (res) => ({ ok: res.ok, json: await res.json().catch(() => ({})) }))
      .then(({ ok, json }) => alive && setState({ loading: false, data: ok ? json : null }))
      .catch(() => alive && setState({ loading: false, data: null }));
    return () => {
      alive = false;
    };
  }, []);

  if (state.loading) {
    return <div className="min-h-screen bg-white dark:bg-digi-navy" />;
  }

  const d = state.data;

  /* ===== ABONNEMENT EXPIRÉ : la page est bloquée ===== */
  if (d?.expired) {
    return (
      <DashboardLayout>
        <div className="sg-box">
          <div className="sg-icon">⏳</div>
          <h1 className="sg-title">Votre abonnement a expiré</h1>
          <p className="sg-text">
            Votre abonnement {d.expired_plan_name} s'est terminé le <b>{fmtDateTime(d.until)}</b>.
          </p>
          <p className="sg-text">
            Pour continuer à utiliser Digitelio AI, renouvelez votre abonnement. Tous vos contenus sont
            conservés, et vos pages de vente restent en ligne pour vos clients.
          </p>
          <Link className="sg-btn" to="/dashboard/abonnements">
            🔄 Renouveler mon abonnement
          </Link>
        </div>

        <style>{`
          .sg-box {
            max-width: 32rem; margin: 2.5rem auto 0; padding: 2rem 1.4rem; text-align: center;
            border-radius: 16px; border: 1px solid rgba(239,68,68,0.5); background: rgba(239,68,68,0.06);
          }
          .sg-icon { font-size: 2.8rem; }
          .sg-title { font-size: 1.4rem; font-weight: 800; margin: 0.4rem 0 1rem; }
          .sg-text { opacity: 0.85; line-height: 1.7; margin-bottom: 0.9rem; }
          .sg-btn {
            display: block; margin-top: 1.4rem; padding: 0.95rem; border-radius: 10px; font-weight: 700;
            text-decoration: none; background: #D4AF37; color: #0B0B0B;
          }
        `}</style>
      </DashboardLayout>
    );
  }

  /* ===== Abonnement actif qui expire bientôt : barre discrète en bas ===== */
  let soonMs = null;
  if (d?.status === "active" && d.until) {
    const left = Date.parse(d.until) - Date.parse(d.server_time);
    if (left > 0 && left <= 3 * 24 * 60 * 60 * 1000) soonMs = left;
  }

  return (
    <>
      {children}
      {soonMs !== null && (
        <div className="sg-bar">
          <span>⏳ Votre abonnement expire dans {fmtShort(soonMs)}.</span>
          <Link to="/dashboard/abonnements">Renouveler</Link>
          <style>{`
            .sg-bar {
              position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
              display: flex; align-items: center; justify-content: center; gap: 0.8rem; flex-wrap: wrap;
              padding: 0.7rem 1rem; font-size: 0.85rem; font-weight: 600;
              background: #D4AF37; color: #0B0B0B;
            }
            .sg-bar a {
              padding: 0.3rem 0.9rem; border-radius: 999px; background: #0B0B0B; color: #D4AF37;
              text-decoration: none; font-weight: 700;
            }
          `}</style>
        </div>
      )}
    </>
  );
}
