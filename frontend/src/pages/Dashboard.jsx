import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import DashboardLayout from "../components/DashboardLayout.jsx";
import PageHero from "../components/ui/PageHero.jsx";
import { formatPrice } from "../utils/currency.js";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

// Passer à true pour réafficher revenus, apprenants et pages de vente
const SALES_ENABLED = false;

function fmtDate(s) {
  if (!s) return "";
  const str = String(s);
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(str) ? str : str.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);

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
    fetch(`${API}/api/billing`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && j && setPlan(j))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const initials = String(user?.fullName || user?.email || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");
  const t = data?.totals;
  const recent = data?.recent;
  const revenue = t?.revenue_by_currency || [];

  const tips = [];
  if (t) {
    if (t.ebooks === 0 && t.formations === 0) {
      tips.push({
        icon: "🚀",
        text: "Créez votre premier produit : un eBook ou une formation générée par l'IA.",
        to: "/dashboard/ebooks/create",
        cta: "Créer un eBook",
      });
    }
    if (SALES_ENABLED && t.drafts > 0) {
      tips.push({
        icon: "📝",
        text: `${t.drafts} formation${t.drafts > 1 ? "s" : ""} en brouillon : terminez-la${t.drafts > 1 ? "s" : ""} et publiez-la${t.drafts > 1 ? "s" : ""}.`,
        to: "/dashboard/formations",
        cta: "Ouvrir mes formations",
      });
    }
    if (SALES_ENABLED && t.no_payment > 0) {
      tips.push({
        icon: "💳",
        text: `${t.no_payment} page${t.no_payment > 1 ? "s" : ""} de vente sans lien de paiement : le bouton d'achat est inactif.`,
        to: "/dashboard/formations",
        cta: "Ajouter un lien",
      });
    }
    if (t.ebooks + t.formations > 0) {
      tips.push({
        icon: "📣",
        text: "Votre produit est prêt : générez vos textes de lancement pour le vendre sur Chariow, Maketou ou ailleurs.",
        to: "/dashboard/marketing",
        cta: "Générer du marketing",
      });
    }
  }

  const hasLearners = SALES_ENABLED && (recent?.learners?.length ?? 0) > 0;
  const hasActivity =
    recent && (recent.ebooks.length > 0 || recent.formations.length > 0 || hasLearners);

  return (
    <DashboardLayout>
      <div className="dg-settings-wrap" style={{ maxWidth: "46rem" }}>
        <PageHero
          kicker="Tableau de bord"
          title={
            <>
              Bonjour, <span className="grad">{user?.fullName || "..."}</span> 👋
            </>
          }
          subtitle="Voici un aperçu de votre activité sur Digitelio AI."
        />

        {error && <div className="dg-alert dg-alert--error">{error}</div>}

        {/* Indicateurs */}
        <div className="dg-stat-grid-2">
          <Link to="/dashboard/ebooks" className="dg-stat-mini">
            <div className="dg-stat-mini__n">{loading ? "…" : t?.ebooks ?? 0}</div>
            <div className="dg-stat-mini__l">📘 eBooks</div>
          </Link>
          <Link to="/dashboard/formations" className="dg-stat-mini">
            <div className="dg-stat-mini__n">{loading ? "…" : t?.formations ?? 0}</div>
            <div className="dg-stat-mini__l">🎓 Formations</div>
          </Link>
          {SALES_ENABLED && (
            <>
              <Link to="/dashboard/pages-vente" className="dg-stat-mini">
                <div className="dg-stat-mini__n">{loading ? "…" : t?.learners ?? 0}</div>
                <div className="dg-stat-mini__l">👥 Apprenants</div>
              </Link>
              <Link to="/dashboard/pages-vente" className="dg-stat-mini">
                <div className="dg-stat-mini__n">{loading ? "…" : t?.finished ?? 0}</div>
                <div className="dg-stat-mini__l">✅ Terminées</div>
              </Link>
            </>
          )}
        </div>

        {SALES_ENABLED && (
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
        )}

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
          {SALES_ENABLED && (
            <Link to="/dashboard/pages-vente" className="dg-action-btn dg-action-btn--outline">
              🛒 Mes pages de vente
            </Link>
          )}
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
        {hasActivity && (
          <>
            <div className="dg-section-label">Activité récente</div>

            {hasLearners && (
              <section className="db-panel">
                <header className="db-panel__head">
                  <span className="db-panel__ic">👥</span>
                  <h3>Derniers apprenants</h3>
                </header>
                {recent.learners.map((l, i) => (
                  <div key={i} className="db-item">
                    <div className="db-item__main">
                      <div className="db-item__title">{l.learner_name}</div>
                      <div className="db-item__meta">{l.title}</div>
                    </div>
                    <div className="db-item__side">
                      <span className={`dg-pill ${l.completed_at ? "dg-pill--ok" : ""}`}>
                        {l.completed_at ? "✓ Terminé" : "En cours"}
                      </span>
                      <span className="db-item__date">{fmtDate(l.created_at)}</span>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {recent.formations.length > 0 && (
              <section className="db-panel">
                <header className="db-panel__head">
                  <span className="db-panel__ic db-panel__ic--gold">🎓</span>
                  <h3>Dernières formations</h3>
                  <Link to="/dashboard/formations" className="db-panel__all">Tout voir →</Link>
                </header>
                {recent.formations.map((f) => (
                  <Link key={f.id} to="/dashboard/formations" className="db-item">
                    <span className="db-item__badge db-item__badge--gold">🎓</span>
                    <div className="db-item__main">
                      <div className="db-item__title">{f.title}</div>
                      <div className="db-item__meta">
                        {f.modules_count} module{f.modules_count > 1 ? "s" : ""} · {fmtDate(f.created_at)}
                        {SALES_ENABLED && f.price !== null && f.price !== undefined
                          ? ` · ${formatPrice(f.price, f.currency)}`
                          : ""}
                      </div>
                    </div>
                    <div className="db-item__side">
                      {SALES_ENABLED && (
                        <span className={`dg-pill ${f.status === "published" ? "dg-pill--ok" : ""}`}>
                          {f.status === "published" ? "Publiée" : "Brouillon"}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </section>
            )}

            {recent.ebooks.length > 0 && (
              <section className="db-panel">
                <header className="db-panel__head">
                  <span className="db-panel__ic">📘</span>
                  <h3>Derniers eBooks</h3>
                  <Link to="/dashboard/ebooks" className="db-panel__all">Tout voir →</Link>
                </header>
                {recent.ebooks.map((b) => (
                  <Link key={b.id} to={`/dashboard/ebooks/${b.id}`} className="db-item">
                    <span className="db-item__badge">📘</span>
                    <div className="db-item__main">
                      <div className="db-item__title">{b.title}</div>
                      <div className="db-item__meta">{fmtDate(b.created_at)}</div>
                    </div>
                    <div className="db-item__side">
                      {SALES_ENABLED && (
                        <span className={`dg-pill ${b.status === "published" ? "dg-pill--ok" : ""}`}>
                          {b.status === "published" ? "Publié" : "Brouillon"}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </section>
            )}
          </>
        )}

        {/* Compte */}
        <div className="dg-section-label">Mon compte</div>
        <section className="db-account">
          <div className="db-account__top">
            <span className="db-account__av">{initials}</span>
            <div className="db-account__id">
              <div className="db-account__name">{user?.fullName || "Mon compte"}</div>
              <div className="db-account__mail">{user?.email}</div>
            </div>
          </div>
          <div className="db-account__grid">
            <div className="db-account__cell">
              <span>Abonnement</span>
              <b className={`db-plan db-plan--${plan?.plan || "free"}`}>
                {plan ? (plan.expired ? `${plan.expired_plan_name} (expiré)` : plan.plan_name) : "…"}
              </b>
            </div>
            <div className="db-account__cell">
              <span>{plan?.until ? "Expire le" : "Validité"}</span>
              <b>{plan?.until ? fmtDate(plan.until) : plan && plan.plan !== "free" ? "Sans limite" : "—"}</b>
            </div>
          </div>
          <div className="db-account__actions">
            <Link to="/dashboard/abonnements" className="db-btn db-btn--primary">💎 Mon abonnement</Link>
            <Link to="/dashboard/parametres" className="db-btn">⚙️ Paramètres</Link>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
      }
