import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { CURRENCIES, saveDefaultCurrency } from "../utils/currency.js";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input, Select } from "../components/ui/Field.jsx";
import { IconUser, IconSettings, IconShield, IconCrown } from "../components/ui/Icons.jsx";

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

const iconStyle = { width: 18, height: 18 };

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
      <div className="dg-settings-wrap">
        <div className="dg-settings-header">
          <h1 className="dg-page__title">Paramètres</h1>
          <p className="dg-page__subtitle">Gérez votre profil et vos préférences.</p>
        </div>

        {loading ? (
          <p className="dg-page__subtitle">Chargement...</p>
        ) : (
          <>
            <form onSubmit={save}>
              <Card icon={<IconUser style={iconStyle} />} title="Profil">
                <Input
                  label="Nom affiché"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  placeholder="Votre nom"
                />
                <p className="dg-helper-text">
                  Ce nom apparaît comme formateur sur vos pages de vente, dans l'espace de vos
                  apprenants et sur les certificats.
                </p>

                <Input label="Email" value={email} readOnly />
              </Card>

              <Card icon={<IconSettings style={iconStyle} />} title="Préférences" className="dg-mt-6">
                <Select
                  label="Monnaie par défaut"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </Select>
                <p className="dg-helper-text">
                  Elle est proposée automatiquement quand vous fixez le prix d'une nouvelle
                  formation. Vous pouvez toujours la changer formation par formation.
                </p>
              </Card>

              <Card icon={<IconCrown style={iconStyle} />} title="Mon plan" className="dg-mt-6">
                <div className="dg-plan-row">
                  <span className="dg-badge dg-badge--brand">{plan || "free"}</span>
                  <span className="dg-helper-text" style={{ margin: 0 }}>
                    La gestion des plans arrivera avec « Abonnements ».
                  </span>
                </div>
              </Card>

              {err && <div className="dg-alert dg-alert--error">{err}</div>}
              {msg && <div className="dg-alert dg-alert--success">{msg}</div>}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="dg-mt-6"
                style={{ width: "100%" }}
                disabled={saving || name.trim().length < 2}
              >
                {saving ? "Enregistrement..." : "💾 Enregistrer"}
              </Button>
            </form>

            {/* ===== SÉCURITÉ ===== */}
            <form onSubmit={changePassword} autoComplete="off">
              <Card
                icon={<IconShield style={iconStyle} />}
                title="Sécurité"
                subtitle={hasPassword ? "Changer mon mot de passe" : "Définir un mot de passe"}
                className="dg-mt-8"
              >
                {!hasPassword && (
                  <p className="dg-helper-text" style={{ marginTop: 0 }}>
                    Votre compte utilise la connexion Google. Vous pouvez définir un mot de passe
                    pour vous connecter aussi avec votre email.
                  </p>
                )}

                {hasPassword && (
                  <Input
                    label="Mot de passe actuel"
                    type={showPwd ? "text" : "password"}
                    value={curPwd}
                    onChange={(e) => setCurPwd(e.target.value)}
                    autoComplete="current-password"
                  />
                )}

                <Input
                  label="Nouveau mot de passe"
                  type={showPwd ? "text" : "password"}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  autoComplete="new-password"
                  maxLength={128}
                />
                {pwdTooShort && <div className="dg-hint">8 caractères minimum.</div>}

                <Input
                  label="Confirmer le nouveau mot de passe"
                  type={showPwd ? "text" : "password"}
                  value={confPwd}
                  onChange={(e) => setConfPwd(e.target.value)}
                  autoComplete="new-password"
                  maxLength={128}
                />
                {pwdMismatch && (
                  <div className="dg-hint">Les deux mots de passe ne sont pas identiques.</div>
                )}

                <label className="dg-check-row">
                  <input
                    type="checkbox"
                    checked={showPwd}
                    onChange={(e) => setShowPwd(e.target.checked)}
                  />
                  <span>Afficher les mots de passe</span>
                </label>

                {pwdErr && <div className="dg-alert dg-alert--error">{pwdErr}</div>}
                {pwdMsg && <div className="dg-alert dg-alert--success">{pwdMsg}</div>}

                <Button
                  type="submit"
                  variant="secondary"
                  size="lg"
                  className="dg-mt-6"
                  style={{ width: "100%" }}
                  disabled={!pwdReady || pwdBusy}
                >
                  {pwdBusy
                    ? "Enregistrement..."
                    : hasPassword
                    ? "🔒 Changer le mot de passe"
                    : "🔒 Définir le mot de passe"}
                </Button>
              </Card>
            </form>
          </>
        )}
      </div>
    </DashboardLayout>
  );
    }
