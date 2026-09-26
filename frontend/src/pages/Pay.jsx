import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

function fmtXof(n) {
  return `${Number(n || 0).toLocaleString("fr-FR")} FCFA`;
}

export default function Pay() {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const paiementRef = searchParams.get("paiement");

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [returnStatus, setReturnStatus] = useState(null); // { checking, paid, message }

  useEffect(() => {
    let alive = true;
    fetch(`${API}/api/pay/${code}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Lien de paiement introuvable.");
        if (alive) setProduct(json.product);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [code]);

  /* Retour depuis SasPay : ?paiement=<sale_id> */
  useEffect(() => {
    if (!paiementRef) return;
    let cancelled = false;
    setReturnStatus({ checking: true, paid: false, message: "Vérification de votre paiement en cours…" });

    (async () => {
      for (let i = 0; i < 8 && !cancelled; i++) {
        try {
          const res = await fetch(`${API}/api/pay/verify?ref=${encodeURIComponent(paiementRef)}`);
          const json = await res.json().catch(() => ({}));
          if (res.ok && json.paid) {
            if (cancelled) return;
            setReturnStatus({ checking: false, paid: true, message: "✅ Paiement confirmé ! Votre produit est débloqué." });
            return;
          }
        } catch {
          /* on réessaie */
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!cancelled) {
        setReturnStatus({
          checking: false,
          paid: false,
          message: "Votre paiement n'est pas encore confirmé. Si vous avez bien payé, actualisez cette page dans quelques instants.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paiementRef]);

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`${API}/api/pay/${code}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyer_email: email, buyer_name: name }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.checkout_url) {
        throw new Error(json.error || "Impossible de démarrer le paiement.");
      }
      window.location.href = json.checkout_url;
    } catch (e2) {
      setSubmitError(e2.message);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A18" }}>
        <p style={{ color: "#A0A0C0" }}>Chargement...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", gap: 12, alignItems: "center", justifyContent: "center", background: "#0A0A18" }}>
        <p style={{ fontSize: 40 }}>⚠️</p>
        <p style={{ color: "#A0A0C0" }}>{error || "Lien de paiement introuvable."}</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0A0A18 0%, #16162A 100%)", fontFamily: "Inter, sans-serif", padding: "40px 16px" }}>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        {/* Marque */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, letterSpacing: "0.05em" }}>
            DIGITELIO <span style={{ background: "linear-gradient(135deg,#6D3BF5,#C13BF5)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>
          </span>
        </div>

        {/* Carte produit */}
        <div style={{ background: "#fff", borderRadius: 24, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
          {product.cover_url ? (
            <img src={product.cover_url} alt={product.title} style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ height: 100, background: "linear-gradient(135deg,#6D3BF5,#C13BF5)" }} />
          )}

          <div style={{ padding: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7C3AED", margin: 0 }}>
              {product.product_type === "formation" ? "Formation" : "eBook"} · Par {product.seller_name}
            </p>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: "6px 0 8px", color: "#0F0F1E" }}>{product.title}</h1>
            {product.description && (
              <p style={{ fontSize: 13, color: "#6B6B85", lineHeight: 1.5, margin: "0 0 16px" }}>{product.description}</p>
            )}

            <div style={{ fontSize: 28, fontWeight: 800, color: "#7C3AED", margin: "12px 0 20px" }}>
              {fmtXof(product.price_xof)}
            </div>

            {/* Statut retour de paiement */}
            {returnStatus && (
              <div
                style={{
                  padding: "12px 16px", borderRadius: 12, fontSize: 13, marginBottom: 16, lineHeight: 1.5,
                  background: returnStatus.paid ? "#E8FBF3" : "#F3EEFF",
                  color: returnStatus.paid ? "#16C784" : "#7C3AED",
                }}
              >
                {returnStatus.message}
              </div>
            )}

            {!returnStatus?.paid && (
              <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#6B6B85", display: "block", marginBottom: 4 }}>
                    Votre nom
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jean Dupont"
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #E1E1EC", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#6B6B85", display: "block", marginBottom: 4 }}>
                    Votre email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@email.com"
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #E1E1EC", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>

                {submitError && (
                  <div style={{ padding: "10px 14px", borderRadius: 10, fontSize: 13, background: "rgba(245,69,92,0.08)", color: "#F5455C" }}>
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    marginTop: 6, padding: "14px", borderRadius: 12, border: "none", fontWeight: 700, fontSize: 15,
                    color: "#fff", cursor: submitting ? "wait" : "pointer",
                    background: "linear-gradient(135deg,#6D3BF5,#C13BF5)",
                    boxShadow: "0 8px 24px rgba(124,58,237,0.35)",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? "Redirection..." : `Payer ${fmtXof(product.price_xof)}`}
                </button>
              </form>
            )}
          </div>
        </div>

        <p style={{ textAlign: "center", color: "#6B6B85", fontSize: 12, marginTop: 20 }}>
          🔒 Paiement sécurisé par SasPay
        </p>
      </div>
    </div>
  );
          }
