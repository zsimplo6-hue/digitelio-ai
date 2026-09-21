import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { CURRENCIES, saveDefaultCurrency } from "../utils/currency.js";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

async function api(path, options = {}) {
  const res = await fetch(`${API}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Une erreur est survenue.");
  return data;
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("");
  const [hasPassword, setHasPassword] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // Sécurité
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confPwd, setConfPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdErr, setPwdErr] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");

  useEffect(() => {
    let alive = true;
    api("/settings")
      .then((d) => {
        if (!alive) return;
        const s = d.settings;
        setName(s.full_name || "");
        setCurrency(s.default_currency || "EUR");
        setEmail(s.email || "");
        setPlan(s.plan || "");
        setHasPassword(s.has_password !== false);
        saveDefaultCurrency(s.default_currency || "EUR");
      })
      .catch((e) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  async function save(e) {
    e?.preventDefault();
    if (saving) return;
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const d = await api("/settings", {
        method: "PUT",
        body: JSON.stringify({ full_name: name.trim(), default_currency: currency }),
      });
      saveDefaultCurrency(d.settings.default_currency);
      setMsg("Réglages enregistrés ✓ Mise à jour du nom en cours...");
      // Le nom affiché dans l'en-tête vient de la session : on recharge pour l'actualiser
      setTimeout(() => window.location.reload(), 900);
    } catch (e2) {
      setErr(e2.message);
      setSaving(false);
    }
  }

  const pwdTooShort = newPwd.length > 0 && newPwd.length < 8;
  const pwdMismatch = confPwd.length > 0 && newPwd !== confPwd;
  const pwdReady =
    newPwd.length >= 8 && newPwd === confPwd && (!hasPassword || curPwd.length > 0);

  async function changePassword(e) {
    e?.preventDefault();
    if (!pwdReady || pwdBusy) return;
    setPwdBusy(true);
    setPwdErr("");
    setPwdMsg("");
    try {
      await api("/account/password", {
        method: "POST",
        body: JSON.stringify({ current_password: curPwd, new_password: newPwd }),
      });
      setCurPwd("");
      setNewPwd("");
      setConfPwd("");
      setHasPassword(true);
      setPwdMsg(
        hasPassword
          ? "Mot de passe modifié ✓"
          : "Mot de passe défini ✓ Vous pouvez désormais vous connecter aussi avec votre email."
      );
    } catch (e2) {
      setPwdErr(e2.message);
    } finally {
      setPwdBusy(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="st-page">
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="st-muted">Gérez votre profil et vos préférences.</p>

        {loading ? (
          <p className="st-muted" style={{ marginTop: "1.5rem" }}>Chargement...</p>
        ) : (
          <>
            <form onSubmit={save}>
              <div className="st-card">
                <div className="st-label">Profil</div>
                <label className="st-field">
                  <span>Nom affiché</span>
                  <input
                    className="st-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={60}
                    placeholder="Votre nom"
                  />
                </label>
                <div className="st-muted st-small">
                  Ce nom apparaît comme formateur sur vos pages de vente, dans l'espace de vos
                  apprenants et sur les certificats.
                </div>

                <label className="st-field" style={{ marginTop: "1.1rem" }}>
                  <span>Email</span>
                  <input className="st-input st-readonly" value={email} readOnly />
                </label>
              </div>

              <div className="st-card">
                <div className="st-label">Préférences</div>
                <label className="st-field">
                  <span>Monnaie par défaut</span>
                  <select
                    className="st-input"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="st-muted st-small">
                  Elle est proposée automatiquement quand vous fixez le prix d'une nouvelle
                  formation. Vous pouvez toujours la changer formation par formation.
                </div>
              </div>

              <div className="st-card">
                <div className="st-label">Mon plan</div>
                <div className="st-plan">
                  <span className="st-plan-badge">{plan || "free"}</span>
                  <span className="st-muted st-small" style={{ margin: 0 }}>
                    La gestion des plans arrivera avec « Abonnements ».
                  </span>
                </div>
              </div>

              {err && <div className="st-err">{err}</div>}
              {msg && <div className="st-ok">{msg}</div>}

              <button type="submit" className="st-save" disabled={saving || name.trim().length < 2}>
                {saving ? "Enregistrement..." : "💾 Enregistrer"}
              </button>
            </form>

            {/* ===== SÉCURITÉ ===== */}
            <form onSubmit={changePassword} autoComplete="off">
              <div className="st-card" style={{ marginTop: "2rem" }}>
                <div className="st-label">Sécurité</div>
                <div className="st-title">
                  {hasPassword ? "Changer mon mot de passe" : "Définir un mot de passe"}
                </div>

                {!hasPassword && (
                  <div className="st-muted st-small" style={{ marginTop: 0, marginBottom: "0.9rem" }}>
                    Votre compte utilise la connexion Google. Vous pouvez définir un mot de passe pour
                    vous connecter aussi avec votre email.
                  </div>
                )}

                {hasPassword && (
                  <label className="st-field">
                    <span>Mot de passe actuel</span>
                    <input
                      className="st-input"
                      type={showPwd ? "text" : "password"}
                      value={curPwd}
                      onChange={(e) => setCurPwd(e.target.value)}
                      autoComplete="current-password"
                    />
                  </label>
                )}

                <label className="st-field" style={{ marginTop: hasPassword ? "1rem" : 0 }}>
                  <span>Nouveau mot de passe</span>
                  <input
                    className="st-input"
                    type={showPwd ? "text" : "password"}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    autoComplete="new-password"
                    maxLength={128}
                  />
                </label>
                {pwdTooShort && <div className="st-hint">8 caractères minimum.</div>}

                <label className="st-field" style={{ marginTop: "1rem" }}>
                  <span>Confirmer le nouveau mot de passe</span>
                  <input
                    className="st-input"
                    type={showPwd ? "text" : "password"}
                    value={confPwd}
                    onChange={(e) => setConfPwd(e.target.value)}
                    autoComplete="new-password"
                    maxLength={128}
                  />
                </label>
                {pwdMismatch && <div className="st-hint">Les deux mots de passe ne sont pas identiques.</div>}

                <label className="st-check">
                  <input type="checkbox" checked={showPwd} onChange={(e) => setShowPwd(e.target.checked)} />
                  <span>Afficher les mots de passe</span>
                </label>

                {pwdErr && <div className="st-err">{pwdErr}</div>}
                {pwdMsg && <div className="st-ok">{pwdMsg}</div>}

                <button type="submit" className="st-save st-save-out" disabled={!pwdReady || pwdBusy}>
                  {pwdBusy
                    ? "Enregistrement..."
                    : hasPassword
                    ? "🔒 Changer le mot de passe"
                    : "🔒 Définir le mot de passe"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      <style>{`
        .st-page { max-width: 36rem; }
        .st-muted { opacity: 0.7; margin-top: 0.4rem; }
        .st-small { font-size: 0.8rem; margin-top: 0.5rem; line-height: 1.5; }
        .st-card {
          margin-top: 1.3rem; padding: 1.2rem; border-radius: 14px;
          background: rgba(128,128,128,0.10); border: 1px solid rgba(128,128,128,0.25);
        }
        .st-label {
          font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #D4AF37; margin-bottom: 0.9rem;
        }
        .st-title { font-weight: 700; margin-bottom: 0.9rem; }
        .st-field { display: block; }
        .st-field > span { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.4rem; }
        .st-input {
          width: 100%; padding: 0.8rem 1rem; border-radius: 10px; font-size: 1rem;
          background: rgba(128,128,128,0.12); border: 1px solid rgba(128,128,128,0.3);
          color: inherit; outline: none; font-family: inherit;
        }
        .st-input:focus { border-color: #D4AF37; }
        .st-readonly { opacity: 0.6; cursor: not-allowed; }
        .st-hint { font-size: 0.78rem; color: #d97706; margin-top: 0.35rem; }
        .st-check { display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem; font-size: 0.85rem; cursor: pointer; }
        .st-check input { width: 1.1rem; height: 1.1rem; accent-color: #D4AF37; }
        .st-plan { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
        .st-plan-badge {
          padding: 0.25rem 0.9rem; border-radius: 999px; font-weight: 700; text-transform: uppercase;
          font-size: 0.8rem; background: #D4AF37; color: #0B0B0B;
        }
        .st-save {
          width: 100%; margin-top: 1.4rem; padding: 0.95rem; border-radius: 10px; border: 0;
          background: #D4AF37; color: #0B0B0B; font-weight: 700; font-size: 1rem; cursor: pointer;
          font-family: inherit;
        }
        .st-save-out { background: transparent; color: inherit; border: 1px solid #D4AF37; }
        .st-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .st-err {
          margin-top: 1rem; padding: 0.6rem 1rem; border-radius: 10px; font-size: 0.9rem;
          color: #ef4444; background: rgba(239,68,68,0.1);
        }
        .st-ok { margin-top: 1rem; color: #16a34a; font-size: 0.9rem; font-weight: 600; }
      `}</style>
    </DashboardLayout>
  );
                                                              }
