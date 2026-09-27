import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input } from "../components/ui/Field.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

function fmtXof(n) {
  return `${Number(n || 0).toLocaleString("fr-FR")} FCFA`;
}

function fmtDate(s) {
  if (!s) return "";
  const d = new Date(String(s).replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

const SALE_LABELS = {
  PENDING: { label: "En attente", tone: "" },
  PAID: { label: "Payée", tone: "dg-pill--ok" },
  REVIEW: { label: "À vérifier", tone: "" },
  FAILED: { label: "Échouée", tone: "" },
};

const WITHDRAWAL_LABELS = {
  REQUESTED: "Demandé",
  PROCESSING: "En cours",
  PAID: "Versé",
  REJECTED: "Rejeté",
};

export default function Wallet() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  function load() {
    setLoading(true);
    fetch(`${API}/api/wallet`, { credentials: "include" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Erreur de chargement.");
        setData(json);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function submitWithdrawal(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError("");
    setFormSuccess("");
    try {
      const res = await fetch(`${API}/api/wallet/withdraw`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_xof: Number(amount), method: "mobile_money", phone }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Erreur lors de la demande.");
      setFormSuccess("Demande de retrait envoyée ✓ Elle sera traitée sous peu.");
      setAmount("");
      setPhone("");
      setShowForm(false);
      load();
    } catch (e2) {
      setFormError(e2.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="dg-settings-wrap" style={{ maxWidth: "50rem" }}>
        <Link to="/dashboard/boutique" style={{ fontSize: 13, color: "var(--dg-brand-solid)", textDecoration: "none", fontWeight: 600 }}>
          ← Retour à ma boutique
        </Link>

        <h1 className="text-2xl font-bold dg-mt-6">💳 Wallet</h1>
        <p className="dg-page__subtitle">Votre solde, vos ventes et vos retraits.</p>

        {error && <div className="dg-alert dg-alert--error">{error}</div>}
        {formSuccess && <div className="dg-alert dg-alert--success">{formSuccess}</div>}

        {loading ? (
          <p className="dg-page__subtitle">Chargement...</p>
        ) : (
          data && (
            <>
              {/* Solde */}
              <div className="dg-stat-grid-2">
                <Card className="dg-stat-mini" style={{ textAlign: "center" }}>
                  <div className="dg-stat-mini__n">{fmtXof(data.wallet.balance_xof)}</div>
                  <div className="dg-stat-mini__l">💰 Solde disponible</div>
                </Card>
                <Card className="dg-stat-mini" style={{ textAlign: "center" }}>
                  <div className="dg-stat-mini__n">{fmtXof(data.wallet.pending_xof)}</div>
                  <div className="dg-stat-mini__l">⏳ En attente de versement</div>
                </Card>
                <Card className="dg-stat-mini" style={{ textAlign: "center", gridColumn: "1 / -1" }}>
                  <div className="dg-stat-mini__n">{fmtXof(data.wallet.total_withdrawn_xof)}</div>
                  <div className="dg-stat-mini__l">✅ Total déjà retiré</div>
                </Card>
              </div>

              {/* Bouton retrait */}
              <Card className="dg-mt-6">
                {!showForm ? (
                  <Button
                    variant="primary"
                    size="lg"
                    style={{ width: "100%" }}
                    disabled={data.wallet.balance_xof < data.min_withdrawal_xof}
                    onClick={() => setShowForm(true)}
                  >
                    Retirer mes gains
                  </Button>
                ) : (
                  <form onSubmit={submitWithdrawal} style={{ display: "grid", gap: 12 }}>
                    <Input
                      label={`Montant à retirer (min. ${fmtXof(data.min_withdrawal_xof)})`}
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      max={data.wallet.balance_xof}
                      min={data.min_withdrawal_xof}
                      placeholder={String(data.wallet.balance_xof)}
                    />
                    <Input
                      label="Numéro Mobile Money"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+226 XX XX XX XX"
                    />
                    {formError && <div className="dg-alert dg-alert--error">{formError}</div>}
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button type="submit" variant="primary" disabled={submitting} style={{ flex: 1 }}>
                        {submitting ? "Envoi..." : "Confirmer la demande"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                        Annuler
                      </Button>
                    </div>
                  </form>
                )}
                {data.wallet.balance_xof < data.min_withdrawal_xof && !showForm && (
                  <p className="dg-helper-text" style={{ marginTop: 8 }}>
                    Solde minimum de {fmtXof(data.min_withdrawal_xof)} requis pour un retrait.
                  </p>
                )}
              </Card>

              {/* Historique des retraits */}
              {data.withdrawals && data.withdrawals.length > 0 && (
                <>
                  <div className="dg-section-label">Historique des retraits</div>
                  <div className="dg-row-block">
                    {data.withdrawals.map((w) => (
                      <div key={w.id} className="dg-row">
                        <div className="dg-row__main">
                          <div className="dg-row__title">{fmtXof(w.amount_xof)}</div>
                          <div className="dg-row__sub">{w.method}</div>
                        </div>
                        <div className="dg-row__side">
                          <span className="dg-pill">{WITHDRAWAL_LABELS[w.status] || w.status}</span>
                          <span className="dg-row__date">{fmtDate(w.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Historique des ventes */}
              <div className="dg-section-label">Historique des ventes</div>
              {data.sales && data.sales.length > 0 ? (
                <div className="dg-row-block">
                  {data.sales.map((s) => {
                    const st = SALE_LABELS[s.status] || { label: s.status, tone: "" };
                    return (
                      <div key={s.id} className="dg-row">
                        <div className="dg-row__main">
                          <div className="dg-row__title">{s.product_title}</div>
                          <div className="dg-row__sub">
                            {s.buyer_name || s.buyer_email} · {fmtXof(s.amount_xof)} (net {fmtXof(s.net_xof)})
                          </div>
                        </div>
                        <div className="dg-row__side">
                          <span className={`dg-pill ${st.tone}`}>{st.label}</span>
                          <span className="dg-row__date">{fmtDate(s.paid_at || s.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="dg-helper-text">Aucune vente pour le moment.</p>
              )}
            </>
          )
        )}
      </div>
    </DashboardLayout>
  );
    }
