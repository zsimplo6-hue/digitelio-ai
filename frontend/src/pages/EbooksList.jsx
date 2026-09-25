import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { Button } from "../components/ui/Button.jsx";

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
      <div className="dg-settings-wrap" style={{ maxWidth: "44rem" }}>
        <div className="dg-list-head">
          <div>
            <h1 className="text-2xl font-bold">eBooks</h1>
            <p className="dg-page__subtitle">Retrouvez tous vos eBooks et exportez-les en PDF.</p>
          </div>
          <Link to="/dashboard/ebooks/create">
            <Button variant="primary">+ Créer un eBook</Button>
          </Link>
        </div>

        {error && <div className="dg-alert dg-alert--error">{error}</div>}

        {loading ? (
          <p className="dg-page__subtitle">Chargement...</p>
        ) : ebooks.length === 0 ? (
          <div className="dg-empty-state">
            <div className="dg-empty-state__icon">📘</div>
            <p>Vous n'avez pas encore d'eBook.</p>
            <Link to="/dashboard/ebooks/create">
              <Button variant="primary">Créer mon premier eBook</Button>
            </Link>
          </div>
        ) : (
          <div className="dg-item-list">
            {ebooks.map((b) => (
              <Link key={b.id} to={`/dashboard/ebooks/${b.id}`} className="dg-item-card">
                <div className="dg-item-icon">📘</div>
                <div className="dg-item-info">
                  <div className="dg-item-title">{b.title}</div>
                  {b.description && <div className="dg-item-desc">{b.description}</div>}
                  <div className="dg-item-meta">
                    <span className={`dg-pill ${b.status === "published" ? "dg-pill--ok" : ""}`}>
                      {b.status === "published" ? "Publié" : "Brouillon"}
                    </span>
                    <span>{b.language === "en" ? "English" : "Français"}</span>
                    {fmtDate(b.created_at) && <span>{fmtDate(b.created_at)}</span>}
                  </div>
                </div>
                <div className="dg-item-arrow">›</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
