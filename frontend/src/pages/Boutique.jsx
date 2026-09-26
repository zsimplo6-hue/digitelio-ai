import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";
const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

function fmtXof(n) {
  return `${Number(n || 0).toLocaleString("fr-FR")} FCFA`;
}

function qrUrl(link) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(link)}`;
}

/* ---------- Carte "Partager & Vendre" d'un produit ---------- */
function ProductShareCard({ product }) {
  const [copiedField, setCopiedField] = useState("");

  function copy(text, field) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(""), 2000);
    });
  }

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="dg-card__title" style={{ fontSize: 16 }}>{product.title}</div>
          {product.sellable ? (
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dg-brand-solid)", marginTop: 2 }}>
              {fmtXof(product.price)}
            </div>
          ) : (
            <span className="dg-badge dg-badge--info" style={{ marginTop: 6, display: "inline-block" }}>
              {product.type === "ebook" ? "Vente bientôt disponible" : "Prix non défini en FCFA"}
            </span>
          )}
        </div>
        {product.sellable && (
          <img
            src={qrUrl(product.pay_url)}
            alt="QR code de paiement"
            width={64}
            height={64}
            style={{ borderRadius: 8, border: "1px solid var(--dg-border-subtle)" }}
          />
        )}
      </div>

      {product.sellable && (
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <div>
            <label className="dg-field__label">Lien du produit</label>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <div className="dg-field__input" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
                {product.product_url}
              </div>
              <Button variant="secondary" size="sm" onClick={() => copy(product.product_url, "product")}>
                {copiedField === "product" ? "✓" : "Copier"}
              </Button>
            </div>
          </div>
          <div>
            <label className="dg-field__label">Lien de paiement</label>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <div className="dg-field__input" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
                {product.pay_url}
              </div>
              <Button variant="secondary" size="sm" onClick={() => copy(product.pay_url, "pay")}>
                {copiedField === "pay" ? "✓" : "Copier"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Boutique() {
  const [data, setData] = useState(null);
  const [products, setProducts] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`${API}/api/shop`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${API}/api/shop/products`, { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([shopData, productsData]) => {
        if (!alive) return;
        if (shopData.error) throw new Error(shopData.error);
        setData(shopData);
        setProducts(productsData.products || []);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const shopUrl = data ? `${APP_URL}/shop/${data.shop.slug}` : "";

  function copyLink() {
    navigator.clipboard.writeText(shopUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <DashboardLayout>
      <div className="dg-settings-wrap" style={{ maxWidth: "50rem" }}>
        <h1 className="text-2xl font-bold">🛍️ Ma boutique</h1>
        <p className="dg-page__subtitle">
          Votre vitrine publique pour vendre vos eBooks, formations et packs.
        </p>

        {error && <div className="dg-alert dg-alert--error">{error}</div>}

        {loading ? (
          <p className="dg-page__subtitle">Chargement...</p>
        ) : (
          data && (
            <>
              {/* En-tête boutique */}
              <Card className="dg-mt-6">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div className="dg-card__title">{shopUrl}</div>
                    <p className="dg-helper-text" style={{ marginTop: 4 }}>
                      Votre lien de boutique public — partagez-le sur vos réseaux.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button variant="secondary" size="sm" onClick={copyLink}>
                      {copied ? "✓ Copié" : "Copier le lien"}
                    </Button>
                    <a href={shopUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="primary" size="sm">Voir la boutique</Button>
                    </a>
                  </div>
                </div>
              </Card>

              {/* Stats */}
              <div className="dg-stat-grid-2">
                <Card className="dg-stat-mini" style={{ textAlign: "center" }}>
                  <div className="dg-stat-mini__n">{fmtXof(data.stats.balance_xof)}</div>
                  <div className="dg-stat-mini__l">💰 Revenus disponibles</div>
                </Card>
                <Card className="dg-stat-mini" style={{ textAlign: "center" }}>
                  <div className="dg-stat-mini__n">{data.stats.sales_count}</div>
                  <div className="dg-stat-mini__l">🛒 Ventes totales</div>
                </Card>
                <Card className="dg-stat-mini" style={{ textAlign: "center" }}>
                  <div className="dg-stat-mini__n">{data.stats.products_published}</div>
                  <div className="dg-stat-mini__l">📦 Produits publiés</div>
                </Card>
                <Card className="dg-stat-mini" style={{ textAlign: "center" }}>
                  <div className="dg-stat-mini__n">{data.stats.clients_count}</div>
                  <div className="dg-stat-mini__l">👥 Clients</div>
                </Card>
              </div>

              {/* Produits : Partager & Vendre */}
              <div className="dg-section-label">Partager & vendre</div>
              {products && products.length > 0 ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {products.map((p) => (
                    <ProductShareCard key={`${p.type}-${p.id}`} product={p} />
                  ))}
                </div>
              ) : (
                <p className="dg-helper-text">
                  Publiez un eBook ou une formation pour obtenir vos liens de partage.
                </p>
              )}

              <p className="dg-helper-text dg-mt-6">
                La personnalisation de votre boutique (bannière, logo, description, réseaux sociaux)
                arrive dans une prochaine mise à jour.
              </p>
            </>
          )
        )}
      </div>
    </DashboardLayout>
  );
                                                       }
