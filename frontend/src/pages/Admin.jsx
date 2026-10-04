import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";
const REFRESH_MS = 15000;

const fcfa = (v) => `${Number(v || 0).toLocaleString("fr-FR")} FCFA`;
const nb = (v) => Number(v || 0).toLocaleString("fr-FR");
const when = (s) => {
  if (!s) return "";
  const d = new Date(String(s).includes("T") ? s : String(s).replace(" ", "T") + "Z");
  return isNaN(d.getTime()) ? "" : d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

export default function Admin() {
  const [data, setData] = useState(null);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(null);
  const timer = useRef(null);

  async function load() {
    try {
      const res = await fetch(`${API}/api/admin/stats`, { credentials: "include" });
      if (res.status === 404 || res.status === 401 || res.status === 403) {
        setDenied(true);
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Erreur de chargement.");
      setData(json);
      setError("");
      setUpdated(new Date());
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    document.title = "Admin";
    load();
    const tick = () => {
      if (document.visibilityState === "visible") load();
    };
    timer.current = setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer.current);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  if (denied) {
    return (
      <div className="ad-root">
        <div className="ad-center">
          <h1>Page introuvable</h1>
          <Link to="/dashboard">Retour</Link>
        </div>
        <AdStyle />
      </div>
    );
  }

  const p = data?.plans;
  const paidTotal = p ? p.pro + p.business : 0;

  return (
    <div className="ad-root">
      <div className="ad-wrap">
        <header className="ad-head">
          <div>
            <h1>Tableau de bord admin</h1>
            <div className="ad-live">
              <span className="ad-dot" /> Mise à jour automatique toutes les {REFRESH_MS / 1000} s
              {updated && <> · dernière : {updated.toLocaleTimeString("fr-FR")}</>}
            </div>
          </div>
          <Link to="/dashboard" className="ad-back">← Application</Link>
        </header>

        {error && <div className="ad-err">{error}</div>}
        {!data && !error && <p className="ad-muted">Chargement...</p>}

        {data && (
          <>
            <div className="ad-grid">
              <div className="ad-card">
                <div className="ad-k">Utilisateurs</div>
                <div className="ad-v">{nb(data.users.total)}</div>
                <div className="ad-s">+{nb(data.users.new_24h)} en 24 h · +{nb(data.users.new_7d)} en 7 jours</div>
              </div>
              <div className="ad-card">
                <div className="ad-k">Abonnés payants actifs</div>
                <div className="ad-v">{nb(paidTotal)}</div>
                <div className="ad-s">{nb(p.expired)} abonnement(s) expiré(s)</div>
              </div>
              <div className="ad-card gold">
                <div className="ad-k">Revenu mensuel estimé</div>
                <div className="ad-v">{fcfa(data.mrr_xof)}</div>
                <div className="ad-s">Abonnés actifs × prix du plan</div>
              </div>
              <div className="ad-card gold">
                <div className="ad-k">Total encaissé</div>
                <div className="ad-v">{fcfa(data.revenue.total_xof)}</div>
                <div className="ad-s">
                  {nb(data.revenue.payments_count)} paiement(s) · {fcfa(data.revenue.last_30d_xof)} sur 30 jours
                </div>
              </div>
            </div>

            <h2>Abonnés par plan</h2>
            <div className="ad-grid three">
              {[
                { key: "free", name: "Gratuit", n: p.free, price: 0 },
                { key: "pro", name: "Pro", n: p.pro, price: data.prices.pro },
                { key: "business", name: "Business", n: p.business, price: data.prices.business },
              ].map((x) => {
                const pay = data.revenue.by_plan[x.key];
                return (
                  <div key={x.key} className="ad-card">
                    <div className="ad-k">{x.name}</div>
                    <div className="ad-v">{nb(x.n)}</div>
                    {x.key !== "free" ? (
                      <>
                        <div className="ad-s">Actifs : {fcfa(x.n * x.price)} / mois</div>
                        <div className="ad-s">Encaissé : {fcfa(pay?.total_xof || 0)} ({nb(pay?.count || 0)})</div>
                      </>
                    ) : (
                      <div className="ad-s">Comptes sans abonnement payant</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="ad-cols">
              <div>
                <h2>Derniers paiements</h2>
                <div className="ad-list">
                  {data.recent_payments.length === 0 && <div className="ad-muted">Aucun paiement enregistré pour l'instant.</div>}
                  {data.recent_payments.map((r, i) => (
                    <div key={i} className="ad-row">
                      <div>
                        <b>{r.email}</b>
                        <div className="ad-s">{r.plan === "pro" ? "Pro" : "Business"} · {when(r.created_at)}</div>
                      </div>
                      <b>{fcfa(r.amount_xof)}</b>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2>Dernières inscriptions</h2>
                <div className="ad-list">
                  {data.recent_signups.length === 0 && <div className="ad-muted">Aucune donnée.</div>}
                  {data.recent_signups.map((r, i) => (
                    <div key={i} className="ad-row">
                      <div>
                        <b>{r.full_name || "—"}</b>
                        <div className="ad-s">{r.email}</div>
                      </div>
                      <span className="ad-s">{when(r.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="ad-note">
              « Total encaissé » compte les paiements enregistrés depuis l'activation de ce tableau de bord. Le
              revenu mensuel estimé est calculé sur les abonnements actifs.
            </p>
          </>
        )}
      </div>
      <AdStyle />
    </div>
  );
}

function AdStyle() {
  return (
    <style>{`
      .ad-root { min-height: 100vh; background: #0B0B14; color: #F2F2F8; font-family: 'Inter', system-ui, sans-serif; padding: 1.2rem; box-sizing: border-box; }
      .ad-wrap { max-width: 70rem; margin: 0 auto; }
      .ad-center { text-align: center; margin: 30vh auto 0; }
      .ad-center a { color: #A78BFA; }
      .ad-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.2rem; }
      .ad-head h1 { font-size: 1.5rem; font-weight: 800; margin: 0; }
      .ad-back { color: #A78BFA; text-decoration: none; font-weight: 600; font-size: 0.9rem; }
      .ad-live { margin-top: 0.4rem; font-size: 0.78rem; opacity: 0.7; display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
      .ad-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; animation: ad-pulse 1.6s ease-in-out infinite; }
      @keyframes ad-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      .ad-grid { display: grid; gap: 0.9rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
      .ad-grid.three { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
      .ad-card { padding: 1.1rem; border-radius: 18px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); }
      .ad-card.gold { border-color: rgba(212,175,55,0.5); background: rgba(212,175,55,0.07); }
      .ad-k { font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.7; font-weight: 700; }
      .ad-v { font-size: 1.8rem; font-weight: 800; margin: 0.3rem 0; font-variant-numeric: tabular-nums; }
      .ad-s { font-size: 0.78rem; opacity: 0.7; line-height: 1.5; }
      h2 { font-size: 1rem; font-weight: 800; margin: 1.8rem 0 0.8rem; color: #D4AF37; }
      .ad-cols { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
      .ad-list { display: grid; gap: 0.5rem; }
      .ad-row { display: flex; justify-content: space-between; align-items: center; gap: 0.8rem; padding: 0.7rem 0.9rem; border-radius: 12px; background: rgba(255,255,255,0.05); font-size: 0.88rem; word-break: break-word; }
      .ad-muted { opacity: 0.6; font-size: 0.88rem; }
      .ad-err { padding: 0.7rem 1rem; border-radius: 12px; background: rgba(239,68,68,0.12); color: #fca5a5; margin-bottom: 1rem; }
      .ad-note { margin-top: 1.6rem; font-size: 0.78rem; opacity: 0.55; line-height: 1.6; }
    `}</style>
  );
                                                              }
