import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";
const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

function fmtXof(n) {
  return `${Number(n || 0).toLocaleString("fr-FR")} FCFA`;
}

export default function Boutique() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`${API}/api/shop`, { credentials: "include" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Erreur de chargement.");
        if (alive) setData(json);
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

              <p className="dg-helper-text dg-mt-6">
                La personnalisation de votre boutique (bannière, logo, description, réseaux sociaux) et
                la gestion détaillée de vos produits arrivent dans une prochaine mise à jour.
              </p>
            </>
          )
        )}
      </div>
    </DashboardLayout>
  );
            }
