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

/* "9 900 FCFA / mois" -> { amount: "9 900", unit: "FCFA / mois" } ; "Gratuit" reste tel quel */
function splitPrice(text) {
  const m = String(text || "").match(/^([\d\s\u00a0\u202f.,]+?)\s+(\D.*)$/);
  return m ? { amount: m[1].trim(), unit: m[2].trim() } : { amount: String(text || ""), unit: "" };
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
  const [paying, setPaying] = useState("");
  const [payMsg, setPayMsg] = useState(null);

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

  /* Retour depuis la page de paiement SasPay : l'adresse contient ?paiement=<référence> */
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("paiement");
    if (!ref) return;
    let cancelled = false;
    setPayMsg({ type: "info", text: "Vérification de votre paiement en cours…" });

    (async () => {
      for (let i = 0; i < 8 && !cancelled; i++) {
        try {
          const res = await fetch(`${API}/api/billing/verify?ref=${encodeURIComponent(ref)}`, {
            credentials: "include",
          });
          const json = await res.json().catch(() => ({}));
          if (res.ok && json.paid) {
            if (cancelled) return;
            setPayMsg({ type: "ok", text: "✅ Paiement confirmé : votre abonnement est activé." });
            await load();
            window.history.replaceState({}, "", window.location.pathname);
            return;
          }
          if (res.status === 404 || res.status === 401) {
            if (!cancelled) setPayMsg({ type: "error", text: json.error || "Paiement introuvable." });
            return;
          }
        } catch {
          /* on réessaie */
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!cancelled) {
        setPayMsg({
          type: "info",
          text:
            "Votre paiement n'est pas encore confirmé. Si vous avez bien payé, l'abonnement s'activera automatiquement dans quelques minutes : actualisez cette page.",
        });
        window.history.replaceState({}, "", window.location.pathname);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Si le client revient avec le bouton « retour » du navigateur, on débloque le bouton */
  useEffect(() => {
    const onShow = (e) => {
      if (e.persisted) setPaying("");
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(t);
  }, [offset]);

  async function startPayment(planKey) {
    if (paying) return;
    setPaying(planKey);
    setPayMsg(null);
    try {
      const res = await fetch(`${API}/api/billing/checkout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey, return_path: window.location.pathname }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.checkout_url) {
        throw new Error(json.error || "Impossible de démarrer le paiement.");
      }
      window.location.href = json.checkout_url;
    } catch (e) {
      setPayMsg({ type: "error", text: e.message });
      setPaying("");
    }
  }

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


  return (
    <DashboardLayout>
      <div className="sb-page">
        <h1 className="text-2xl font-bold">Abonnements</h1>
        <p className="sb-muted">Votre plan, votre échéance et votre consommation.</p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</div>
        )}

        {payMsg && <div className={`sb-pay-msg ${payMsg.type}`}>{payMsg.text}</div>}

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
                      <div className="sb-bar-fill" style={{ width: `${elapsedPct}%`, background: "linear-gradient(90deg,#D4AF37,#f3d77a)" }} />
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
                    const color =
                      pct >= 100
                        ? "linear-gradient(90deg,#ef4444,#f87171)"
                        : pct >= 80
                        ? "linear-gradient(90deg,#d97706,#fbbf24)"
                        : "linear-gradient(90deg,#3B82F6,#8B5CF6)";
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

              {/* Plans */}
              <div className="sb-label" style={{ marginTop: "2.4rem" }}>Choisissez votre plan</div>
              <div className="sb-plans">
                {data.plans.map((p, i) => {
                  const isFree = p.key === "free";
                  const isCurrent = active ? p.key === data.plan : isFree && status === "free";
                  const lower = active && RANK[p.key] < RANK[data.plan];
                  const renew = active && p.key === data.plan;
                  const featured = p.key === "pro";
                  const { amount, unit } = splitPrice(p.price_text);
                  const busy = paying === p.key;

                  let btn;
                  if (isFree) {
                    btn = (
                      <button type="button" className="sb-cta-btn ghost" disabled>
                        {isCurrent ? "✓ Votre plan actuel" : "Plan gratuit"}
                      </button>
                    );
                  } else if (lower) {
                    btn = (
                      <button type="button" className="sb-cta-btn ghost" disabled>
                        Déjà inclus dans votre plan
                      </button>
                    );
                  } else {
                    btn = (
                      <button
                        type="button"
                        className={`sb-cta-btn ${p.key}`}
                        disabled={!!paying}
                        onClick={() => startPayment(p.key)}
                      >
                        {busy ? (
                          <>
                            <span className="sb-spin" />
                            Redirection…
                          </>
                        ) : (
                          <>
                            <span>{renew ? "Renouveler (+30 jours)" : `Passer au plan ${p.name}`}</span>
                            <span className="sb-arrow" aria-hidden="true">
                              →
                            </span>
                          </>
                        )}
                      </button>
                    );
                  }

                  return (
                    <div
                      key={p.key}
                      className={`sb-plan sb-plan-${p.key}${featured ? " featured" : ""}${isCurrent ? " current" : ""}`}
                      style={{ animationDelay: `${i * 0.12}s` }}
                    >
                      {featured && <div className="sb-pop">✦ Populaire</div>}
                      <div className="sb-plan-head">
                        <div className="sb-plan-name">{p.name}</div>
                        {isCurrent && <span className="sb-current-tag">Votre plan</span>}
                      </div>
                      <div className="sb-plan-price">
                        <span className="sb-price-n">{amount}</span>
                        {unit && <span className="sb-price-u">{unit}</span>}
                      </div>
                      <ul className="sb-plan-list">
                        {planLines(p.limits).map((t) => (
                          <li key={t}>
                            <span className="sb-check">✓</span>
                            {t}
                          </li>
                        ))}
                        {COMMON.map((t) => (
                          <li key={t} className={isFree ? "sb-common" : ""}>
                            {isFree ? (
                              <span className="sb-check soft" />
                            ) : (
                              <span className="sb-check">✓</span>
                            )}
                            {t}
                          </li>
                        ))}
                      </ul>
                      <div className="sb-plan-cta">{btn}</div>
                    </div>
                  );
                })}
              </div>

              <div className="sb-foot">
                🔒 Paiement sécurisé par SasPay (Mobile Money). Chaque abonnement dure 30 jours à partir
                du paiement et ne se renouvelle pas automatiquement : renouvelez-le quand vous le
                souhaitez. Le renouvellement du même plan ajoute 30 jours à votre échéance ; un
                changement de plan repart pour 30 jours.
                {contact.whatsapp && (
                  <>
                    {" "}
                    <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer">
                      Une question ? Écrivez-nous sur WhatsApp
                    </a>
                  </>
                )}
              </div>
            </>
          )
        )}
      </div>

      <style>{`
        .sb-page { max-width: 62rem; }
        .sb-muted { opacity: 0.7; margin-top: 0.4rem; }
        .sb-small { font-size: 0.8rem; margin-top: 0.7rem; line-height: 1.5; }
        .sb-label {
          font-size: 0.75rem; font-weight: 800; letter-spacing: 0.14em;
          text-transform: uppercase; color: #D4AF37; margin-bottom: 1rem;
        }
        .sb-card {
          margin-top: 1.3rem; padding: 1.3rem; border-radius: 24px;
          background: rgba(128,128,128,0.08); border: 1px solid rgba(128,128,128,0.22);
          -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
          box-shadow: 0 12px 34px -16px rgba(0,0,0,0.28);
        }
        .sb-expired {
          margin-top: 1.3rem; padding: 1rem 1.2rem; border-radius: 24px; line-height: 1.6; font-size: 0.92rem;
          border: 1px solid rgba(239,68,68,0.6); background: rgba(239,68,68,0.08);
        }
        .sb-expired-title { font-weight: 800; margin-bottom: 0.4rem; color: #ef4444; }
        .sb-current { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
        .sb-badge {
          padding: 0.35rem 1.1rem; border-radius: 999px; font-weight: 800; font-size: 0.85rem;
          border: 1px solid rgba(128,128,128,0.5);
        }
        .sb-badge.paid {
          background: linear-gradient(120deg,#D4AF37,#f3d77a); color: #1a1405; border-color: transparent;
          box-shadow: 0 6px 18px -6px rgba(212,175,55,0.7);
        }
        .sb-count { margin-top: 1rem; }
        .sb-count-label { font-size: 0.78rem; opacity: 0.7; }
        .sb-count-n {
          font-size: 1.7rem; font-weight: 800; margin: 0.2rem 0 0.7rem;
          font-variant-numeric: tabular-nums;
          background: linear-gradient(120deg,#D4AF37,#f3d77a); -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
        }
        .sb-usage { margin-bottom: 1rem; }
        .sb-usage-top { display: flex; justify-content: space-between; font-size: 0.88rem; font-weight: 600; margin-bottom: 0.4rem; }
        .sb-usage-n { opacity: 0.8; }
        .sb-bar { height: 10px; border-radius: 999px; background: rgba(128,128,128,0.22); overflow: hidden; }
        .sb-bar-fill { height: 100%; border-radius: 999px; transition: width 0.8s cubic-bezier(.2,.8,.2,1); }

        .sb-pay-msg { margin-top: 1rem; padding: 0.8rem 1rem; border-radius: 16px; font-size: 0.9rem; line-height: 1.5; }
        .sb-pay-msg.info { background: rgba(212,175,55,0.12); border: 1px solid rgba(212,175,55,0.6); }
        .sb-pay-msg.ok { background: rgba(22,163,74,0.12); border: 1px solid rgba(22,163,74,0.7); }
        .sb-pay-msg.error { background: rgba(239,68,68,0.10); border: 1px solid rgba(239,68,68,0.6); }

        /* ---------- Plans premium ---------- */
        @keyframes sb-rise { from { opacity: 0; transform: translateY(28px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes sb-gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes sb-shine { 0% { transform: translateX(-160%) skewX(-20deg); } 55%, 100% { transform: translateX(380%) skewX(-20deg); } }
        @keyframes sb-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.5); } 50% { box-shadow: 0 0 0 10px rgba(139,92,246,0); } }
        @keyframes sb-spin { to { transform: rotate(360deg); } }

        .sb-plans { position: relative; isolation: isolate; display: grid; gap: 1.6rem; padding-top: 0.9rem; }
        @media (min-width: 900px) { .sb-plans { grid-template-columns: repeat(3, 1fr); gap: 1.2rem; align-items: stretch; } }
        .sb-plans::before {
          content: ""; position: absolute; inset: -40px -20px; z-index: -1; pointer-events: none; filter: blur(12px);
          background:
            radial-gradient(420px 220px at 15% 8%, rgba(59,130,246,0.16), transparent 70%),
            radial-gradient(420px 260px at 85% 18%, rgba(139,92,246,0.16), transparent 70%),
            radial-gradient(380px 200px at 50% 100%, rgba(212,175,55,0.12), transparent 70%);
        }

        .sb-plan {
          position: relative; display: flex; flex-direction: column; padding: 1.7rem 1.4rem 1.4rem; border-radius: 24px;
          background: rgba(128,128,128,0.08); border: 1px solid rgba(128,128,128,0.22);
          -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
          box-shadow: 0 14px 36px -18px rgba(0,0,0,0.3);
          animation: sb-rise 0.7s cubic-bezier(.2,.8,.2,1) backwards;
          transition: transform 0.35s cubic-bezier(.2,.8,.2,1), box-shadow 0.35s ease, border-color 0.35s ease;
        }
        .sb-plan:hover { transform: translateY(-8px); box-shadow: 0 28px 54px -20px rgba(139,92,246,0.5); border-color: rgba(139,92,246,0.55); }
        .sb-plan-business:hover { box-shadow: 0 28px 54px -20px rgba(212,175,55,0.5); border-color: rgba(212,175,55,0.6); }
        .sb-plan.current { border-color: rgba(22,163,74,0.6); }
        @media (min-width: 900px) { .sb-plan.featured { scale: 1.03; } }

        .sb-plan.featured { border-color: transparent; background: rgba(139,92,246,0.07); }
        .sb-plan.featured::before {
          content: ""; position: absolute; inset: 0; padding: 1.6px; border-radius: 24px; pointer-events: none;
          background: linear-gradient(120deg,#3B82F6,#8B5CF6,#D4AF37,#3B82F6); background-size: 300% 300%;
          animation: sb-gradient 6s ease infinite;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
        }
        .sb-pop {
          position: absolute; top: -14px; left: 50%; transform: translateX(-50%); white-space: nowrap;
          padding: 0.3rem 1rem; border-radius: 999px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.05em; color: #fff;
          background: linear-gradient(90deg,#3B82F6,#8B5CF6); animation: sb-pulse 2.4s ease-in-out infinite;
        }
 
        .sb-plan-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
        .sb-plan-name { font-weight: 800; font-size: 1.2rem; }
        .sb-current-tag {
          font-size: 0.68rem; font-weight: 800; padding: 0.2rem 0.7rem; border-radius: 999px; color: #fff;
          background: linear-gradient(120deg,#16a34a,#22c55e);
        }
        .sb-plan-price { margin: 0.7rem 0 1.1rem; display: flex; align-items: baseline; flex-wrap: wrap; }
        .sb-price-n {
          font-size: 2.3rem; font-weight: 900; letter-spacing: -0.02em; line-height: 1.1;
          background: linear-gradient(120deg,#3B82F6,#8B5CF6); -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
          }
        .sb-plan-business .sb-price-n { background-image: linear-gradient(120deg,#D4AF37,#f3d77a); }
        .sb-plan-free .sb-price-n { background: none; -webkit-text-fill-color: currentColor; color: inherit; }
        .sb-price-u { font-size: 0.9rem; font-weight: 600; opacity: 0.7; margin-left: 0.45rem; }
 
        .sb-plan-list { list-style: none; padding: 0; margin: 0 0 1.4rem; display: grid; gap: 0.6rem; font-size: 0.88rem; flex: 1; }
        .sb-plan-list li { display: flex; align-items: flex-start; gap: 0.6rem; line-height: 1.4; }
        .sb-common { opacity: 0.78; }
        .sb-check {
          flex: none; width: 18px; height: 18px; margin-top: 1px; border-radius: 50%; display: inline-flex;
          align-items: center; justify-content: center; font-size: 0.62rem; font-weight: 900; color: #fff;
          background: linear-gradient(135deg,#3B82F6,#8B5CF6);
        }
        .sb-check.soft { background: transparent; border: 1.5px solid rgba(128,128,128,0.45); }
 
        .sb-cta-btn {
          position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; gap: 0.6rem;
          width: 100%; padding: 1rem 1.1rem; border: 0; border-radius: 16px; font-family: inherit; font-size: 0.95rem;
          font-weight: 800; color: #fff; cursor: pointer; background-size: 220% 220%;
          animation: sb-gradient 5s ease infinite;
          transition: transform 0.25s cubic-bezier(.2,.8,.2,1), box-shadow 0.3s ease, filter 0.3s ease;
        }
        .sb-cta-btn.pro {
          background-image: linear-gradient(120deg,#3B82F6,#8B5CF6,#3B82F6);
          box-shadow: 0 12px 28px -10px rgba(99,102,241,0.8);
        }
        .sb-cta-btn.business {
          background-image: linear-gradient(120deg,#D4AF37,#f3d77a,#D4AF37); color: #1a1405;
          box-shadow: 0 12px 28px -10px rgba(212,175,55,0.8);
        }
        .sb-cta-btn::after {
          content: ""; position: absolute; top: 0; left: 0; width: 35%; height: 100%; pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
          animation: sb-shine 3.4s ease-in-out infinite;
        }
        .sb-cta-btn:hover:not(:disabled) { transform: translateY(-3px) scale(1.02); filter: brightness(1.08); }
        .sb-cta-btn.pro:hover:not(:disabled) { box-shadow: 0 18px 36px -10px rgba(99,102,241,0.95); }
        .sb-cta-btn.business:hover:not(:disabled) { box-shadow: 0 18px 36px -10px rgba(212,175,55,0.95); }
        .sb-cta-btn:active:not(:disabled) { transform: scale(0.97); }
        .sb-arrow { display: inline-block; transition: transform 0.3s ease; }
        .sb-cta-btn:hover:not(:disabled) .sb-arrow { transform: translateX(6px); }
        .sb-cta-btn:disabled { cursor: wait; }
        .sb-cta-btn.pro:disabled, .sb-cta-btn.business:disabled { opacity: 0.75; }
        .sb-cta-btn.ghost {
          background: transparent; color: inherit; border: 1px solid rgba(128,128,128,0.4);
          box-shadow: none; animation: none; opacity: 0.85; cursor: default;
        }
        .sb-cta-btn.ghost::after { display: none; }
        .sb-spin {
          width: 16px; height: 16px; border-radius: 50%; border: 2px solid currentColor; border-right-color: transparent;
          animation: sb-spin 0.7s linear infinite;
        }

          .sb-foot { margin-top: 1.6rem; font-size: 0.8rem; line-height: 1.6; opacity: 0.75; text-align: center; }
        .sb-foot a { color: #D4AF37; text-decoration: underline; }
 
        @media (prefers-reduced-motion: reduce) {
          .sb-plan, .sb-plan.featured::before, .sb-pop, .sb-cta-btn, .sb-cta-btn::after, .sb-bar-fill { animation: none !important; transition: none !important; }
        }
      `}</style>
    </DashboardLayout>
  );
}
