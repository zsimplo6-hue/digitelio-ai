import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

const USAGE_ROWS = [
  { kind: "ebook", icon: "📘", label: "eBooks générés" },
  { kind: "formation", icon: "🎓", label: "Formations créées" },
  { kind: "lesson", icon: "✨", label: "Leçons générées par l'IA" },
  { kind: "marketing", icon: "📣", label: "Contenus marketing" },
];

const COMMON = [
  "Pages de vente et espace apprenant",
  "Certificats de réussite",
  "Export PDF premium",
  "Analytics de vos pages",
];

const n = (v) => Number(v).toLocaleString("fr-FR");

function planLines(l) {
  return [
    `${n(l.ebook)} eBook${l.ebook > 1 ? "s" : ""} par mois`,
    `${n(l.formation)} formation${l.formation > 1 ? "s" : ""} par mois`,
    `${n(l.lesson)} leçons IA par mois`,
    `${n(l.marketing)} contenus marketing par mois`,
    `${n(l.learners)} apprenants par formation`,
  ];
}

function fmtDate(s) {
  if (!s) return "";
  const d = new Date(`${String(s).slice(0, 10)}T00:00:00Z`);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export default function Subscriptions() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(`${API}/api/billing`, { credentials: "include" })
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
  }, []);

  const isPro = data?.plan === "pro";
  const contact = data?.contact || {};
  const waHref = contact.whatsapp
    ? `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(
        `Bonjour, je souhaite passer au plan Pro de Digitelio AI. Mon email : ${data?.email || ""}`
      )}`
    : "";

  return (
    <DashboardLayout>
      <div className="sb-page">
        <h1 className="text-2xl font-bold">Abonnements</h1>
        <p className="sb-muted">Votre plan, votre consommation du mois et les options disponibles.</p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</div>
        )}

        {loading ? (
          <p className="sb-muted" style={{ marginTop: "1.5rem" }}>Chargement...</p>
        ) : (
          data && (
            <>
              {/* Plan actuel */}
              <div className="sb-card">
                <div className="sb-label">Mon plan</div>
                <div className="sb-current">
                  <span className={isPro ? "sb-badge pro" : "sb-badge"}>{data.plan_name}</span>
                  {isPro && data.plan_until && (
                    <span className="sb-muted sb-small" style={{ margin: 0 }}>
                      Actif jusqu'au {fmtDate(data.plan_until)}
                    </span>
                  )}
                  {isPro && !data.plan_until && (
                    <span className="sb-muted sb-small" style={{ margin: 0 }}>Sans date de fin</span>
                  )}
                </div>
                {data.expired && (
                  <div className="sb-warn">
                    Votre plan Pro a expiré : votre compte est repassé au plan Gratuit. Vos contenus
                    sont conservés.
                  </div>
                )}
              </div>

              {/* Consommation */}
              <div className="sb-card">
                <div className="sb-label">Consommation ce mois-ci</div>
                {USAGE_ROWS.map((r) => {
                  const used = data.usage[r.kind] || 0;
                  const limit = data.limits[r.kind] || 1;
                  const pct = Math.min(100, Math.round((used / limit) * 100));
                  const color = pct >= 100 ? "#ef4444" : pct >= 80 ? "#d97706" : "#D4AF37";
                  return (
                    <div key={r.kind} className="sb-usage">
                      <div className="sb-usage-top">
                        <span>
                          {r.icon} {r.label}
                        </span>
                        <span className="sb-usage-n">
                          {n(used)} / {n(limit)}
                        </span>
                      </div>
                      <div className="sb-bar">
                        <div className="sb-bar-fill" style={{ width: `${Math.max(pct, used ? 3 : 0)}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
                <div className="sb-muted sb-small">
                  Les compteurs repartent à zéro le {fmtDate(data.reset_on)}. Limite d'apprenants :{" "}
                  {n(data.limits.learners)} par formation.
                </div>
              </div>

              {/* Comparaison des plans */}
              <div className="sb-label" style={{ marginTop: "2rem" }}>Les plans</div>
              <div className="sb-plans">
                {data.plans.map((p) => {
                  const current = p.key === data.plan;
                  return (
                    <div key={p.key} className={p.key === "pro" ? "sb-plan featured" : "sb-plan"}>
                      <div className="sb-plan-head">
                        <div className="sb-plan-name">{p.name}</div>
                        {current && <span className="sb-current-tag">Votre plan</span>}
                      </div>
                      <div className="sb-plan-price">{p.price_text}</div>
                      <ul className="sb-plan-list">
                        {planLines(p.limits).map((t) => (
                          <li key={t}>◆ {t}</li>
                        ))}
                        {COMMON.map((t) => (
                          <li key={t} className="sb-common">✓ {t}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {/* Passer au plan Pro */}
              {!isPro && (
                <div className="sb-cta">
                  <div className="sb-cta-title">Passez au plan Pro</div>
                  <div className="sb-muted sb-small" style={{ marginTop: 0 }}>
                    Plus de générations IA, plus d'apprenants, aucune limite gênante pour lancer votre
                    activité. Une fois le paiement effectué, votre plan Pro est activé sur votre compte.
                  </div>
                  <div className="sb-cta-actions">
                    {contact.payment_url && (
                      <a className="sb-btn gold" href={contact.payment_url} target="_blank" rel="noopener noreferrer">
                        🚀 Passer au plan Pro
                      </a>
                    )}
                    {waHref && (
                      <a
                        className={contact.payment_url ? "sb-btn out" : "sb-btn gold"}
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        💬 {contact.payment_url ? "Poser une question sur WhatsApp" : "Demander le plan Pro"}
                      </a>
                    )}
                    {!contact.payment_url && !waHref && (
                      <div className="sb-muted sb-small">
                        Contactez l'administrateur de la plateforme pour activer le plan Pro.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )
        )}
      </div>

      <style>{`
        .sb-page { max-width: 44rem; }
        .sb-muted { opacity: 0.7; margin-top: 0.4rem; }
        .sb-small { font-size: 0.8rem; margin-top: 0.7rem; line-height: 1.5; }
        .sb-label {
          font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #D4AF37; margin-bottom: 0.8rem;
        }
        .sb-card {
          margin-top: 1.3rem; padding: 1.2rem; border-radius: 14px;
          background: rgba(128,128,128,0.10); border: 1px solid rgba(128,128,128,0.25);
        }
        .sb-current { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
        .sb-badge {
          padding: 0.3rem 1rem; border-radius: 999px; font-weight: 800; font-size: 0.85rem;
          border: 1px solid rgba(128,128,128,0.5);
        }
        .sb-badge.pro { background: #D4AF37; color: #0B0B0B; border-color: #D4AF37; }
        .sb-warn {
          margin-top: 0.9rem; padding: 0.6rem 0.8rem; border-radius: 10px; font-size: 0.85rem;
          color: #d97706; background: rgba(217,119,6,0.1);
        }
        .sb-usage { margin-bottom: 1rem; }
        .sb-usage-top { display: flex; justify-content: space-between; font-size: 0.88rem; font-weight: 600; margin-bottom: 0.4rem; }
        .sb-usage-n { opacity: 0.8; }
        .sb-bar { height: 9px; border-radius: 999px; background: rgba(128,128,128,0.25); overflow: hidden; }
        .sb-bar-fill { height: 100%; border-radius: 999px; transition: width 0.5s ease; }

        .sb-plans { display: grid; gap: 0.8rem; }
        @media (min-width: 640px) { .sb-plans { grid-template-columns: repeat(2, 1fr); } }
        .sb-plan {
          padding: 1.1rem; border-radius: 14px;
          background: rgba(128,128,128,0.10); border: 1px solid rgba(128,128,128,0.25);
        }
        .sb-plan.featured { border-color: #D4AF37; background: rgba(212,175,55,0.07); }
        .sb-plan-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
        .sb-plan-name { font-weight: 800; font-size: 1.15rem; }
        .sb-current-tag {
          font-size: 0.68rem; font-weight: 700; padding: 0.15rem 0.6rem; border-radius: 999px;
          background: #16a34a; color: #fff;
        }
        .sb-plan-price { font-size: 1.4rem; font-weight: 800; color: #D4AF37; margin: 0.4rem 0 0.8rem; }
        .sb-plan-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.45rem; font-size: 0.88rem; }
        .sb-common { opacity: 0.75; }

        .sb-cta {
          margin-top: 1.5rem; padding: 1.2rem; border-radius: 14px; text-align: center;
          border: 1px solid rgba(212,175,55,0.7); background: rgba(212,175,55,0.07);
        }
        .sb-cta-title { font-weight: 800; font-size: 1.1rem; margin-bottom: 0.5rem; }
        .sb-cta-actions { display: grid; gap: 0.6rem; margin-top: 1rem; }
        .sb-btn {
          display: block; padding: 0.9rem; border-radius: 10px; font-weight: 700; text-decoration: none;
        }
        .sb-btn.gold { background: #D4AF37; color: #0B0B0B; }
        .sb-btn.out { border: 1px solid rgba(128,128,128,0.5); color: inherit; }
      `}</style>
    </DashboardLayout>
  );
    }
