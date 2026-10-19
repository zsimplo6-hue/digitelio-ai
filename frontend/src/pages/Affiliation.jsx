import { useCallback, useEffect, useRef, useState } from "react";
import DashboardLayout from "../components/DashboardLayout.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

const TIERS = [
  { min: 0, name: "Recrue", icon: "🌱" },
  { min: 3, name: "Bronze", icon: "🥉" },
  { min: 9, name: "Argent", icon: "🥈" },
  { min: 15, name: "Or", icon: "🥇" },
  { min: 30, name: "Diamant", icon: "💎" },
];

const PLAN_LABEL = { pro: "Pro", business: "Business" };

const fmtDay = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
};

const fmtDayYear = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

function daysLeft(iso, nowMs) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.ceil((t - nowMs) / 86400000));
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/* Nombre qui monte progressivement */
function CountUp({ value }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !value) {
      setShown(value);
      return;
    }
    let raf;
    const start = performance.now();
    const from = 0;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown.toLocaleString("fr-FR")}</>;
}

function Icon({ name }) {
  const common = {
    width: "1em",
    height: "1em",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  if (name === "copy")
    return (
      <svg {...common}>
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    );
  if (name === "check")
    return (
      <svg {...common} strokeWidth={3}>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  if (name === "user")
    return (
      <svg {...common}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  if (name === "clock")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  if (name === "gift")
    return (
      <svg {...common}>
        <rect x="3" y="8" width="18" height="4" rx="1" />
        <path d="M12 8v13" />
        <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
        <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" />
      </svg>
    );
  if (name === "share")
    return (
      <svg {...common}>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
      </svg>
    );
  return null;
}

export default function Affiliation() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState("");
  const copyTimer = useRef(null);

  const load = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`${API}/api/affiliate`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Erreur de chargement.");
      setData(json);
      setError("");
    } catch (e) {
      if (!silent) setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Met à jour la barre toute seule quand un filleul s'abonne
    const poll = setInterval(() => load(true), 60000);
    const onFocus = () => load(true);
    window.addEventListener("focus", onFocus);
    const tick = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      window.removeEventListener("focus", onFocus);
      clearTimeout(copyTimer.current);
    };
  }, [load]);

  async function doCopy(text, key) {
    const ok = await copyText(text);
    if (!ok) return;
    setCopied(key);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(""), 2200);
  }

  const rules = data?.rules || { target: 3, reward_days: 30, hold_days: 7 };
  const stats = data?.stats || {};
  const slots = data?.slots || [];
  const url = data?.share_url || "";

  const validated = slots.filter((s) => s.state === "validated").length;
  const filled = slots.filter((s) => s.state !== "empty").length;
  const missing = Math.max(0, rules.target - filled);
  const lastUnlock = slots
    .filter((s) => s.unlock_at)
    .map((s) => s.unlock_at)
    .sort()
    .pop();
  const goalReached = filled >= rules.target;

  const tierIndex = TIERS.reduce((acc, t, i) => ((stats.paying || 0) >= t.min ? i : acc), 0);
  const tier = TIERS[tierIndex];
  const nextTier = TIERS[tierIndex + 1] || null;
  const tierPct = nextTier
    ? Math.min(100, Math.round((((stats.paying || 0) - tier.min) / (nextTier.min - tier.min)) * 100))
    : 100;

  const messages = [
    {
      key: "m1",
      label: "Message WhatsApp",
      text: `🔥 Je crée mes eBooks et mes formations avec Digitelio AI, en quelques minutes et sans compétences techniques. Essaie gratuitement avec mon lien :\n${url}`,
    },
    {
      key: "m2",
      label: "Message professionnel",
      text: `Bonjour, je vous recommande Digitelio AI : une plateforme qui génère eBooks, formations et contenus marketing avec l'IA, en 7 langues. Vous pouvez commencer gratuitement ici : ${url}`,
    },
    {
      key: "m3",
      label: "Message court",
      text: `Crée ton eBook avec l'IA en une soirée 👉 ${url}`,
    },
  ];

  const shareText = `Découvre Digitelio AI : crée des eBooks et des formations avec l'IA, gratuitement 🚀`;
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  async function nativeShare() {
    try {
      await navigator.share({ title: "Digitelio AI", text: shareText, url });
    } catch {
      /* partage annulé */
    }
  }

  return (
    <DashboardLayout>
      <div className="af-page">
        {/* ============ HERO ============ */}
        <section className="af-hero">
          <div className="af-hero-glow" aria-hidden="true" />
          <span className="af-pill">
            <Icon name="gift" /> Programme d'affiliation
          </span>
          <h1 className="af-hero-title">
            Invitez <span className="af-grad">{rules.target} amis</span>,<br />
            gagnez <span className="af-gold">{rules.reward_days} jours</span> d'abonnement
          </h1>
          <p className="af-hero-sub">
            Partagez votre lien. Chaque fois que {rules.target} personnes que vous avez invitées prennent un
            abonnement Pro ou Business, vous recevez automatiquement {rules.reward_days} jours offerts.
            Aucun paiement à demander, tout est automatique.
          </p>
          <div className="af-hero-steps">
            <span>1. Partagez</span>
            <i aria-hidden="true">→</i>
            <span>2. Ils s'abonnent</span>
            <i aria-hidden="true">→</i>
            <span>3. Vous gagnez</span>
          </div>
        </section>

        {error && (
          <div className="af-error">
            {error}{" "}
            <button type="button" onClick={() => load()} className="af-error-btn">
              Réessayer
            </button>
          </div>
        )}

        {loading && !data ? (
          <div className="af-skeleton" aria-busy="true">
            <div />
            <div />
            <div />
          </div>
        ) : (
          data && (
            <>
              {/* ============ STATS ============ */}
              <section className="af-stats">
                <div className="af-stat">
                  <span className="af-stat-n">
                    <CountUp value={stats.invited || 0} />
                  </span>
                  <span className="af-stat-l">Personnes invitées</span>
                </div>
                <div className="af-stat">
                  <span className="af-stat-n">
                    <CountUp value={stats.paying || 0} />
                  </span>
                  <span className="af-stat-l">Abonnés payants</span>
                </div>
                <div className="af-stat">
                  <span className="af-stat-n">
                    <CountUp value={stats.rewards || 0} />
                  </span>
                  <span className="af-stat-l">Récompenses</span>
                </div>
                <div className="af-stat gold">
                  <span className="af-stat-n">
                    <CountUp value={stats.days_earned || 0} />
                  </span>
                  <span className="af-stat-l">Jours offerts gagnés</span>
                </div>
              </section>

              {/* ============ PROGRESSION ============ */}
              <section className="af-card af-progress">
                <div className="af-card-head">
                  <div>
                    <p className="af-label">Prochaine récompense</p>
                    <h2 className="af-card-title">
                      {goalReached ? "Objectif atteint 🎉" : `${filled} / ${rules.target} abonnés`}
                    </h2>
                  </div>
                  <div className="af-prize-chip">
                    <Icon name="gift" /> {rules.reward_days} jours offerts
                  </div>
                </div>

                <div className="af-track-wrap">
                  <div className="af-track" aria-hidden="true">
                    <div
                      className="af-track-pending"
                      style={{ width: `${(filled / rules.target) * 100}%` }}
                    />
                    <div
                      className="af-track-done"
                      style={{ width: `${(validated / rules.target) * 100}%` }}
                    />
                  </div>

                  <div className="af-nodes">
                    {slots.map((s, i) => (
                      <div key={i} className={`af-node ${s.state}`}>
                        <span className="af-node-dot">
                          {s.state === "validated" && <Icon name="check" />}
                          {s.state === "pending" && <Icon name="clock" />}
                          {s.state === "empty" && <Icon name="user" />}
                        </span>
                        <span className="af-node-label">
                          {s.state === "empty"
                            ? `Ami ${i + 1}`
                            : s.state === "pending"
                            ? "En validation"
                            : "Validé"}
                        </span>
                        {s.plan && s.state !== "empty" && (
                          <span className="af-node-plan">{PLAN_LABEL[s.plan] || s.plan}</span>
                        )}
                      </div>
                    ))}
                    <div className={`af-node gift ${goalReached ? "on" : ""}`}>
                      <span className="af-node-dot">
                        <Icon name="gift" />
                      </span>
                      <span className="af-node-label">{rules.reward_days} jours</span>
                    </div>
                  </div>
                </div>

                <p className="af-progress-msg">
                  {filled === 0 && (
                    <>
                      Aucun abonné pour l'instant. Partagez votre lien ci-dessous : dès que{" "}
                      <b>{rules.target} personnes</b> prennent un abonnement, votre cadeau s'active tout seul.
                    </>
                  )}
                  {filled > 0 && !goalReached && (
                    <>
                      Encore <b>{missing}</b> abonné{missing > 1 ? "s" : ""} pour gagner{" "}
                      <b>{rules.reward_days} jours</b> d'abonnement. Vous y êtes presque !
                    </>
                  )}
                  {goalReached && lastUnlock && daysLeft(lastUnlock, now) > 0 && (
                    <>
                      Bravo ! Vos {rules.target} filleuls sont abonnés. Votre cadeau s'active automatiquement le{" "}
                      <b>{fmtDayYear(lastUnlock)}</b>, à la fin du délai de validation de {rules.hold_days} jours.
                    </>
                  )}
                  {goalReached && (!lastUnlock || daysLeft(lastUnlock, now) === 0) && (
                    <>Activation de votre cadeau en cours… Actualisez la page dans un instant.</>
                  )}
                </p>
              </section>

              {/* ============ PARTAGE ============ */}
              <section className="af-card">
                <p className="af-label">Votre lien personnel</p>
                <div className="af-link-row">
                  <input className="af-link-input" readOnly value={url} onFocus={(e) => e.target.select()} />
                  <button
                    type="button"
                    className={`af-copy-btn ${copied === "link" ? "ok" : ""}`}
                    onClick={() => doCopy(url, "link")}
                  >
                    <Icon name={copied === "link" ? "check" : "copy"} />
                    {copied === "link" ? "Copié !" : "Copier"}
                  </button>
                </div>
                <p className="af-code">
                  Votre code : <b>{data.code}</b>
                </p>

                <div className="af-share-grid">
                  <a
                    className="af-share wa"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`}
                  >
                    WhatsApp
                  </a>
                  <a
                    className="af-share tg"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`}
                  >
                    Telegram
                  </a>
                  <a
                    className="af-share fb"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                  >
                    Facebook
                  </a>
                  <a
                    className="af-share ml"
                    href={`mailto:?subject=${encodeURIComponent("Découvre Digitelio AI")}&body=${encodeURIComponent(
                      `${shareText}\n${url}`
                    )}`}
                  >
                    E-mail
                  </a>
                  {canNativeShare && (
                    <button type="button" className="af-share more" onClick={nativeShare}>
                      <Icon name="share" /> Plus
                    </button>
                  )}
                </div>

                <p className="af-label" style={{ marginTop: "1.5rem" }}>
                  Messages prêts à envoyer
                </p>
                <div className="af-msgs">
                  {messages.map((m) => (
                    <div key={m.key} className="af-msg">
                      <div className="af-msg-top">
                        <b>{m.label}</b>
                        <button
                          type="button"
                          className={`af-msg-copy ${copied === m.key ? "ok" : ""}`}
                          onClick={() => doCopy(m.text, m.key)}
                        >
                          {copied === m.key ? "Copié ✓" : "Copier"}
                        </button>
                      </div>
                      <p>{m.text}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ============ COMMENT ÇA MARCHE ============ */}
              <section className="af-how">
                <div className="af-how-item">
                  <span className="af-how-n">1</span>
                  <h3>Partagez votre lien</h3>
                  <p>Sur WhatsApp, Telegram, Facebook ou en message privé.</p>
                </div>
                <div className="af-how-item">
                  <span className="af-how-n">2</span>
                  <h3>Ils s'abonnent</h3>
                  <p>Vos invités s'inscrivent puis choisissent le plan Pro ou Business.</p>
                </div>
                <div className="af-how-item">
                  <span className="af-how-n">3</span>
                  <h3>Vous gagnez</h3>
                  <p>
                    À {rules.target} abonnés, {rules.reward_days} jours d'abonnement s'activent
                    automatiquement sur votre compte.
                  </p>
                </div>
              </section>

              {/* ============ NIVEAU ============ */}
              <section className="af-card af-tier">
                <div className="af-tier-top">
                  <span className="af-tier-icon">{tier.icon}</span>
                  <div>
                    <p className="af-label" style={{ marginBottom: "0.1rem" }}>
                      Votre niveau
                    </p>
                    <h2 className="af-card-title">Ambassadeur {tier.name}</h2>
                  </div>
                </div>
                <div className="af-bar">
                  <div className="af-bar-fill" style={{ width: `${tierPct}%` }} />
                </div>
                <p className="af-tier-text">
                  {nextTier ? (
                    <>
                      Encore <b>{nextTier.min - (stats.paying || 0)}</b> abonné
                      {nextTier.min - (stats.paying || 0) > 1 ? "s" : ""} pour passer {nextTier.icon}{" "}
                      <b>{nextTier.name}</b>.
                    </>
                  ) : (
                    <>Niveau maximum atteint. Merci d'être un super ambassadeur !</>
                  )}
                </p>
                <div className="af-tier-row">
                  {TIERS.map((t, i) => (
                    <span key={t.name} className={`af-tier-badge ${i <= tierIndex ? "on" : ""}`}>
                      {t.icon} {t.name}
                    </span>
                  ))}
                </div>
              </section>

              {/* ============ MES FILLEULS ============ */}
              <section className="af-card">
                <div className="af-card-head">
                  <div>
                    <p className="af-label">Mes invités</p>
                    <h2 className="af-card-title">
                      {stats.invited || 0} personne{(stats.invited || 0) > 1 ? "s" : ""}
                    </h2>
                  </div>
                  {stats.invited > 0 && <span className="af-conv">{stats.conversion}% abonnés</span>}
                </div>

                {data.referrals.length === 0 ? (
                  <div className="af-empty">
                    <span className="af-empty-icon">🚀</span>
                    <p>
                      <b>Personne n'a encore rejoint avec votre lien.</b>
                      <br />
                      Envoyez-le à 5 amis aujourd'hui : c'est le meilleur moyen de démarrer.
                    </p>
                    <button type="button" className="af-copy-btn" onClick={() => doCopy(url, "link2")}>
                      <Icon name={copied === "link2" ? "check" : "copy"} />
                      {copied === "link2" ? "Copié !" : "Copier mon lien"}
                    </button>
                  </div>
                ) : (
                  <ul className="af-list">
                    {data.referrals.map((r, i) => (
                      <li key={i} className="af-row">
                        <span className="af-avatar">{r.name.charAt(0).toUpperCase()}</span>
                        <span className="af-row-main">
                          <b>{r.name}</b>
                          <small>
                            Inscrit le {fmtDay(r.joined_at)}
                            {r.status === "pending" && r.unlock_at
                              ? ` · validation dans ${daysLeft(r.unlock_at, now)} j`
                              : ""}
                          </small>
                        </span>
                        <span className="af-row-tags">
                          {r.plan && <span className="af-plan-tag">{PLAN_LABEL[r.plan] || r.plan}</span>}
                          <span className={`af-status ${r.status}`}>
                            {r.status === "signup" && "Inscrit"}
                            {r.status === "pending" && "En validation"}
                            {r.status === "validated" && "Validé ✓"}
                            {r.status === "rewarded" && "Récompensé 🎁"}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* ============ MES RÉCOMPENSES ============ */}
              {data.rewards.length > 0 && (
                <section className="af-card">
                  <p className="af-label">Historique</p>
                  <h2 className="af-card-title">Mes récompenses</h2>
                  <ul className="af-list" style={{ marginTop: "1rem" }}>
                    {data.rewards.map((r) => (
                      <li key={r.id} className="af-row reward">
                        <span className="af-avatar gift">🎁</span>
                        <span className="af-row-main">
                          <b>
                            {r.days} jours {r.plan_name} offerts
                          </b>
                          <small>Accordés le {fmtDayYear(r.granted_at)}</small>
                        </span>
                        <span className="af-status rewarded">Activé</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* ============ RÈGLES ============ */}
              <section className="af-card">
                <p className="af-label">Bon à savoir</p>
                <div className="af-faq">
                  <details>
                    <summary>Quels abonnements comptent ?</summary>
                    <p>
                      Seuls les abonnements payants (Pro et Business) comptent. Un invité qui reste sur le plan
                      Gratuit ne compte pas. Chaque invité compte une seule fois, pour son premier abonnement.
                    </p>
                  </details>
                  <details>
                    <summary>Quel abonnement vais-je recevoir ?</summary>
                    <p>
                      Vous recevez {rules.reward_days} jours du plan de vos filleuls. Si vos {rules.target} invités
                      n'ont pas le même plan, vous recevez le plus bas des {rules.target}. Si vous avez déjà un plan
                      égal ou supérieur, vos {rules.reward_days} jours sont simplement ajoutés à la fin de votre
                      abonnement : vous ne perdez jamais rien.
                    </p>
                  </details>
                  <details>
                    <summary>Pourquoi un délai de {rules.hold_days} jours ?</summary>
                    <p>
                      Chaque paiement est validé {rules.hold_days} jours après son règlement, pour éviter les
                      litiges et les abus. Votre barre avance tout de suite, et votre cadeau s'active
                      automatiquement à la fin du délai.
                    </p>
                  </details>
                  <details>
                    <summary>Puis-je gagner plusieurs fois ?</summary>
                    <p>
                      Oui, sans limite. Chaque groupe de {rules.target} nouveaux abonnés vous offre un nouveau
                      mois.
                    </p>
                  </details>
                  <details>
                    <summary>Que n'ai-je pas le droit de faire ?</summary>
                    <p>
                      Vous ne pouvez pas utiliser votre propre lien pour vous inscrire avec une autre adresse
                      e-mail. Les comptes créés pour tricher sont ignorés et les récompenses peuvent être
                      retirées.
                    </p>
                  </details>
                </div>
              </section>
            </>
          )
        )}
      </div>

      <style>{`
        .af-page { max-width: 62rem; display: grid; gap: 1.3rem; }
        .af-grad {
          background: linear-gradient(120deg,#60a5fa,#c4b5fd); -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
        }
        .af-gold {
          background: linear-gradient(120deg,#D4AF37,#f3d77a,#D4AF37); background-size: 200% 100%;
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;
          animation: af-shine 4s linear infinite;
        }
        @keyframes af-shine { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        @keyframes af-rise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes af-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(212,175,55,0.55); } 50% { box-shadow: 0 0 0 10px rgba(212,175,55,0); } }
        @keyframes af-shake { 0%, 100% { transform: rotate(0); } 20% { transform: rotate(-9deg); } 40% { transform: rotate(8deg); } 60% { transform: rotate(-6deg); } 80% { transform: rotate(4deg); } }
        @keyframes af-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes af-skel { 0% { opacity: 0.45; } 50% { opacity: 0.9; } 100% { opacity: 0.45; } }

        /* ---------- Hero ---------- */
        .af-hero {
          position: relative; overflow: hidden; isolation: isolate; border-radius: 28px; color: #fff;
          padding: 2.2rem 1.4rem 1.8rem;
          background: linear-gradient(150deg, #0f1235 0%, #1b1450 55%, #2a1670 100%);
          box-shadow: 0 30px 70px -28px rgba(99,102,241,0.7), inset 0 0 0 1px rgba(255,255,255,0.08);
          animation: af-rise 0.7s cubic-bezier(.2,.8,.2,1) both;
        }
        .af-hero::after {
          content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: 0.5;
          background-image: radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px); background-size: 22px 22px;
          -webkit-mask-image: radial-gradient(circle at 70% 20%, #000, transparent 70%);
          mask-image: radial-gradient(circle at 70% 20%, #000, transparent 70%);
        }
        .af-hero-glow {
          position: absolute; z-index: -1; top: -90px; right: -70px; width: 280px; height: 280px; border-radius: 50%;
          filter: blur(60px); opacity: 0.65; background: radial-gradient(circle, #8B5CF6, #3B82F6 60%, transparent 70%);
          animation: af-float 7s ease-in-out infinite;
        }
        .af-pill {
          display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.35rem 0.9rem; border-radius: 999px;
          font-size: 0.74rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
          background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #f3d77a;
        }
        .af-hero-title { margin: 1rem 0 0.8rem; font-size: 1.9rem; font-weight: 900; line-height: 1.18; letter-spacing: -0.02em; }
        .af-hero-sub { max-width: 40rem; font-size: 0.95rem; line-height: 1.65; opacity: 0.85; }
        .af-hero-steps {
          margin-top: 1.2rem; display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; font-size: 0.8rem; font-weight: 700;
        }
        .af-hero-steps span { padding: 0.35rem 0.8rem; border-radius: 999px; background: rgba(255,255,255,0.1); }
        .af-hero-steps i { font-style: normal; opacity: 0.6; }
        @media (min-width: 700px) {
          .af-hero { padding: 2.8rem 2.6rem 2.4rem; }
          .af-hero-title { font-size: 2.7rem; }
          .af-hero-sub { font-size: 1.02rem; }
        }

        /* ---------- Stats ---------- */
        .af-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.8rem; }
        @media (min-width: 700px) { .af-stats { grid-template-columns: repeat(4, 1fr); gap: 1rem; } }
        .af-stat {
          display: grid; gap: 0.25rem; padding: 1.1rem 1rem; border-radius: 22px;
          background: rgba(128,128,128,0.08); border: 1px solid rgba(128,128,128,0.22);
          -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
          box-shadow: 0 12px 34px -18px rgba(0,0,0,0.3);
          animation: af-rise 0.7s cubic-bezier(.2,.8,.2,1) backwards;
          transition: transform 0.3s cubic-bezier(.2,.8,.2,1), box-shadow 0.3s ease;
        }
        .af-stat:nth-child(2) { animation-delay: 0.08s; }
        .af-stat:nth-child(3) { animation-delay: 0.16s; }
        .af-stat:nth-child(4) { animation-delay: 0.24s; }
        .af-stat:hover { transform: translateY(-5px); box-shadow: 0 24px 44px -20px rgba(139,92,246,0.55); }
        .af-stat-n {
          font-size: 2.1rem; font-weight: 900; line-height: 1.1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums;
          background: linear-gradient(120deg,#3B82F6,#8B5CF6); -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
        }
        .af-stat.gold .af-stat-n { background-image: linear-gradient(120deg,#D4AF37,#f3d77a); }
        .af-stat-l { font-size: 0.78rem; font-weight: 600; opacity: 0.7; }

        /* ---------- Cartes ---------- */
        .af-card {
          position: relative; padding: 1.4rem 1.2rem; border-radius: 26px;
          background: rgba(128,128,128,0.08); border: 1px solid rgba(128,128,128,0.22);
          -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
          box-shadow: 0 14px 38px -18px rgba(0,0,0,0.3);
          animation: af-rise 0.7s cubic-bezier(.2,.8,.2,1) backwards;
        }
        @media (min-width: 700px) { .af-card { padding: 1.7rem 1.8rem; } }
        .af-label { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #D4AF37; margin-bottom: 0.5rem; }
        .af-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.8rem; flex-wrap: wrap; }
        .af-card-title { font-size: 1.35rem; font-weight: 800; letter-spacing: -0.01em; }
        .af-prize-chip {
          display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.45rem 0.95rem; border-radius: 999px;
          font-size: 0.8rem; font-weight: 800; color: #1a1405;
          background: linear-gradient(120deg,#D4AF37,#f3d77a); box-shadow: 0 8px 20px -8px rgba(212,175,55,0.8);
        }

        /* ---------- Progression ---------- */
        .af-progress { border-color: rgba(139,92,246,0.4); }
        .af-track-wrap { position: relative; margin: 1.6rem 0.2rem 0.4rem; }
        .af-track {
          position: absolute; left: 6%; right: 6%; top: 22px; height: 10px; border-radius: 999px; overflow: hidden;
          background: rgba(128,128,128,0.25);
        }
        .af-track-pending, .af-track-done { position: absolute; left: 0; top: 0; height: 100%; border-radius: 999px; transition: width 1.1s cubic-bezier(.2,.8,.2,1); }
        .af-track-pending {
          background: repeating-linear-gradient(135deg, #D4AF37 0 8px, #f3d77a 8px 16px);
          opacity: 0.85;
        }
        .af-track-done { background: linear-gradient(90deg,#3B82F6,#8B5CF6); box-shadow: 0 0 16px rgba(139,92,246,0.7); }
        .af-nodes { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.2rem; text-align: center; }
        .af-node { display: grid; justify-items: center; gap: 0.3rem; }
        .af-node-dot {
          width: 54px; height: 54px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
          font-size: 1.35rem; border: 2px dashed rgba(128,128,128,0.55); background: rgba(128,128,128,0.12);
          transition: all 0.5s cubic-bezier(.2,.8,.2,1);
        }
        .af-node.pending .af-node-dot { border: 2px solid #D4AF37; background: rgba(212,175,55,0.22); color: #D4AF37; animation: af-pulse 2s ease-in-out infinite; }
        .af-node.validated .af-node-dot { border: 2px solid transparent; color: #fff; background: linear-gradient(135deg,#3B82F6,#8B5CF6); box-shadow: 0 10px 24px -8px rgba(99,102,241,0.9); }
        .af-node.gift .af-node-dot { border-style: solid; border-color: rgba(212,175,55,0.5); color: #D4AF37; }
        .af-node.gift.on .af-node-dot { color: #1a1405; border-color: transparent; background: linear-gradient(135deg,#D4AF37,#f3d77a); box-shadow: 0 10px 26px -6px rgba(212,175,55,0.9); animation: af-shake 1.6s ease-in-out infinite; }
        .af-node-label { font-size: 0.72rem; font-weight: 700; opacity: 0.8; }
        .af-node-plan { font-size: 0.66rem; font-weight: 800; padding: 0.1rem 0.5rem; border-radius: 999px; background: rgba(139,92,246,0.18); color: #8B5CF6; }
        .af-progress-msg { margin-top: 1.1rem; font-size: 0.92rem; line-height: 1.65; opacity: 0.9; }

        /* ---------- Partage ---------- */
        .af-link-row { display: flex; gap: 0.6rem; flex-wrap: wrap; }
        .af-link-input {
          flex: 1; min-width: 0; padding: 0.85rem 1rem; border-radius: 14px; font-size: 0.9rem; font-weight: 600;
          font-family: inherit; color: inherit; outline: none;
          background: rgba(128,128,128,0.12); border: 1px solid rgba(128,128,128,0.3);
        }
        .af-link-input:focus { border-color: #8B5CF6; }
        .af-copy-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.85rem 1.3rem; border: 0;
          border-radius: 14px; cursor: pointer; font-family: inherit; font-weight: 800; font-size: 0.92rem; color: #fff;
          background: linear-gradient(120deg,#3B82F6,#8B5CF6,#3B82F6); background-size: 220% 100%;
          box-shadow: 0 12px 26px -10px rgba(99,102,241,0.9); animation: af-shine 4s linear infinite;
          transition: transform 0.25s cubic-bezier(.2,.8,.2,1);
        }
        .af-copy-btn:hover { transform: translateY(-2px) scale(1.03); }
        .af-copy-btn:active { transform: scale(0.96); }
        .af-copy-btn.ok { background: linear-gradient(120deg,#16a34a,#22c55e); animation: none; }
        @media (max-width: 520px) { .af-copy-btn { width: 100%; } }
        .af-code { margin-top: 0.7rem; font-size: 0.82rem; opacity: 0.75; }
        .af-code b { letter-spacing: 0.12em; }
        .af-share-grid { margin-top: 1rem; display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
        @media (min-width: 700px) { .af-share-grid { grid-template-columns: repeat(5, auto); justify-content: start; } }
        .af-share {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.7rem 1.2rem; border: 0;
          border-radius: 14px; cursor: pointer; text-decoration: none; font-family: inherit; font-weight: 800; font-size: 0.88rem; color: #fff;
          transition: transform 0.25s cubic-bezier(.2,.8,.2,1), filter 0.25s ease;
        }
        .af-share:hover { transform: translateY(-3px); filter: brightness(1.08); }
        .af-share.wa { background: #25D366; }
        .af-share.tg { background: #229ED9; }
        .af-share.fb { background: #1877F2; }
        .af-share.ml { background: #6B7280; }
        .af-share.more { background: linear-gradient(120deg,#3B82F6,#8B5CF6); }
        .af-msgs { display: grid; gap: 0.7rem; margin-top: 0.4rem; }
        .af-msg { padding: 0.9rem 1rem; border-radius: 16px; background: rgba(128,128,128,0.1); border: 1px solid rgba(128,128,128,0.2); }
        .af-msg-top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; font-size: 0.82rem; }
        .af-msg p { margin-top: 0.45rem; font-size: 0.85rem; line-height: 1.55; opacity: 0.85; white-space: pre-line; word-break: break-word; }
        .af-msg-copy {
          padding: 0.3rem 0.8rem; border-radius: 999px; border: 1px solid rgba(139,92,246,0.55); cursor: pointer;
          font-family: inherit; font-size: 0.75rem; font-weight: 800; color: #8B5CF6; background: transparent;
          transition: all 0.2s ease;
        }
        .af-msg-copy:hover { background: rgba(139,92,246,0.12); }
        .af-msg-copy.ok { color: #16a34a; border-color: rgba(22,163,74,0.6); }

        /* ---------- Comment ça marche ---------- */
        .af-how { display: grid; gap: 0.8rem; }
        @media (min-width: 700px) { .af-how { grid-template-columns: repeat(3, 1fr); gap: 1rem; } }
        .af-how-item {
          position: relative; padding: 1.3rem 1.2rem; border-radius: 22px; overflow: hidden;
          background: linear-gradient(160deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1));
          border: 1px solid rgba(139,92,246,0.3); animation: af-rise 0.7s cubic-bezier(.2,.8,.2,1) backwards;
        }
        .af-how-n {
          display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 50%;
          font-weight: 900; color: #fff; background: linear-gradient(135deg,#3B82F6,#8B5CF6); box-shadow: 0 8px 18px -6px rgba(99,102,241,0.9);
        }
        .af-how-item h3 { margin: 0.8rem 0 0.3rem; font-size: 1.02rem; font-weight: 800; }
        .af-how-item p { font-size: 0.86rem; line-height: 1.55; opacity: 0.78; }

        /* ---------- Niveau ---------- */
        .af-tier-top { display: flex; align-items: center; gap: 0.9rem; }
        .af-tier-icon { font-size: 2.6rem; line-height: 1; filter: drop-shadow(0 8px 14px rgba(0,0,0,0.3)); }
        .af-bar { height: 10px; margin-top: 1.1rem; border-radius: 999px; overflow: hidden; background: rgba(128,128,128,0.25); }
        .af-bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg,#D4AF37,#f3d77a); transition: width 1s cubic-bezier(.2,.8,.2,1); }
        .af-tier-text { margin-top: 0.6rem; font-size: 0.88rem; opacity: 0.85; }
        .af-tier-row { margin-top: 0.9rem; display: flex; flex-wrap: wrap; gap: 0.45rem; }
        .af-tier-badge { padding: 0.3rem 0.75rem; border-radius: 999px; font-size: 0.76rem; font-weight: 700; opacity: 0.45; border: 1px solid rgba(128,128,128,0.4); }
        .af-tier-badge.on { opacity: 1; border-color: rgba(212,175,55,0.7); background: rgba(212,175,55,0.14); }

        /* ---------- Listes ---------- */
        .af-conv { padding: 0.35rem 0.9rem; border-radius: 999px; font-size: 0.8rem; font-weight: 800; background: rgba(34,197,94,0.15); color: #16a34a; }
   .af-list { list-style: none; padding: 0; margin: 1rem 0 0; display: grid; gap: 0.6rem; }
        .af-row {
          display: flex; align-items: center; gap: 0.8rem; padding: 0.75rem 0.9rem; border-radius: 16px;
          background: rgba(128,128,128,0.08); border: 1px solid rgba(128,128,128,0.18);
          transition: transform 0.25s ease, border-color 0.25s ease;
        }
        .af-row:hover { transform: translateX(4px); border-color: rgba(139,92,246,0.5); }
        .af-avatar {
          flex: none; width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
          font-weight: 800; color: #fff; background: linear-gradient(135deg,#3B82F6,#8B5CF6);
        }
        .af-avatar.gift { background: linear-gradient(135deg,#D4AF37,#f3d77a); font-size: 1.2rem; }
        .af-row-main { flex: 1; min-width: 0; display: grid; gap: 0.1rem; }
        .af-row-main b { font-size: 0.92rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .af-row-main small { font-size: 0.74rem; opacity: 0.65; }
        .af-row-tags { display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem; }
        @media (min-width: 520px) { .af-row-tags { flex-direction: row; align-items: center; } }
        .af-plan-tag { font-size: 0.68rem; font-weight: 800; padding: 0.15rem 0.55rem; border-radius: 999px; background: rgba(139,92,246,0.18); color: #8B5CF6; }
        .af-status { font-size: 0.72rem; font-weight: 800; padding: 0.25rem 0.7rem; border-radius: 999px; white-space: nowrap; }
        .af-status.signup { background: rgba(128,128,128,0.2); }
        .af-status.pending { background: rgba(212,175,55,0.2); color: #b8921f; }
        .af-status.validated { background: rgba(34,197,94,0.18); color: #16a34a; }
        .af-status.rewarded { background: rgba(139,92,246,0.18); color: #8B5CF6; }

        .af-empty { margin-top: 1rem; padding: 1.6rem 1rem; text-align: center; border-radius: 20px; border: 1.5px dashed rgba(128,128,128,0.4); display: grid; gap: 0.9rem; justify-items: center; }
        .af-empty-icon { font-size: 2.6rem; animation: af-float 3s ease-in-out infinite; }
        .af-empty p { font-size: 0.9rem; line-height: 1.6; opacity: 0.85; }

        /* ---------- FAQ ---------- */
        .af-faq { display: grid; gap: 0.6rem; }
        .af-faq details { padding: 0.8rem 1rem; border-radius: 16px; background: rgba(128,128,128,0.08); border: 1px solid rgba(128,128,128,0.18); }
        .af-faq summary { cursor: pointer; font-weight: 700; font-size: 0.92rem; }
        .af-faq p { margin-top: 0.6rem; font-size: 0.86rem; line-height: 1.65; opacity: 0.82; }

        /* ---------- États ---------- */
        .af-error { padding: 0.8rem 1rem; border-radius: 16px; font-size: 0.9rem; border: 1px solid rgba(239,68,68,0.6); background: rgba(239,68,68,0.1); }
        .af-error-btn { margin-left: 0.5rem; font-weight: 800; text-decoration: underline; cursor: pointer; background: none; border: 0; color: inherit; font-family: inherit; }
        .af-skeleton { display: grid; gap: 1rem; }
        .af-skeleton div { height: 130px; border-radius: 24px; background: rgba(128,128,128,0.15); animation: af-skel 1.4s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .af-page *, .af-page *::before, .af-page *::after { animation: none !important; transition: none !important; }
        }
      `}</style>
    </DashboardLayout>
  );
}
