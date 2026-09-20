import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { formatPrice } from "../utils/currency.js";

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

  /* Conseils selon la situation du compte */
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
      <div className="db-page">
        <h1 className="text-2xl font-bold">
          Bonjour, <span className="text-gradient">{user?.fullName || "..."}</span> 👋
        </h1>
        <p className="mt-2 text-digi-navy/60 dark:text-white/60">
          Voici un aperçu de votre activité sur Digitelio AI.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</div>
        )}

        {/* Indicateurs */}
        <div className="db-stats">
          <Link to="/dashboard/ebooks" className="db-stat">
            <div className="db-n">{loading ? "…" : t?.ebooks ?? 0}</div>
            <div className="db-l">📘 eBooks</div>
          </Link>
          <Link to="/dashboard/formations" className="db-stat">
            <div className="db-n">{loading ? "…" : t?.formations ?? 0}</div>
            <div className="db-l">🎓 Formations{t && t.published > 0 ? ` (${t.published} publiée${t.published > 1 ? "s" : ""})` : ""}</div>
          </Link>
          <Link to="/dashboard/pages-vente" className="db-stat">
            <div className="db-n">{loading ? "…" : t?.learners ?? 0}</div>
            <div className="db-l">👥 Apprenants</div>
          </Link>
          <Link to="/dashboard/pages-vente" className="db-stat">
            <div className="db-n">{loading ? "…" : t?.finished ?? 0}</div>
            <div className="db-l">✅ Terminées</div>
          </Link>
        </div>

        <div className="db-revenue">
          <div className="db-l">💰 Revenu estimé</div>
          <div className="db-rev-n">
            {loading
              ? "…"
              : revenue.length === 0
              ? "0"
              : revenue.map((r) => <div key={r.currency}>{formatPrice(r.amount, r.currency)}</div>)}
          </div>
          <div className="db-small">Prix × apprenants inscrits, par monnaie.</div>
        </div>

        {/* Raccourcis */}
        <div className="db-label">Actions rapides</div>
        <div className="db-actions">
          <Link to="/dashboard/ebooks/create" className="btn-primary db-act">
            📘 Créer un eBook
          </Link>
          <Link to="/dashboard/formations" className="db-act db-act-gold">
            🎓 Créer une formation
          </Link>
          <Link to="/dashboard/marketing" className="db-act db-act-out">
            📣 Générer du marketing
          </Link>
          <Link to="/dashboard/pages-vente" className="db-act db-act-out">
            🛒 Mes pages de vente
          </Link>
        </div>

        {/* Prochaines étapes */}
        {tips.length > 0 && (
          <>
            <div className="db-label">Prochaines étapes</div>
            <div className="db-tips">
              {tips.map((tip, i) => (
                <div key={i} className="db-tip">
                  <div className="db-tip-icon">{tip.icon}</div>
                  <div className="db-tip-body">
                    <div>{tip.text}</div>
                    <Link to={tip.to} className="db-tip-link">
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
            <div className="db-label">Activité récente</div>

            {recent.learners.length > 0 && (
              <div className="db-block">
                <div className="db-block-title">Derniers apprenants</div>
                {recent.learners.map((l, i) => (
                  <div key={i} className="db-row">
                    <div className="db-row-main">
                      <div className="db-row-title">{l.learner_name}</div>
                      <div className="db-row-sub">{l.title}</div>
                    </div>
                    <div className="db-row-side">
                      <span className={l.completed_at ? "db-pill ok" : "db-pill"}>
                        {l.completed_at ? "✓ Terminé" : "En cours"}
                      </span>
                      <span className="db-date">{fmtDate(l.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {recent.formations.length > 0 && (
              <div className="db-block">
                <div className="db-block-title">Dernières formations</div>
                {recent.formations.map((f) => (
                  <Link key={f.id} to="/dashboard/formations" className="db-row db-row-link">
                    <div className="db-row-main">
                      <div className="db-row-title">{f.title}</div>
                      <div className="db-row-sub">
                        {f.modules_count} modules
                        {f.price !== null && f.price !== undefined ? ` · ${formatPrice(f.price, f.currency)}` : ""}
                      </div>
                    </div>
                    <div className="db-row-side">
                      <span className={f.status === "published" ? "db-pill ok" : "db-pill"}>
                        {f.status === "published" ? "Publiée" : "Brouillon"}
                      </span>
                      <span className="db-date">{fmtDate(f.created_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {recent.ebooks.length > 0 && (
              <div className="db-block">
                <div className="db-block-title">Derniers eBooks</div>
                {recent.ebooks.map((b) => (
                  <Link key={b.id} to={`/dashboard/ebooks/${b.id}`} className="db-row db-row-link">
                    <div className="db-row-main">
                      <div className="db-row-title">{b.title}</div>
                    </div>
                    <div className="db-row-side">
                      <span className={b.status === "published" ? "db-pill ok" : "db-pill"}>
                        {b.status === "published" ? "Publié" : "Brouillon"}
                      </span>
                      <span className="db-date">{fmtDate(b.created_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Compte */}
        <div className="db-label">Mon compte</div>
        <div className="card text-left text-sm text-digi-navy/70 dark:text-white/70">
          <p><strong>Email :</strong> {user?.email}</p>
          <p className="mt-1"><strong>Plan :</strong> {user?.plan}</p>
        </div>
      </div>

      <style>{`
        .db-page { max-width: 46rem; }
        .db-label {
          font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #D4AF37; margin: 2rem 0 0.8rem;
        }
        .db-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.7rem; margin-top: 1.5rem; }
        .db-stat {
          padding: 1rem; border-radius: 14px; text-align: center; text-decoration: none; color: inherit;
          background: rgba(128,128,128,0.10); border: 1px solid rgba(128,128,128,0.25);
        }
        .db-n { font-size: 1.8rem; font-weight: 800; color: #D4AF37; line-height: 1.2; }
        .db-l { font-size: 0.8rem; opacity: 0.8; margin-top: 0.25rem; }
        .db-revenue {
          margin-top: 0.7rem; padding: 1rem; border-radius: 14px; text-align: center;
          border: 1px solid rgba(212,175,55,0.6); background: rgba(212,175,55,0.07);
        }
        .db-rev-n { font-size: 1.5rem; font-weight: 800; color: #D4AF37; margin-top: 0.3rem; }
        .db-small { font-size: 0.75rem; opacity: 0.65; margin-top: 0.3rem; }

        .db-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
        .db-act {
          display: block; text-align: center; padding: 0.85rem 0.6rem; border-radius: 10px;
          font-weight: 600; font-size: 0.9rem; text-decoration: none;
        }
        .db-act-gold { background: #D4AF37; color: #0B0B0B; }
        .db-act-out { border: 1px solid rgba(128,128,128,0.45); color: inherit; }

        .db-tips { display: grid; gap: 0.6rem; }
        .db-tip {
          display: flex; gap: 0.8rem; align-items: flex-start; padding: 0.9rem; border-radius: 12px;
          border: 1px dashed rgba(212,175,55,0.6); background: rgba(212,175,55,0.06);
        }
        .db-tip-icon { font-size: 1.4rem; }
        .db-tip-body { font-size: 0.9rem; line-height: 1.5; }
        .db-tip-link { display: inline-block; margin-top: 0.35rem; color: #D4AF37; font-weight: 700; text-decoration: none; }

        .db-block {
          margin-bottom: 1rem; padding: 0.4rem 0.9rem 0.6rem; border-radius: 14px;
          background: rgba(128,128,128,0.10); border: 1px solid rgba(128,128,128,0.25);
        }
        .db-block-title { font-weight: 700; font-size: 0.9rem; padding: 0.6rem 0 0.3rem; }
        .db-row {
          display: flex; justify-content: space-between; align-items: center; gap: 0.8rem;
          padding: 0.65rem 0; border-top: 1px solid rgba(128,128,128,0.2);
          text-decoration: none; color: inherit;
        }
        .db-row-main { min-width: 0; }
        .db-row-title { font-weight: 600; line-height: 1.3; }
        .db-row-sub { font-size: 0.8rem; opacity: 0.7; margin-top: 0.1rem; }
        .db-row-side { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; }
        .db-pill {
          font-size: 0.7rem; font-weight: 700; padding: 0.15rem 0.6rem; border-radius: 999px;
          border: 1px solid rgba(128,128,128,0.4);
        }
        .db-pill.ok { background: #16a34a; color: #fff; border-color: #16a34a; }
        .db-date { font-size: 0.72rem; opacity: 0.6; }
      `}</style>
    </DashboardLayout>
  );
        }
