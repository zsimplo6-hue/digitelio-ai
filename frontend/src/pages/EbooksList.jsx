import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

function fmtDate(s) {
  if (!s) return "";
  const d = new Date(String(s).replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function EbooksList() {
  const [ebooks, setEbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`${API}/api/ebooks`, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Erreur de chargement.");
        if (alive) setEbooks(data.ebooks || []);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="eb-page">
        <div className="eb-head">
          <div>
            <h1 className="text-2xl font-bold">eBooks</h1>
            <p className="eb-muted">Retrouvez tous vos eBooks et exportez-les en PDF.</p>
          </div>
          <Link to="/dashboard/ebooks/create" className="btn-primary eb-new">
            + Créer un eBook
          </Link>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</div>
        )}

        {loading ? (
          <p className="eb-muted" style={{ marginTop: "1.5rem" }}>Chargement...</p>
        ) : ebooks.length === 0 ? (
          <div className="eb-empty">
            <div className="eb-empty-icon">📘</div>
            <p>Vous n'avez pas encore d'eBook.</p>
            <Link to="/dashboard/ebooks/create" className="btn-primary eb-new">
              Créer mon premier eBook
            </Link>
          </div>
        ) : (
          <div className="eb-list">
            {ebooks.map((b) => (
              <Link key={b.id} to={`/dashboard/ebooks/${b.id}`} className="eb-item">
                <div className="eb-icon">📘</div>
                <div className="eb-info">
                  <div className="eb-title">{b.title}</div>
                  {b.description && <div className="eb-desc">{b.description}</div>}
                  <div className="eb-meta">
                    <span className={b.status === "published" ? "eb-badge on" : "eb-badge"}>
                      {b.status === "published" ? "Publié" : "Brouillon"}
                    </span>
                    <span>{b.language === "en" ? "English" : "Français"}</span>
                    {fmtDate(b.created_at) && <span>{fmtDate(b.created_at)}</span>}
                  </div>
                </div>
                <div className="eb-arrow">›</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .eb-page { max-width: 44rem; }
        .eb-muted { opacity: 0.7; margin-top: 0.4rem; }
        .eb-head { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-start; justify-content: space-between; }
        .eb-new { display: inline-block; text-decoration: none; padding: 0.7rem 1.1rem; border-radius: 10px; font-weight: 600; }
        .eb-list { display: grid; gap: 0.7rem; margin-top: 1.5rem; }
        .eb-item {
          display: flex; align-items: center; gap: 0.9rem; padding: 0.9rem; border-radius: 14px;
          text-decoration: none; color: inherit;
          background: rgba(128,128,128,0.10); border: 1px solid rgba(128,128,128,0.25);
        }
        .eb-icon {
          flex: none; width: 2.6rem; height: 2.6rem; border-radius: 10px; font-size: 1.3rem;
          display: flex; align-items: center; justify-content: center; background: rgba(212,175,55,0.15);
        }
        .eb-info { flex: 1; min-width: 0; }
        .eb-title { font-weight: 700; line-height: 1.3; }
        .eb-desc {
          font-size: 0.85rem; opacity: 0.7; margin-top: 0.15rem;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .eb-meta { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; font-size: 0.78rem; opacity: 0.8; margin-top: 0.4rem; }
        .eb-badge { padding: 0.1rem 0.55rem; border-radius: 999px; border: 1px solid rgba(128,128,128,0.4); font-weight: 600; }
        .eb-badge.on { background: #16a34a; color: #fff; border-color: #16a34a; }
        .eb-arrow { flex: none; font-size: 1.6rem; opacity: 0.5; }
        .eb-empty { text-align: center; padding: 2.5rem 1rem; }
        .eb-empty-icon { font-size: 2.4rem; margin-bottom: 0.4rem; }
        .eb-empty p { opacity: 0.8; margin-bottom: 1rem; }
      `}</style>
    </DashboardLayout>
  );
      }
