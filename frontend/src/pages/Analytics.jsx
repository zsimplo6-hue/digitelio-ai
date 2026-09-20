import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

const PERIODS = [
  { days: 7, label: "7 jours" },
  { days: 30, label: "30 jours" },
  { days: 90, label: "90 jours" },
];

function rate(clicks, views) {
  if (!views) return "—";
  return `${((clicks / views) * 100).toFixed(1).replace(".", ",")} %`;
}

function shortDate(day) {
  const d = new Date(`${day}T00:00:00Z`);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
}

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [formationId, setFormationId] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    const qs = new URLSearchParams({ days: String(days) });
    if (formationId) qs.set("formation_id", formationId);
    fetch(`${API}/api/analytics?${qs}`, { credentials: "include" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Erreur de chargement.");
        if (alive) setData(json);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [days, formationId]);

  const formations = data?.formations || [];
  const series = data?.series || [];
  const t = data?.totals;
  const max = Math.max(1, ...series.map((s) => s.views));
  const noPages = !loading && data && formations.length === 0;

  return (
    <DashboardLayout>
      <div className="an-page">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="an-muted">
          Mesurez les visites de vos pages de vente et les clics sur le bouton d'achat.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</div>
        )}

        {noPages ? (
          <div className="an-empty">
            <div className="an-empty-icon">📈</div>
            <p>Publiez une formation pour commencer à mesurer vos visites.</p>
            <Link className="an-gold" to="/dashboard/formations">Mes formations</Link>
          </div>
        ) : (
          <>
            <div className="an-filters">
              <div className="an-periods">
                {PERIODS.map((p) => (
                  <button
                    key={p.days}
                    type="button"
                    className={days === p.days ? "an-per on" : "an-per"}
                    onClick={() => setDays(p.days)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <select
                className="an-select"
                value={formationId}
                onChange={(e) => setFormationId(e.target.value)}
              >
                <option value="">Toutes les formations</option>
                {formations.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="an-stats">
              <div className="an-stat">
                <div className="an-n">{loading ? "…" : t?.views ?? 0}</div>
                <div className="an-l">👁 Visites</div>
              </div>
              <div className="an-stat">
                <div className="an-n">{loading ? "…" : t?.uniques ?? 0}</div>
                <div className="an-l">👤 Visiteurs uniques</div>
              </div>
              <div className="an-stat">
                <div className="an-n">{loading ? "…" : t?.clicks ?? 0}</div>
                <div className="an-l">🛒 Clics « Acheter »</div>
              </div>
              <div className="an-stat">
                <div className="an-n">{loading ? "…" : rate(t?.clicks ?? 0, t?.views ?? 0)}</div>
                <div className="an-l">🎯 Taux de clic</div>
              </div>
            </div>

            <div className="an-label">Visites par jour</div>
            <div className="an-card">
              <div className="an-chart">
                {series.map((s) => (
                  <div key={s.day} className="an-col" title={`${shortDate(s.day)} : ${s.views} visite(s), ${s.clicks} clic(s)`}>
                    <div
                      className="an-bar"
                      style={{ height: s.views ? `${Math.max(4, (s.views / max) * 100)}%` : "0" }}
                    >
                      <div
                        className="an-click"
                        style={{ height: s.views ? `${Math.min(100, (s.clicks / s.views) * 100)}%` : "0" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="an-axis">
                <span>{series[0] ? shortDate(series[0].day) : ""}</span>
                <span>Max : {max} visite{max > 1 ? "s" : ""}/jour</span>
                <span>{series.length ? shortDate(series[series.length - 1].day) : ""}</span>
              </div>
              <div className="an-legend">
                <span><i className="an-dot gold" /> Visites</span>
                <span><i className="an-dot green" /> Part de clics</span>
              </div>
            </div>

            <div className="an-label">Par formation</div>
            <div className="an-list">
              {formations.map((f) => (
                <div key={f.id} className="an-item">
                  <div className="an-item-title">{f.title}</div>
                  <div className="an-grid">
                    <div><b>{f.views}</b><span>Visites</span></div>
                    <div><b>{f.uniques}</b><span>Uniques</span></div>
                    <div><b>{f.clicks}</b><span>Clics</span></div>
                    <div><b>{rate(f.clicks, f.views)}</b><span>Taux</span></div>
                    <div><b>{f.learners}</b><span>Apprenants</span></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="an-muted an-small">
              Les statistiques démarrent à partir de la mise en ligne de cette fonction. Vos propres
              visites (connecté) et les robots ne sont pas comptés. Les visiteurs uniques sont estimés
              par navigateur. Le taux de clic = clics « Acheter » ÷ visites.
            </div>
          </>
        )}
      </div>

      <style>{`
        .an-page { max-width: 46rem; }
        .an-muted { opacity: 0.7; margin-top: 0.4rem; }
        .an-small { font-size: 0.78rem; margin-top: 1.4rem; line-height: 1.6; }
        .an-label {
          font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #D4AF37; margin: 1.8rem 0 0.8rem;
        }
        .an-filters { display: grid; gap: 0.7rem; margin-top: 1.4rem; }
        .an-periods { display: flex; gap: 0.5rem; }
        .an-per {
          flex: 1; padding: 0.55rem 0.4rem; border-radius: 10px; font-weight: 600; font-size: 0.88rem;
          border: 1px solid rgba(128,128,128,0.4); background: transparent; color: inherit; cursor: pointer;
        }
        .an-per.on { background: #D4AF37; color: #0B0B0B; border-color: #D4AF37; }
        .an-select {
          width: 100%; padding: 0.7rem 0.9rem; border-radius: 10px; font-size: 0.95rem;
          background: rgba(128,128,128,0.12); border: 1px solid rgba(128,128,128,0.3);
          color: inherit; outline: none; font-family: inherit;
        }
        .an-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.7rem; margin-top: 1.2rem; }
        .an-stat {
          padding: 1rem; border-radius: 14px; text-align: center;
          background: rgba(128,128,128,0.10); border: 1px solid rgba(128,128,128,0.25);
        }
        .an-n { font-size: 1.7rem; font-weight: 800; color: #D4AF37; line-height: 1.2; }
        .an-l { font-size: 0.78rem; opacity: 0.8; margin-top: 0.25rem; }

        .an-card {
          padding: 1rem; border-radius: 14px;
          background: rgba(128,128,128,0.10); border: 1px solid rgba(128,128,128,0.25);
        }
        .an-chart { display: flex; align-items: flex-end; gap: 1px; height: 9rem; }
        .an-col { flex: 1; height: 100%; display: flex; align-items: flex-end; min-width: 0; }
        .an-bar {
          width: 100%; background: #D4AF37; border-radius: 2px 2px 0 0;
          display: flex; align-items: flex-end;
        }
        .an-click { width: 100%; background: #16a34a; border-radius: 0; }
        .an-axis {
          display: flex; justify-content: space-between; gap: 0.5rem;
          font-size: 0.7rem; opacity: 0.65; margin-top: 0.5rem;
        }
        .an-legend { display: flex; gap: 1rem; font-size: 0.75rem; opacity: 0.8; margin-top: 0.6rem; }
        .an-dot { display: inline-block; width: 0.6rem; height: 0.6rem; border-radius: 2px; margin-right: 0.3rem; }
        .an-dot.gold { background: #D4AF37; }
        .an-dot.green { background: #16a34a; }

        .an-list { display: grid; gap: 0.7rem; }
        .an-item {
          padding: 0.9rem; border-radius: 14px;
          background: rgba(128,128,128,0.10); border: 1px solid rgba(128,128,128,0.25);
        }
        .an-item-title { font-weight: 700; line-height: 1.3; }
        .an-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.3rem; margin-top: 0.7rem; text-align: center; }
        .an-grid b { display: block; color: #D4AF37; font-size: 1rem; }
        .an-grid span { display: block; font-size: 0.66rem; opacity: 0.7; }

        .an-empty { text-align: center; padding: 2.5rem 1rem; }
        .an-empty-icon { font-size: 2.4rem; margin-bottom: 0.4rem; }
        .an-empty p { opacity: 0.8; margin-bottom: 1rem; }
        .an-gold {
          display: inline-block; padding: 0.8rem 1.2rem; border-radius: 10px; font-weight: 700;
          text-decoration: none; background: #D4AF37; color: #0B0B0B;
        }
      `}</style>
    </DashboardLayout>
  );
      }
