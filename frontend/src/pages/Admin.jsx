import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";
const REFRESH_MS = 15000;

const fcfa = (v) => `${Number(v || 0).toLocaleString("fr-FR")} FCFA`;
const nb = (v) => Number(v || 0).toLocaleString("fr-FR");
const toDate = (s) => {
  if (!s) return null;
  const str = String(s);
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(str) ? str.replace(" ", "T") : str.includes("T") ? str + "Z" : str.replace(" ", "T") + "Z");
  return isNaN(d.getTime()) ? null : d;
};
const when = (s) => {
  const d = toDate(s);
  return d ? d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
};
const dayOnly = (s) => {
  const d = toDate(s);
  return d ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
};
const PLAN = { free: "Gratuit", pro: "Pro", business: "Business", unlimited: "Illimité", expired: "Expiré", gifted: "Offerts", internal: "Internes / test" };
const ST = {
  ACTIVATED: ["Plan activé", "ok"],
  PAID: ["Payé · non activé", "warn"],
  REVIEW: ["À vérifier", "warn"],
  PENDING: ["En attente", "wait"],
  FAILED: ["Échoué", "bad"],
};
const stateOf = (r) => {
  if (r.status === "PENDING") {
    const d = toDate(r.created_at);
    if (d && Date.now() - d.getTime() > 3 * 3600 * 1000) return ["Abandonné", "wait"];
  }
  return ST[r.status] || [r.status, "wait"];
};
const FILTERS = [
  ["all", "Tous"],
  ["ok", "Activés"],
  ["todo", "À traiter"],
  ["pending", "En attente / abandonnés"],
  ["failed", "Échoués"],
  ["test", "Tests"],
];
const initials = (n, e) =>
  String(n || e || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");

function Bars({ data, field, color, fmt }) {
  const max = Math.max(1, ...data.map((d) => d[field]));
  return (
    <div className="ad-bars" role="img">
      {data.map((d) => (
        <div key={d.day} className="ad-bar" title={`${d.day} : ${fmt ? fmt(d[field]) : d[field]}`}>
          <span className="ad-bar-n">{d[field] ? (fmt ? "" : d[field]) : ""}</span>
          <i style={{ height: `${Math.max(d[field] ? 8 : 3, (d[field] / max) * 100)}%`, background: d[field] ? color : "#E3E5EF" }} />
          <em>{new Date(d.day + "T00:00:00Z").getUTCDate()}</em>
        </div>
      ))}
    </div>
  );
}

export default function Admin() {
  const [data, setData] = useState(null);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("subs");
  const [q, setQ] = useState("");
  const [pf, setPf] = useState("all");
  const [act, setAct] = useState("");
  const [note, setNote] = useState("");
  const timer = useRef(null);

  async function load(force = false) {
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/admin/stats${force ? "?refresh=1" : ""}`, {
        credentials: "include",
        cache: "no-store",
      });
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
    } finally {
      setBusy(false);
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

  async function payAction(action, r, extra = {}) {
    if (action === "activate" && !window.confirm(`Activer le plan ${PLAN[r.plan] || r.plan} pour ${r.email} ?\nÀ faire seulement si le paiement est « Réussi » dans SasPay.`)) return;
    setAct(r.id + action);
    setNote("");
    try {
      const res = await fetch(`${API}/api/admin/payments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id: r.id, ...extra }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Action impossible.");
      if (action === "verify") setNote(json.status === "ACTIVATED" ? "✅ Paiement confirmé : plan activé." : `Résultat de la vérification : ${(ST[json.status] || [json.status])[0]}.`);
      if (action === "activate") setNote("✅ Plan activé pour 30 jours.");
      await load(true);
    } catch (e) {
      setNote("⚠️ " + e.message);
    } finally {
      setAct("");
    }
  }

  const ledger = useMemo(() => {
    const list = data?.ledger || [];
    return list.filter((r) => {
      if (pf === "test") return r.test;
      if (r.test) return false;
      if (pf === "ok") return r.status === "ACTIVATED";
      if (pf === "todo") return r.status === "PAID" || r.status === "REVIEW";
      if (pf === "pending") return r.status === "PENDING";
      if (pf === "failed") return r.status === "FAILED";
      return true;
    });
  }, [data, pf]);

  const users = useMemo(() => {
    const list = data?.users_list || [];
    const s = q.trim().toLowerCase();
    return s ? list.filter((u) => `${u.full_name} ${u.email}`.toLowerCase().includes(s)) : list;
  }, [data, q]);

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
  const total = data?.users.total || 0;
  const seg = p
    ? [
        { k: "free", n: p.free, c: "#B8BCD2" },
        { k: "pro", n: p.pro, c: "#6D8BFF" },
        { k: "business", n: p.business, c: "#8B5CF6" },
        { k: "gifted", n: p.gifted, c: "#34d399" },
        { k: "unlimited", n: p.unlimited, c: "#D4AF37" },
        { k: "internal", n: p.internal, c: "#9AA0B8" },
        { k: "expired", n: p.expired, c: "#F0A39B" },
      ]
    : [];
  const alerts = data?.todo || 0;

  return (
    <div className="ad-root">
      <div className="ad-wrap">
        <header className="ad-hero">
          <div className="ad-hero-top">
            <Link to="/dashboard" className="ad-back">← Application</Link>
            <button type="button" className="ad-refresh" onClick={() => load(true)} disabled={busy}>
              {busy ? "…" : "↻ Actualiser"}
            </button>
          </div>
          <div className="ad-kicker">Pilotage</div>
          <h1>Tableau de bord admin</h1>
          <div className="ad-live">
            <span className="ad-dot" /> Temps réel · rafraîchi toutes les {REFRESH_MS / 1000} s
            {updated && <> · {updated.toLocaleTimeString("fr-FR")}</>}
          </div>
          {data && (
            <div className="ad-hero-stats">
              <div>
                <b>{nb(data.users.total)}</b>
                <span>utilisateurs</span>
              </div>
              <div>
                <b>{nb(data.paid_active)}</b>
                <span>abonnés payants</span>
              </div>
              <div>
                <b>{fcfa(data.revenue.total_xof)}</b>
                <span>encaissé</span>
              </div>
            </div>
          )}
        </header>

        {error && <div className="ad-err">{error}</div>}
        {!data && !error && <p className="ad-muted">Chargement...</p>}

        {data && (
          <>
            {alerts > 0 && (
              <div className="ad-alert">
                <b>⚠️ {alerts} paiement(s) à traiter</b>
                <span>
                  Payés ou à vérifier chez SasPay mais sans plan activé. Le système tente de les activer
                  automatiquement ; sinon ouvrez-les pour les revérifier ou les activer.
                </span>
                <button type="button" className="ad-mini" onClick={() => { setTab("pay"); setPf("todo"); }}>
                  Voir les paiements à traiter →
                </button>
              </div>
            )}
            {data.healed > 0 && <div className="ad-ok">✅ {data.healed} abonnement(s) activé(s) automatiquement à l'instant.</div>}

            <div className="ad-grid">
              <div className="ad-card">
                <div className="ad-ic">👥</div>
                <div className="ad-k">Utilisateurs inscrits</div>
                <div className="ad-v">{nb(data.users.total)}</div>
                <div className="ad-s">
                  +{nb(data.users.new_24h)} en 24 h · +{nb(data.users.new_7d)} en 7 j · +{nb(data.users.new_30d)} en 30 j
                </div>
              </div>
              <div className="ad-card">
                <div className="ad-ic">💎</div>
                <div className="ad-k">Abonnés payants actifs</div>
                <div className="ad-v">{nb(data.paid_active)}</div>
                <div className="ad-s">
                  Pro {nb(p.pro)} · Business {nb(p.business)} · {nb(p.expired)} expiré(s)
                  {p.gifted > 0 && <> · + {nb(p.gifted)} offert(s)</>}
                </div>
              </div>
              <div className="ad-card gold">
                <div className="ad-ic">📈</div>
                <div className="ad-k">Revenu mensuel estimé</div>
                <div className="ad-v">{fcfa(data.mrr_xof)}</div>
                <div className="ad-s">Abonnés payants actifs × prix du plan · annualisé : {fcfa(data.arr_xof)}</div>
              </div>
              <div className="ad-card gold">
                <div className="ad-ic">💰</div>
                <div className="ad-k">Total encaissé</div>
                <div className="ad-v">{fcfa(data.revenue.total_xof)}</div>
                <div className="ad-s">{nb(data.revenue.payments_count)} paiement(s) réussi(s) · 30 j : {fcfa(data.revenue.last_30d_xof)}</div>
                {data.revenue.test_count > 0 && <div className="ad-s">Tests exclus : {fcfa(data.revenue.test_xof)}</div>}
              </div>
              <div className="ad-card">
                <div className="ad-ic">⚡</div>
                <div className="ad-k">Encaissé récemment</div>
                <div className="ad-v">{fcfa(data.revenue.today_xof)}</div>
                <div className="ad-s">Aujourd'hui · 7 jours : {fcfa(data.revenue.last_7d_xof)}</div>
              </div>
              <div className="ad-card">
                <div className="ad-ic">🎯</div>
                <div className="ad-k">Taux de conversion</div>
                <div className="ad-v">{data.conversion_pct} %</div>
                <div className="ad-s">Abonnés payants / inscrits{(p.unlimited + p.internal) > 0 && <> · {nb(p.unlimited + p.internal)} compte(s) interne(s) exclu(s)</>}</div>
              </div>
            </div>

            <h2>Activité des 14 derniers jours</h2>
            <div className="ad-cols">
              <div className="ad-panel">
                <div className="ad-panel-t">Nouvelles inscriptions</div>
                <Bars data={data.series} field="signups" color="linear-gradient(180deg,#8B5CF6,#6D8BFF)" />
              </div>
              <div className="ad-panel">
                <div className="ad-panel-t">Encaissements (FCFA)</div>
                <Bars data={data.series} field="revenue_xof" color="linear-gradient(180deg,#E9C85A,#C99A1C)" fmt={fcfa} />
              </div>
            </div>

            <h2>Répartition des comptes</h2>
            <div className="ad-panel">
              <div className="ad-split">
                {seg.map((s) =>
                  s.n > 0 ? <i key={s.k} style={{ flex: s.n, background: s.c }} title={`${PLAN[s.k]} : ${s.n}`} /> : null
                )}
              </div>
              <div className="ad-legend">
                {seg.map((s) => (
                  <span key={s.k}>
                    <i style={{ background: s.c }} /> {PLAN[s.k]} <b>{nb(s.n)}</b>
                    <em>{total ? Math.round((s.n / total) * 100) : 0} %</em>
                  </span>
                ))}
              </div>
            </div>

            <div className="ad-grid three" style={{ marginTop: "0.9rem" }}>
              {["pro", "business"].map((key) => {
                const pay = data.revenue.by_plan[key];
                return (
                  <div key={key} className="ad-card">
                    <div className="ad-k">Plan {PLAN[key]}</div>
                    <div className="ad-v">{nb(p[key])}</div>
                    <div className="ad-s">Actifs : {fcfa(p[key] * data.prices[key])} / mois</div>
                    <div className="ad-s">Encaissé : {fcfa(pay?.total_xof || 0)} ({nb(pay?.count || 0)} paiement(s))</div>
                  </div>
                );
              })}
              <div className="ad-card">
                <div className="ad-k">Plan Gratuit</div>
                <div className="ad-v">{nb(p.free)}</div>
                <div className="ad-s">Comptes sans abonnement payant</div>
              </div>
            </div>

            <div className="ad-tabs" role="tablist">
              {[
                ["subs", `Abonnés actifs (${data.subscribers.length})`],
                ["pay", `Paiements (${data.ledger.filter((r) => !r.test).length})`],
                ["users", `Utilisateurs (${nb(data.users.total)})`],
              ].map(([k, l]) => (
                <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
                  {l}
                </button>
              ))}
            </div>

            {tab === "subs" && (
              <div className="ad-list">
                {data.subscribers.length === 0 && <div className="ad-muted">Aucun abonné payant actif.</div>}
                {data.subscribers.map((r, i) => (
                  <div key={i} className="ad-row">
                    <span className="ad-av">{initials(r.full_name, r.email)}</span>
                    <div className="ad-grow">
                      <b>{r.full_name || "—"}</b>
                      <div className="ad-s">{r.email}</div>
                      <div className="ad-s">
                        {r.until ? <>Expire le {dayOnly(r.until)}{r.days_left !== null && ` · ${r.days_left} j restants`}</> : "Sans échéance"}
                      </div>
                    </div>
                    <div className="ad-end">
                      <span className={`ad-tag ${r.plan}`}>{PLAN[r.plan]}</span>
                      <span className="ad-s">{r.origin === "paid" ? "Payé" : "Offert / manuel"}</span>
                    </div>
                  </div>
                ))}
                {data.expired.length > 0 && (
                  <>
                    <div className="ad-sub">Abonnements expirés</div>
                    {data.expired.map((r, i) => (
                      <div key={i} className="ad-row dim">
                        <span className="ad-av">{initials(r.full_name, r.email)}</span>
                        <div className="ad-grow">
                          <b>{r.full_name || "—"}</b>
                          <div className="ad-s">{r.email}</div>
                        </div>
                        <div className="ad-end">
                          <span className="ad-tag expired">{PLAN[r.plan]} expiré</span>
                          <span className="ad-s">{dayOnly(r.plan_until)}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {tab === "pay" && (
              <>
                <div className="ad-tabs sm">
                  {FILTERS.map(([k, l]) => (
                    <button key={k} type="button" className={pf === k ? "on" : ""} onClick={() => setPf(k)}>
                      {l}
                    </button>
                  ))}
                </div>
                {note && <div className="ad-ok">{note}</div>}
                <div className="ad-list">
                  {ledger.length === 0 && <div className="ad-muted">Aucun paiement dans cette catégorie.</div>}
                  {ledger.map((r) => {
                    const [lab, tone] = stateOf(r);
                    const canVerify = r.source === "saspay" && ["PENDING", "REVIEW", "FAILED"].includes(r.status);
                    const canActivate = r.source === "saspay" && r.status !== "ACTIVATED";
                    return (
                      <div key={r.id} className="ad-pay">
                        <div className="ad-pay-top">
                          <span className={`ad-av ${tone === "ok" ? "gold" : tone === "warn" ? "warn" : ""}`}>
                            {tone === "ok" ? "✓" : tone === "warn" ? "!" : tone === "bad" ? "×" : "…"}
                          </span>
                          <div className="ad-grow">
                            <b>{r.name || r.email || "—"}</b>
                            <div className="ad-s">{r.email}</div>
                            <div className="ad-s">{PLAN[r.plan] || r.plan} · {when(r.created_at)}</div>
                          </div>
                          <div className="ad-end">
                            <b>{fcfa(r.amount_xof)}</b>
                            <span className={`ad-st ${tone}`}>{lab}</span>
                          </div>
                        </div>
                        <div className="ad-pay-info">
                          {r.status === "ACTIVATED" && (
                            <span>
                              {r.user_state === "active"
                                ? `Plan actif${r.user_until ? ` jusqu'au ${dayOnly(r.user_until)}` : ""}`
                                : r.user_state === "expired"
                                ? "Plan expiré depuis"
                                : "⚠️ Plan non actif sur le compte"}
                            </span>
                          )}
                          {r.status === "REVIEW" && <span>Réussi chez SasPay mais montant/devise à contrôler.</span>}
                          {r.status === "PENDING" && <span>Pas de confirmation de SasPay pour l'instant.</span>}
                          {r.test && <span className="ad-tag">Test · exclu des chiffres</span>}
                        </div>
                        <div className="ad-acts">
                          {canVerify && (
                            <button type="button" className="ad-mini" disabled={!!act} onClick={() => payAction("verify", r)}>
                              {act === r.id + "verify" ? "…" : "↻ Revérifier"}
                            </button>
                          )}
                          {canActivate && (
                            <button type="button" className="ad-mini strong" disabled={!!act} onClick={() => payAction("activate", r)}>
                              {act === r.id + "activate" ? "…" : "✓ Activer le plan"}
                            </button>
                          )}
                          <button type="button" className="ad-mini" disabled={!!act} onClick={() => payAction("test", r, { test: !r.test })}>
                            {r.test ? "Compter comme réel" : "Marquer comme test"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {tab === "users" && (
              <>
                <input
                  className="ad-search"
                  type="search"
                  placeholder="Rechercher un nom ou un email…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <div className="ad-list">
                  {users.length === 0 && <div className="ad-muted">Aucun résultat.</div>}
                  {users.map((r, i) => (
                    <div key={i} className="ad-row">
                      <span className="ad-av">{initials(r.full_name, r.email)}</span>
                      <div className="ad-grow">
                        <b>{r.full_name || "—"}</b>
                        <div className="ad-s">{r.email}</div>
                        <div className="ad-s">Inscrit le {when(r.created_at)}</div>
                      </div>
                      <span className={`ad-tag ${r.state === "active" ? r.plan : r.state}`}>
                        {r.state === "expired" ? "Expiré" : r.state === "internal" ? "Interne / test" : r.state === "gifted" ? `${PLAN[r.plan]} offert` : PLAN[r.plan]}
                      </span>
                    </div>
                  ))}
                  {!q && data.users.total > data.users_list.length && (
                    <div className="ad-muted">Les {data.users_list.length} plus récents sont affichés — utilisez la recherche.</div>
                  )}
                </div>
              </>
            )}

            <p className="ad-note">
              Source des chiffres : comptes (table des utilisateurs), paiements SasPay et ancien journal, fusionnés sans
              doublon. Les paiements en attente sont revérifiés automatiquement à chaque ouverture de cette page.
              Les comptes administrateur, illimités et de test, ainsi que les paiements marqués « test », sont exclus des chiffres.
              « Offert » = abonnement actif sans paiement réel (récompense d'affiliation ou activation manuelle).
              Dernière mise à jour : {when(data.generated_at)}.
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
      .ad-root { min-height: 100vh; background: #F4F5FB; color: #12132A; font-family: 'Inter', system-ui, sans-serif; padding: 1rem; box-sizing: border-box; overflow-x: clip; }
      .ad-wrap { max-width: 72rem; margin: 0 auto; }
      .ad-wrap * { box-sizing: border-box; min-width: 0; }
      .ad-center { text-align: center; margin: 30vh auto 0; }
      .ad-center a { color: #6D3BF5; font-weight: 600; }
      .ad-hero { position: relative; overflow: hidden; border-radius: 24px; padding: 1.3rem 1.3rem 1.2rem; color: #fff; background: linear-gradient(135deg,#14122F 0%,#2A1B6B 55%,#5B2BA6 100%); box-shadow: 0 24px 50px -28px rgba(60,30,140,.7); margin-bottom: 1.1rem; }
      .ad-hero::after { content: ""; position: absolute; right: -60px; top: -60px; width: 220px; height: 220px; border-radius: 50%; background: radial-gradient(circle,rgba(167,139,250,.45),transparent 70%); pointer-events: none; }
      .ad-hero-top { display: flex; justify-content: space-between; align-items: center; gap: .6rem; margin-bottom: .9rem; position: relative; z-index: 1; }
      .ad-back { color: #D9CCFF; text-decoration: none; font-weight: 700; font-size: .85rem; }
      .ad-refresh { border: 1px solid rgba(255,255,255,.28); background: rgba(255,255,255,.1); color: #fff; font-weight: 700; font-size: .8rem; padding: .45rem .85rem; border-radius: 999px; cursor: pointer; }
      .ad-refresh:disabled { opacity: .6; }
      .ad-kicker { font-size: .72rem; letter-spacing: .16em; text-transform: uppercase; font-weight: 700; color: #C4B5FD; position: relative; z-index: 1; }
      .ad-hero h1 { font-size: clamp(1.5rem, 6vw, 2.1rem); font-weight: 800; margin: .25rem 0 0; letter-spacing: -.02em; position: relative; z-index: 1; }
      .ad-live { margin-top: .5rem; font-size: .78rem; color: #CFC6F5; display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; position: relative; z-index: 1; }
      .ad-dot { width: 8px; height: 8px; border-radius: 50%; background: #34d399; animation: ad-pulse 1.6s ease-in-out infinite; }
      @keyframes ad-pulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
      .ad-hero-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: .6rem; margin-top: 1.1rem; position: relative; z-index: 1; }
      .ad-hero-stats div { background: rgba(255,255,255,.09); border: 1px solid rgba(255,255,255,.14); border-radius: 14px; padding: .65rem .7rem; }
      .ad-hero-stats b { display: block; font-size: clamp(.95rem, 4vw, 1.25rem); font-weight: 800; overflow-wrap: anywhere; }
      .ad-hero-stats span { font-size: .7rem; color: #CFC6F5; }
      .ad-grid { display: grid; gap: .8rem; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
      .ad-grid.three { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
      .ad-card { position: relative; padding: 1.1rem; border-radius: 20px; background: #fff; border: 1px solid #E3E5EF; box-shadow: 0 10px 26px -18px rgba(30,30,80,.35); }
      .ad-card.gold { border-color: #E6CF7C; background: linear-gradient(180deg,#FFFDF2,#FFF8DB); }
      .ad-ic { position: absolute; right: 1rem; top: 1rem; font-size: 1.15rem; opacity: .9; }
      .ad-k { font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: #5B5E78; font-weight: 700; padding-right: 1.8rem; }
      .ad-v { font-size: clamp(1.4rem, 6vw, 1.85rem); font-weight: 800; margin: .3rem 0; font-variant-numeric: tabular-nums; color: #0F1029; overflow-wrap: anywhere; }
      .ad-s { font-size: .78rem; color: #5B5E78; line-height: 1.5; overflow-wrap: anywhere; }
      .ad-root h2 { font-size: .95rem; font-weight: 800; margin: 1.7rem 0 .75rem; color: #2A1B6B; letter-spacing: .01em; }
      .ad-cols { display: grid; gap: .8rem; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); }
      .ad-panel { background: #fff; border: 1px solid #E3E5EF; border-radius: 20px; padding: 1rem; box-shadow: 0 10px 26px -18px rgba(30,30,80,.3); }
      .ad-panel-t { font-size: .8rem; font-weight: 700; color: #3B3D58; margin-bottom: .7rem; }
      .ad-bars { display: flex; align-items: flex-end; gap: 3px; height: 130px; }
      .ad-bar { flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; position: relative; }
      .ad-bar i { display: block; width: 100%; max-width: 22px; border-radius: 6px 6px 2px 2px; }
      .ad-bar em { font-style: normal; font-size: .6rem; color: #8A8DA6; margin-top: 3px; }
      .ad-bar-n { font-size: .62rem; font-weight: 700; color: #5B2BA6; }
      .ad-split { display: flex; height: 16px; border-radius: 999px; overflow: hidden; background: #ECEDF5; gap: 2px; }
      .ad-legend { display: flex; flex-wrap: wrap; gap: .5rem 1rem; margin-top: .8rem; font-size: .8rem; color: #3B3D58; }
      .ad-legend span { display: inline-flex; align-items: center; gap: .35rem; }
      .ad-legend i { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
      .ad-legend em { font-style: normal; color: #8A8DA6; font-size: .72rem; }
      .ad-tabs { display: flex; gap: .4rem; overflow-x: auto; margin: 1.8rem 0 .8rem; padding-bottom: 2px; -webkit-overflow-scrolling: touch; }
      .ad-tabs button { flex: none; border: 1px solid #DADCEA; background: #fff; color: #3B3D58; font-weight: 700; font-size: .8rem; padding: .55rem .9rem; border-radius: 999px; cursor: pointer; }
      .ad-tabs button.on { background: linear-gradient(135deg,#3B82F6,#8B5CF6); color: #fff; border-color: transparent; }
      .ad-search { width: 100%; padding: .75rem 1rem; border-radius: 14px; border: 1px solid #DADCEA; background: #fff; font-size: .9rem; margin-bottom: .7rem; }
      .ad-list { display: grid; gap: .5rem; }
      .ad-row { display: flex; align-items: center; gap: .75rem; padding: .75rem .9rem; border-radius: 16px; background: #fff; border: 1px solid #E3E5EF; font-size: .88rem; }
      .ad-row.dim { opacity: .75; }
      .ad-grow { flex: 1; overflow-wrap: anywhere; }
      .ad-end { display: flex; flex-direction: column; align-items: flex-end; gap: .2rem; text-align: right; }
      .ad-sub { margin: .8rem 0 .2rem; font-size: .78rem; font-weight: 800; color: #8A6A0A; text-transform: uppercase; letter-spacing: .08em; }
      .ad-av { flex: none; width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: .8rem; color: #fff; background: linear-gradient(135deg,#3B82F6,#8B5CF6); }
      .ad-av.gold { background: linear-gradient(135deg,#E9C85A,#C99A1C); }
      .ad-av.warn { background: linear-gradient(135deg,#F59E0B,#EF4444); }
      .ad-tag { font-size: .7rem; font-weight: 800; padding: .22rem .6rem; border-radius: 999px; background: #ECEDF5; color: #3B3D58; white-space: nowrap; }
      .ad-tag.pro { background: #E4EBFF; color: #2F55D4; }
      .ad-tag.business { background: #EDE4FF; color: #6D28D9; }
      .ad-tag.unlimited { background: #FFF3C4; color: #8A6A0A; }
      .ad-tag.expired { background: #FDECEC; color: #B42318; }
      .ad-tabs.sm { margin: .2rem 0 .8rem; }
      .ad-tabs.sm button { font-size: .74rem; padding: .4rem .75rem; }
      .ad-pay { background: #fff; border: 1px solid #E3E5EF; border-radius: 16px; padding: .8rem .9rem; display: grid; gap: .55rem; font-size: .88rem; }
      .ad-pay-top { display: flex; align-items: center; gap: .75rem; }
      .ad-pay-info { display: flex; flex-wrap: wrap; gap: .4rem .7rem; font-size: .76rem; color: #5B5E78; }
      .ad-acts { display: flex; flex-wrap: wrap; gap: .4rem; }
      .ad-mini { border: 1px solid #DADCEA; background: #fff; color: #3B3D58; font-weight: 700; font-size: .75rem; padding: .4rem .75rem; border-radius: 999px; cursor: pointer; }
      .ad-mini.strong { background: linear-gradient(135deg,#3B82F6,#8B5CF6); color: #fff; border-color: transparent; }
      .ad-mini:disabled { opacity: .55; }
      .ad-alert .ad-mini { justify-self: start; margin-top: .3rem; }
      .ad-st { font-size: .7rem; font-weight: 800; padding: .22rem .6rem; border-radius: 999px; white-space: nowrap; }
      .ad-st.ok { background: #DDF7EA; color: #067647; }
      .ad-st.warn { background: #FFF1D6; color: #9A5B00; }
      .ad-st.wait { background: #ECEDF5; color: #4A4C66; }
      .ad-st.bad { background: #FDECEC; color: #B42318; }
      .ad-ok { padding: .65rem .9rem; border-radius: 14px; background: #E8F8EF; border: 1px solid #BFE8D0; color: #067647; font-size: .84rem; margin-bottom: .8rem; }
      .ad-tag.gifted { background: #DDF7EA; color: #067647; }
      .ad-tag.internal { background: #ECEDF5; color: #4A4C66; }
      .ad-muted { color: #6B6E88; font-size: .88rem; padding: .4rem .2rem; }
      .ad-alert { display: grid; gap: .2rem; padding: .85rem 1rem; border-radius: 16px; background: #FFF6E5; border: 1px solid #F3D08A; color: #7A4B00; margin-bottom: .9rem; font-size: .84rem; line-height: 1.5; }
      .ad-err { padding: .7rem 1rem; border-radius: 12px; background: #FDECEC; color: #B42318; border: 1px solid #F5C2C0; margin-bottom: 1rem; }
      .ad-note { margin-top: 1.6rem; font-size: .76rem; color: #6B6E88; line-height: 1.6; }
      @media (min-width: 640px) { .ad-root { padding: 1.4rem; } .ad-hero { padding: 1.7rem; } }
    `}</style>
  );
}
