import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

function fmtPrice(amount, currency) {
  if (amount === null || amount === undefined) return "";
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export default function ShopPublic() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(`${API}/api/public/shop/${slug}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Boutique introuvable.");
        if (alive) setData(json);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#6B6B85" }}>Chargement...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 40 }}>🏚️</p>
        <p style={{ color: "#6B6B85" }}>{error || "Boutique introuvable."}</p>
      </div>
    );
  }

  const { shop, formations, ebooks } = data;
  const accent = shop.accent_color || "#7C3AED";

  return (
    <div style={{ minHeight: "100vh", background: "#F7F7FB", fontFamily: "Inter, sans-serif" }}>
      {/* Bannière */}
      <div
        style={{
          height: 180,
          background: shop.banner_url ? `url(${shop.banner_url}) center/cover` : `linear-gradient(135deg, ${accent}, #C13BF5)`,
        }}
      />

      <div style={{ maxWidth: 720, margin: "-48px auto 0", padding: "0 20px 60px" }}>
        {/* En-tête */}
        <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 8px 24px rgba(16,16,40,0.08)", textAlign: "center" }}>
          <div
            style={{
              width: 84, height: 84, borderRadius: "50%", margin: "-64px auto 12px",
              background: shop.logo_url ? `url(${shop.logo_url}) center/cover` : accent,
              border: "4px solid #fff", boxShadow: "0 4px 12px rgba(16,16,40,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 28, fontWeight: 700,
            }}
          >
            {!shop.logo_url && (shop.full_name || "?").charAt(0).toUpperCase()}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{shop.full_name}</h1>
          {shop.bio && <p style={{ color: "#6B6B85", fontSize: 14, marginTop: 8 }}>{shop.bio}</p>}
        </div>

        {/* Formations */}
        {formations.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: accent, marginBottom: 12 }}>
              Formations
            </h2>
            <div style={{ display: "grid", gap: 12 }}>
              {formations.map((f) => (
                <Link
                  key={f.id}
                  to={`/formation/${f.id}`}
                  style={{
                    display: "flex", gap: 14, alignItems: "center", padding: 14, borderRadius: 16,
                    background: "#fff", boxShadow: "0 2px 8px rgba(16,16,40,0.06)", textDecoration: "none", color: "inherit",
                  }}
                >
                  <div
                    style={{
                      width: 56, height: 56, borderRadius: 10, flexShrink: 0, overflow: "hidden",
                      background: f.cover_url ? `url(${f.cover_url}) center/cover` : "#F3EEFF",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                    }}
                  >
                    {!f.cover_url && "🎓"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{f.title}</div>
                    {f.price !== null && (
                      <div style={{ fontSize: 14, fontWeight: 700, color: accent, marginTop: 2 }}>
                        {fmtPrice(f.price, f.currency)}
                      </div>
                    )}
                  </div>
                  <div style={{ color: "#9C9CB4", fontSize: 22 }}>›</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* eBooks */}
        {ebooks.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: accent, marginBottom: 12 }}>
              eBooks
            </h2>
            <div style={{ display: "grid", gap: 12 }}>
              {ebooks.map((b) => (
                <div
                  key={b.id}
                  style={{
                    display: "flex", gap: 14, alignItems: "center", padding: 14, borderRadius: 16,
                    background: "#fff", boxShadow: "0 2px 8px rgba(16,16,40,0.06)",
                  }}
                >
                  <div
                    style={{
                      width: 56, height: 56, borderRadius: 10, flexShrink: 0, background: "#F3EEFF",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                    }}
                  >
                    📘
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{b.title}</div>
                    <div style={{ fontSize: 13, color: "#9C9CB4", marginTop: 2 }}>Bientôt disponible à la vente</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {formations.length === 0 && ebooks.length === 0 && (
          <p style={{ textAlign: "center", color: "#9C9CB4", marginTop: 40 }}>
            Aucun produit publié pour le moment.
          </p>
        )}

        <p style={{ textAlign: "center", color: "#9C9CB4", fontSize: 12, marginTop: 48 }}>
          Boutique propulsée par Digitelio AI
        </p>
      </div>
    </div>
  );
        }
