import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

async function api(path) {
  const res = await fetch(`${API}/api${path}`, { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Une erreur est survenue.");
  return data;
}

const euro = (n) => `${Number(n || 0).toLocaleString("fr-FR")} €`;
const priceText = (p) => (p === null || p === undefined ? "—" : p === 0 ? "Gratuit" : euro(p));

export default function PagesVente() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api("/sales")
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const linkFor = (id) => `${window.location.origin}/formation/${id}`;

  async function copy(id) {
    setMsg("");
    try {
      await navigator.clipboard.writeText(linkFor(id));
      setMsg("Lien copié ✓");
    } catch {
      window.prompt("Copiez ce lien :", linkFor(id));
    }
  }

  const t = data?.totals;
  const pages = data?.pages || [];

  return (
    <DashboardLayout>
      <div className="pv-page">
        <h1 className="text-2xl font-bold">Pages de vente</h1>
        <p className="pv-muted">
          Suivez vos formations en vente, leurs apprenants et vos résultats.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</div>
        )}
        {msg && <div className="pv-ok">{msg}</div>}

        {loading ? (
          <p className="pv-muted" style={{ marginTop: "1.5rem" }}>Chargement...</p>
        ) : (
          t && (
            <>
              <div className="pv-stats">
                <div className="pv-stat">
                  <div className="pv-stat-n">{t.published}</div>
                  <div className="pv-stat-l">Pages publiées</div>
                </div>
                <div className="pv-stat">
                  <div className="pv-stat-n">{t.learners}</div>
                  <div className="pv-stat-l">Apprenants</div>
                </div>
                <div className="pv-stat">
                  <div className="pv-stat-n">{t.finished}</div>
                  <div className="pv-stat-l">Formations terminées</div>
                </div>
                <div className="pv-stat">
                  <div className="pv-stat-n">{euro(t.revenue)}</div>
                  <div className="pv-stat-l">Revenu estimé</div>
                </div>
              </div>
              <div className="pv-muted pv-small">
                Revenu estimé = prix × apprenants inscrits. Il deviendra exact avec le paiement automatique.
              </div>

              {t.drafts > 0 && (
                <div className="pv-draft">
                  📝 {t.drafts} formation{t.drafts > 1 ? "s" : ""} en brouillon.{" "}
                  <Link to="/dashboard/formations">Terminer et publier →</Link>
                </div>
              )}

              <div className="pv-label">Mes pages en vente</div>

              {pages.length === 0 ? (
                <div className="pv-empty">
                  <p>Aucune page de vente pour le moment.</p>
                  <Link className="pv-btn pv-btn-gold" to="/dashboard/formations">
                    Créer et publier une formation
                  </Link>
                </div>
              ) : (
                <div className="pv-list">
                  {pages.map((p) => (
                    <div key={p.id} className="pv-item">
                      <div className="pv-top">
                        {p.has_cover ? (
                          <img
                            className="pv-thumb"
                            src={`${API}/api/public/formations/${p.id}/cover`}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <div className="pv-thumb pv-thumb-empty">◆</div>
                        )}
                        <div className="pv-info">
                          <div className="pv-title">{p.title}</div>
                          <div className="pv-price">{priceText(p.price)}</div>
                          <div className="pv-meta">
                            {p.learners} apprenant{p.learners > 1 ? "s" : ""} · {p.finished} terminé
                            {p.finished > 1 ? "s" : ""}
                            {p.certificate ? " · 🎓 Certificat" : ""}
                          </div>
                        </div>
                      </div>

                      {!p.payment_url && (
                        <div className="pv-warn">
                          ⚠ Lien de paiement manquant : le bouton d'achat est inactif.
                        </div>
                      )}

                      <div className="pv-actions">
                        <button type="button" className="pv-chip" onClick={() => copy(p.id)}>
                          📋 Copier le lien
                        </button>
                        <a className="pv-chip" href={linkFor(p.id)} target="_blank" rel="noopener noreferrer">
                          👁 Voir la page
                        </a>
                        <Link className="pv-chip" to="/dashboard/formations">
                          ⚙ Gérer
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        )}
      </div>

      <style>{`
        .pv-page { max-width: 44rem; }
        .pv-muted { opacity: 0.7; margin-top: 0.4rem; }
        .pv-small { font-size: 0.8rem; margin-top: 0.6rem; }
        .pv-ok { margin-top: 0.8rem; color: #16a34a; font-size: 0.9rem; font-weight: 600; }
        .pv-label {
          font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #D4AF37; margin: 1.8rem 0 0.8rem;
        }
        .pv-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.7rem; margin-top: 1.4rem; }
        .pv-stat {
          padding: 1rem; border-radius: 14px; text-align: center;
          background: rgba(128,128,128,0.10); border: 1px solid rgba(128,128,128,0.25);
        }
        .pv-stat-n { font-size: 1.6rem; font-weight: 800; color: #D4AF37; line-height: 1.2; }
        .pv-stat-l { font-size: 0.78rem; opacity: 0.75; margin-top: 0.2rem; }
        .pv-draft {
          margin-top: 1rem; padding: 0.8rem 1rem; border-radius: 12px; font-size: 0.9rem;
          border: 1px dashed rgba(212,175,55,0.6); background: rgba(212,175,55,0.06);
        }
        .pv-draft a { color: #D4AF37; font-weight: 700; text-decoration: none; }
        .pv-list { display: grid; gap: 0.8rem; }
        .pv-item {
          padding: 0.9rem; border-radius: 14px;
          background: rgba(128,128,128,0.10); border: 1px solid rgba(128,128,128,0.25);
        }
        .pv-top { display: flex; gap: 0.9rem; align-items: center; }
        .pv-thumb {
          flex: none; width: 5.5rem; aspect-ratio: 16 / 9; border-radius: 8px; object-fit: cover;
          border: 1px solid rgba(128,128,128,0.3);
        }
        .pv-thumb-empty {
          display: flex; align-items: center; justify-content: center;
          background: #0B0B0B; color: #D4AF37;
        }
        .pv-info { min-width: 0; }
        .pv-title { font-weight: 700; line-height: 1.3; }
        .pv-price { color: #D4AF37; font-weight: 800; margin-top: 0.1rem; }
        .pv-meta { font-size: 0.8rem; opacity: 0.75; margin-top: 0.1rem; }
        .pv-warn {
          margin-top: 0.7rem; padding: 0.5rem 0.7rem; border-radius: 8px; font-size: 0.82rem;
          color: #d97706; background: rgba(217,119,6,0.1);
        }
        .pv-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.8rem; }
        .pv-chip {
          font-size: 0.8rem; padding: 0.4rem 0.75rem; border-radius: 999px; cursor: pointer;
          border: 1px solid rgba(128,128,128,0.4); background: transparent; color: inherit;
          text-decoration: none; font-family: inherit;
        }
        .pv-empty { text-align: center; padding: 1.5rem 1rem; opacity: 0.9; }
        .pv-btn {
          display: inline-block; padding: 0.8rem 1.2rem; border-radius: 10px; font-weight: 700;
          text-decoration: none; margin-top: 0.6rem;
        }
        .pv-btn-gold { background: #D4AF37; color: #0B0B0B; }
      `}</style>
    </DashboardLayout>
  );
}
