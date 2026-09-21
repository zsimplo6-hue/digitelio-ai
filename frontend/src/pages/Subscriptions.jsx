import { useEffect, useRef, useState } from "react";
import DashboardLayout from "../components/DashboardLayout.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

const RANK = { free: 0, pro: 1, business: 2 };

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

function fmtRemaining(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (x) => String(x).padStart(2, "0");
  return `${d} j ${p(h)} h ${p(m)} min ${p(sec)} s`;
}

export default function Subscriptions() {
  const [data, setData] = useState(null);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const reloadedRef = useRef(false);

  async function load() {
    try {
      const res = await fetch(`${API}/api/billing`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Erreur de chargement.");
      const off = Date.parse(json.server_time) - Date.now();
      setOffset(Number.isFinite(off) ? off : 0);
      setNow(Date.now() + (Number.isFinite(off) ? off : 0));
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(t);
  }, [offset]);

  const status = data?.status;
  const active = status === "active";
  const expired = status === "expired";
  const untilMs = data?.until ? Date.parse(data.until) : null;
  const startMs = data?.started_at ? Date.parse(data.started_at) : null;
  const remaining = active && untilMs ? untilMs - now : null;

  /* À la seconde de l'échéance, on recharge : l'écran passe en « expiré » */
  useEffect(() => {
    if (remaining === null) return;
    if (remaining > 0) {
      reloadedRef.current = false;
    } else if (!reloadedRef.current) {
      reloadedRef.current = true;
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const elapsedPct =
    startMs && untilMs && untilMs > startMs
      ? Math.min(100, Math.max(0, Math.round(((now - startMs) / (untilMs - startMs)) * 100)))
      : 0;

  const contact = data?.contact || {};

  /* Plans proposés : abonné actif = son plan (renouvellement) et supérieurs ; sinon tous les plans payants */
  const targets = data
    ? data.plans.filter((p) =>
        active ? RANK[p.key] >= RANK[data.plan] && p.key !== "free" : p.key !== "free"
      )
    : [];
  const anyContact = !!contact.whatsapp || targets.some((p) => contact.payment_urls?.[p.key]);

  const waFor = (planName, renew) =>
    contact.whatsapp
      ? `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(
          `Bonjour, je souhaite ${renew ? "renouveler" : "passer au"} plan ${planName} de Digitelio AI. Mon email : ${data?.email || ""}`
        )}`
      : "";

  let ctaTitle = "Passez à un plan payant";
  if (expired) ctaTitle = "Renouvelez votre abonnement";
  else if (active) ctaTitle = "Renouveler ou changer de plan";

  return (
    <DashboardLayout>
      <div className="sb-page">
        <h1 className="text-2xl font-bold">Abonnements</h1>
        <p className="sb-muted">Votre plan, votre échéance et votre consommation.</p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</div>
        )}

        {loading ? (
          <p className="sb-muted" style={{ marginTop: "1.5rem" }}>Chargement...</p>
        ) : (
          data && (
            <>
              {/* Abonnement expiré */}
              {expired && (
                <div className="sb-expired">
                  <div className="sb-expired-title">⏳ Votre abonnement {data.expired_plan_name} a expiré</div>
                  <div>
                    Il s'est terminé le {fmtDateTime(data.until)}. Renouvelez-le pour retrouver l'accès à
                    Digitelio AI. Vos contenus sont conservés et vos pages de vente restent en ligne.
                  </div>
                </div>
              )}

              {/* Plan actuel + compte à rebours */}
              <div className="sb-card">
                <div className="sb-label">Mon abonnement</div>
                <div className="sb-current">
                  <span className={active ? "sb-badge paid" : "sb-badge"}>
                    {expired ? `${data.expired_plan_name} (expiré)` : data.plan_name}
                  </span>
                  {active && !untilMs && (
                    <span className="sb-muted sb-small" style={{ margin: 0 }}>Sans date de fin</span>
                  )}
                </div>

                {active && untilMs && (
                  <div className="sb-count">
                    <div className="sb-count-label">Temps restant</div>
                    <div className="sb-count-n">{fmtRemaining(remaining)}</div>
                    <div className="sb-bar">
                      <div className="sb-bar-fill" style={{ width: `${elapsedPct}%`, background: "#D4AF37" }} />
                    </div>
                    <div className="sb-muted sb-small">
                      {startMs ? `Actif depuis le ${fmtDateTime(data.started_at)}. ` : ""}
                      Expire le {fmtDateTime(data.until)}.
                    </div>
                  </div>
                )}
              </div>

              {/* Consommation */}
              {!expired && (
                <div className="sb-card">
                  <div className="sb-label">Consommation de la période</div>
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
                          <div
                            className="sb-bar-fill"
                            style={{ width: `${Math.max(pct, used ? 3 : 0)}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="sb-muted sb-small">
                    {active
                      ? `Vos compteurs repartent à zéro toutes les 30 jours à partir de votre paiement (prochaine remise à zéro : ${fmtDateTime(data.reset_at)}).`
                      : `Les compteurs repartent à zéro le ${fmtDateTime(data.reset_at)}.`}{" "}
                    Limite d'apprenants : {n(data.limits.learners)} par formation.
                  </div>
                </div>
              )}

              {/* Comparaison des plans */}
              <div className="sb-label" style={{ marginTop: "2rem" }}>Les plans</div>
              <div className="sb-plans">
                {data.plans.map((p) => {
                  const current = active && p.key === data.plan;
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

              {/* Renouveler / changer de plan */}
              {targets.length > 0 && (
                <div className="sb-cta">
                  <div className="sb-cta-title">{ctaTitle}</div>
                  <div className="sb-muted sb-small" style={{ marginTop: 0 }}>
                    Chaque abonnement dure 30 jours à partir du paiement. Le renouvellement du même plan
                    ajoute 30 jours à votre échéance. Un changement de plan repart pour 30 jours à
                    compter du paiement.
                  </div>

                  <div className="sb-cta-actions">
                    {targets.map((p) => {
                      const renew = active && p.key === data.plan;
                      const payUrl = contact.payment_urls?.[p.key] || "";
                      const wa = waFor(p.name, renew);
                      return (
                        <div key={p.key} className="sb-up">
                          <div className="sb-up-name">
                            {p.name} · {p.price_text}
                          </div>
                          {payUrl && (
                            <a className="sb-btn gold" href={payUrl} target="_blank" rel="noopener noreferrer">
                              {renew ? `🔄 Renouveler le plan ${p.name} (+30 jours)` : `🚀 Passer au plan ${p.name}`}
                            </a>
                          )}
                          {wa && (
                            <a
                              className={payUrl ? "sb-btn out" : "sb-btn gold"}
                              href={wa}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              💬 {payUrl ? "Poser une question sur WhatsApp" : `${renew ? "Renouveler" : "Demander"} le plan ${p.name}`}
                            </a>
                          )}
                        </div>
                      );
                    })}
                    {!anyContact && (
                      <div className="sb-muted sb-small">
                        Contactez l'administrateur de la plateforme pour activer un plan payant.
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
        .sb-page { max-width: 56rem; }
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
        .sb-expired {
          margin-top: 1.3rem; padding: 1rem 1.2rem; border-radius: 14px; line-height: 1.6; font-size: 0.92rem;
          border: 1px solid rgba(239,68,68,0.6); background: rgba(239,68,68,0.08);
        }
        .sb-expired-title { font-weight: 800; margin-bottom: 0.4rem; color: #ef4444; }
        .sb-current { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
        .sb-badge {
          padding: 0.3rem 1rem; border-radius: 999px; font-weight: 800; font-size: 0.85rem;
          border: 1px solid rgba(128,128,128,0.5);
        }
        .sb-badge.paid { background: #D4AF37; color: #0B0B0B; border-color: #D4AF37; }
        .sb-count { margin-top: 1rem; }
        .sb-count-label { font-size: 0.78rem; opacity: 0.7; }
        .sb-count-n {
          font-size: 1.6rem; font-weight: 800; color: #D4AF37; margin: 0.2rem 0 0.7rem;
          font-variant-numeric: tabular-nums;
        }
        .sb-usage { margin-bottom: 1rem; }
        .sb-usage-top { display: flex; justify-content: space-between; font-size: 0.88rem; font-weight: 600; margin-bottom: 0.4rem; }
        .sb-usage-n { opacity: 0.8; }
        .sb-bar { height: 9px; border-radius: 999px; background: rgba(128,128,128,0.25); overflow: hidden; }
        .sb-bar-fill { height: 100%; border-radius: 999px; transition: width 0.5s ease; }

        .sb-plans { display: grid; gap: 0.8rem; }
        @media (min-width: 900px) { .sb-plans { grid-template-columns: repeat(3, 1fr); } }
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
        .sb-cta-actions { display: grid; gap: 1rem; margin-top: 1rem; }
        .sb-up { display: grid; gap: 0.5rem; }
        .sb-up-name { font-weight: 700; }
        .sb-btn {
          display: block; padding: 0.9rem; border-radius: 10px; font-weight: 700; text-decoration: none;
        }
        .sb-btn.gold { background: #D4AF37; color: #0B0B0B; }
        .sb-btn.out { border: 1px solid rgba(128,128,128,0.5); color: inherit; }
      `}</style>
    </DashboardLayout>
  );
    }
