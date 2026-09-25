import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { formatPrice } from "../utils/currency.js";
import { Card } from "../components/ui/Card.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

function fmtDate(s) {
  if (!s) return "";
  const d = new Date(String(s).replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`${API}/api/overview`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Erreur de chargement.");
        if (alive) setData(json);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const t = data?.totals;
  const recent = data?.recent;
  const revenue = t?.revenue_by_currency || [];

  const tips = [];
  if (t) {
    if (t.ebooks === 0 && t.formations === 0) {
      tips.push({
        icon: "🚀",
        text: "Créez votre premier produit : un eBook ou une formation générée par l'IA.",
        to: "/dashboard/formations",
        cta: "Créer une formation",
      });
    }
    if (t.drafts > 0) {
      tips.push({
        icon: "📝",
        text: `${t.drafts} formation${t.drafts > 1 ? "s" : ""} en brouillon : terminez-la${t.drafts > 1 ? "s" : ""} et publiez-la${t.drafts > 1 ? "s" : ""}.`,
        to: "/dashboard/formations",
        cta: "Ouvrir mes formations",
      });
    }
    if (t.no_payment > 0) {
      tips.push({
        icon: "💳",
        text: `${t.no_payment} page${t.no_payment > 1 ? "s" : ""} de vente sans lien de paiement : le bouton d'achat est inactif.`,
        to: "/dashboard/formations",
        cta: "Ajouter un lien",
      });
    }
    if (t.published > 0 && t.learners === 0) {
      tips.push({
        icon: "📣",
        text: "Votre page de vente est en ligne : générez des textes pour la promouvoir.",
        to: "/dashboard/marketing",
        cta: "Générer du marketing",
      });
    }
  }

  return (
    <DashboardLayout>
      <div className="dg-settings-wrap" style={{ maxWidth: "46rem" }}>
        <h1 className="text-2xl font-bold">
          Bonjour, <span className="text-gradient">{user?.fullName || "..."}</span> 👋
        </h1>
        <p className="dg-page__subtitle">Voici un aperçu de votre activité sur Digitelio AI.</p>

        {error && <div className="dg-alert dg-alert--error">{error}</div>}

        {/* Indicateurs */}
        <div className="dg-stat-grid-2">
          <Link to="/dashboard/ebooks" className="dg-stat-mini">
            <div className="dg-stat-mini__n">{loading ? "…" : t?.ebooks ?? 0}</div>
            <div className="dg-stat-mini__l">📘 eBooks</div>
          </Link>
          <Link to="/dashboard/formations" className="dg-stat-mini">
            <div className="dg-stat-mini__n">{loading ? "…" : t?.formations ?? 0}</div>
            <div className="dg-stat-mini__l">
              🎓 Formations{t && t.published > 0 ? ` (${t.published} publiée${t.published > 1 ? "s" : ""})` : ""}
            </div>
          </Link>
          <Link to="/dashboard/pages-vente" className="dg-stat-mini">
            <div className="dg-stat-mini__n">{loading ? "…" : t?.learners ?? 0}</div>
            <div className="dg-stat-mini__l">👥 Apprenants</div>
          </Link>
          <Link to="/dashboard/pages-vente" className="dg-stat-mini">
            <div className="dg-stat-mini__n">{loading ? "…" : t?.finished ?? 0}</div>
            <div className="dg-stat-mini__l">✅ Terminées</div>
          </Link>
        </div>

        <div className="dg-revenue-card">
          <div className="dg-revenue-card__label">💰 Revenu estimé</div>
          <div className="dg-revenue-card__value">
            {loading
              ? "…"
              : revenue.length === 0
              ? "0"
              : revenue.map((r) => <div key={r.currency}>{formatPrice(r.amount, r.currency)}</div>)}
          </div>
          <div className="dg-revenue-card__hint">Prix × apprenants inscrits, par monnaie.</div>
        </div>

        {/* Raccourcis */}
        <div className="dg-section-label">Actions rapides</div>
        <div className="dg-actions-grid">
          <Link to="/dashboard/ebooks/create" className="dg-action-btn dg-action-btn--primary">
            📘 Créer un eBook
          </Link>
          <Link to="/dashboard/formations" className="dg-action-btn dg-action-btn--gold">
            🎓 Créer une formation
          </Link>
          <Link to="/dashboard/marketing" className="dg-action-btn dg-action-btn--outline">
            📣 Générer du marketing
          </Link>
          <Link to="/dashboard/pages-vente" className="dg-action-btn dg-action-btn--outline">
            🛒 Mes pages de vente
          </Link>
        </div>

        {/* Prochaines étapes */}
        {tips.length > 0 && (
          <>
            <div className="dg-section-label">Prochaines étapes</div>
            <div className="dg-tips">
              {tips.map((tip, i) => (
                <div key={i} className="dg-tip-card">
                  <div className="dg-tip-card__icon">{tip.icon}</div>
                  <div className="dg-tip-card__body">
                    <div>{tip.text}</div>
                    <Link to={tip.to} className="dg-tip-card__link">
                      {tip.cta} →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Activité récente */}
        {recent && (recent.ebooks.length > 0 || recent.formations.length > 0 || recent.learners.length > 0) && (
          <>
            <div className="dg-section-label">Activité récente</div>

            {recent.learners.length > 0 && (
              <div className="dg-row-block">
                <div className="dg-row-block__title">Derniers apprenants</div>
                {recent.learners.map((l, i) => (
                  <div key={i} className="dg-row">
                    <div className="dg-row__main">
                      <div className="dg-row__title">{l.learner_name}</div>
                      <div className="dg-row__sub">{l.title}</div>
                    </div>
                    <div className="dg-row__side">
                      <span className={`dg-pill ${l.completed_at ? "dg-pill--ok" : ""}`}>
                        {l.completed_at ? "✓ Terminé" : "En cours"}
                      </span>
                      <span className="dg-row__date">{fmtDate(l.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {recent.formations.length > 0 && (
              <div className="dg-row-block">
                <div className="dg-row-block__title">Dernières formations</div>
                {recent.formations.map((f) => (
                  <Link key={f.id} to="/dashboard/formations" className="dg-row">
                    <div className="dg-row__main">
                      <div className="dg-row__title">{f.title}</div>
                      <div className="dg-row__sub">
                        {f.modules_count} modules
                        {f.price !== null && f.price !== undefined ? ` · ${formatPrice(f.price, f.currency)}` : ""}
                      </div>
                    </div>
                    <div className="dg-row__side">
                      <span className={`dg-pill ${f.status === "published" ? "dg-pill--ok" : ""}`}>
                        {f.status === "published" ? "Publiée" : "Brouillon"}
                      </span>
                      <span className="dg-row__date">{fmtDate(f.created_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {recent.ebooks.length > 0 && (
              <div className="dg-row-block">
                <div className="dg-row-block__title">Derniers eBooks</div>
                {recent.ebooks.map((b) => (
                  <Link key={b.id} to={`/dashboard/ebooks/${b.id}`} className="dg-row">
                    <div className="dg-row__main">
                      <div className="dg-row__title">{b.title}</div>
                    </div>
                    <div className="dg-row__side">
                      <span className={`dg-pill ${b.status === "published" ? "dg-pill--ok" : ""}`}>
                        {b.status === "published" ? "Publié" : "Brouillon"}
                      </span>
                      <span className="dg-row__date">{fmtDate(b.created_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Compte */}
        <div className="dg-section-label">Mon compte</div>
        <Card>
          <p style={{ fontSize: 14 }}><strong>Email :</strong> {user?.email}</p>
          <p style={{ fontSize: 14, marginTop: 4 }}><strong>Plan :</strong> {user?.plan}</p>
        </Card>
      </div>
    </DashboardLayout>
  );
      }
