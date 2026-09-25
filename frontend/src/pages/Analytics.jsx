import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Select } from "../components/ui/Field.jsx";

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
      <div className="dg-settings-wrap" style={{ maxWidth: "46rem" }}>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="dg-page__subtitle">
          Mesurez les visites de vos pages de vente et les clics sur le bouton d'achat.
        </p>

        {error && <div className="dg-alert dg-alert--error">{error}</div>}

        {noPages ? (
          <div className="dg-empty-state">
            <div className="dg-empty-state__icon">📈</div>
            <p>Publiez une formation pour commencer à mesurer vos visites.</p>
            <Link to="/dashboard/formations">
              <Button variant="primary">Mes formations</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="dg-period-group">
              {PERIODS.map((p) => (
                <button
                  key={p.days}
                  type="button"
                  className={`dg-period-btn ${days === p.days ? "is-active" : ""}`}
                  onClick={() => setDays(p.days)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="dg-mt-6">
              <Select value={formationId} onChange={(e) => setFormationId(e.target.value)}>
                <option value="">Toutes les formations</option>
                {formations.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </Select>
            </div>

            <div className="dg-stat-grid-2">
              <Card className="dg-stat-mini" style={{ textAlign: "center" }}>
                <div className="dg-stat-mini__n">{loading ? "…" : t?.views ?? 0}</div>
                <div className="dg-stat-mini__l">👁 Visites</div>
              </Card>
              <Card className="dg-stat-mini" style={{ textAlign: "center" }}>
                <div className="dg-stat-mini__n">{loading ? "…" : t?.uniques ?? 0}</div>
                <div className="dg-stat-mini__l">👤 Visiteurs uniques</div>
              </Card>
              <Card className="dg-stat-mini" style={{ textAlign: "center" }}>
                <div className="dg-stat-mini__n">{loading ? "…" : t?.clicks ?? 0}</div>
                <div className="dg-stat-mini__l">🛒 Clics « Acheter »</div>
              </Card>
              <Card className="dg-stat-mini" style={{ textAlign: "center" }}>
                <div className="dg-stat-mini__n">{loading ? "…" : rate(t?.clicks ?? 0, t?.views ?? 0)}</div>
                <div className="dg-stat-mini__l">🎯 Taux de clic</div>
              </Card>
            </div>

            <div className="dg-section-label">Visites par jour</div>
            <Card className="dg-chart-card">
              <div className="dg-chart">
                {series.map((s) => (
                  <div
                    key={s.day}
                    className="dg-chart-col"
                    title={`${shortDate(s.day)} : ${s.views} visite(s), ${s.clicks} clic(s)`}
                  >
                    <div
                      className="dg-chart-bar"
                      style={{ height: s.views ? `${Math.max(4, (s.views / max) * 100)}%` : "0" }}
                    >
                      <div
                        className="dg-chart-click"
                        style={{ height: s.views ? `${Math.min(100, (s.clicks / s.views) * 100)}%` : "0" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="dg-chart-axis">
                <span>{series[0] ? shortDate(series[0].day) : ""}</span>
                <span>Max : {max} visite{max > 1 ? "s" : ""}/jour</span>
                <span>{series.length ? shortDate(series[series.length - 1].day) : ""}</span>
              </div>
              <div className="dg-chart-legend">
                <span><i className="dg-legend-dot dg-legend-dot--brand" /> Visites</span>
                <span><i className="dg-legend-dot dg-legend-dot--success" /> Part de clics</span>
              </div>
            </Card>

            <div className="dg-section-label">Par formation</div>
            <div className="dg-formation-list">
              {formations.map((f) => (
                <Card key={f.id} className="dg-formation-item">
                  <div className="dg-formation-item__title">{f.title}</div>
                  <div className="dg-formation-grid">
                    <div><b>{f.views}</b><span>Visites</span></div>
                    <div><b>{f.uniques}</b><span>Uniques</span></div>
                    <div><b>{f.clicks}</b><span>Clics</span></div>
                    <div><b>{rate(f.clicks, f.views)}</b><span>Taux</span></div>
                    <div><b>{f.learners}</b><span>Apprenants</span></div>
                  </div>
                </Card>
              ))}
            </div>

            <p className="dg-helper-text" style={{ marginTop: "1.4rem" }}>
              Les statistiques démarrent à partir de la mise en ligne de cette fonction. Vos propres
              visites (connecté) et les robots ne sont pas comptés. Les visiteurs uniques sont estimés
              par navigateur. Le taux de clic = clics « Acheter » ÷ visites.
            </p>
          </>
        )}
      </div>
    </DashboardLayout>
  );
                            }
