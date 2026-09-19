import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout.jsx";

const API = import.meta.env.VITE_API_URL;

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

const EXAMPLES = [
  "Créer une boutique Shopify rentable",
  "Lancer sa chaîne YouTube",
  "Maîtriser le marketing sur TikTok",
];

export default function Formations() {
  const [formations, setFormations] = useState([]);
  const [current, setCurrent] = useState(null);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function loadList() {
    try {
      const data = await api("/formations");
      setFormations(data.formations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  async function createFormation(e) {
    e?.preventDefault();
    if (topic.trim().length < 5 || creating) return;
    setCreating(true);
    setError("");
    try {
      const data = await api("/formations", {
        method: "POST",
        body: JSON.stringify({ topic: topic.trim() }),
      });
      setCurrent(data.formation);
      setTopic("");
      loadList();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function openFormation(id) {
    setError("");
    try {
      const data = await api(`/formations/${id}`);
      setCurrent(data.formation);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeFormation(id) {
    if (!window.confirm("Supprimer cette formation ?")) return;
    try {
      await api(`/formations/${id}`, { method: "DELETE" });
      if (current?.id === id) setCurrent(null);
      loadList();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <DashboardLayout>
      <div className="fm-page">
        <h1 className="text-2xl font-bold">Formations</h1>
        <p className="fm-muted">
          Saisissez un sujet : l'IA construit le plan complet de votre formation.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</div>
        )}

        {/* 1. CRÉER UNE NOUVELLE FORMATION */}
        <form onSubmit={createFormation} className="fm-card">
          <div className="fm-label">Nouvelle formation</div>
          <input
            className="fm-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex : Créer une boutique Shopify rentable"
            maxLength={150}
            disabled={creating}
          />
          <div className="fm-chips">
            {EXAMPLES.map((ex) => (
              <button type="button" key={ex} className="fm-chip" onClick={() => setTopic(ex)}>
                {ex}
              </button>
            ))}
          </div>
          <button
            type="submit"
            className="btn-primary fm-btn"
            disabled={creating || topic.trim().length < 5}
          >
            {creating ? "Génération du plan..." : "✨ Générer le plan"}
          </button>
        </form>

        {/* 2. PLAN GÉNÉRÉ */}
        {current && (
          <div className="fm-card">
            <div className="fm-label">Plan de la formation</div>
            <h2 className="fm-title">{current.title}</h2>
            {current.description && <p className="fm-muted">{current.description}</p>}

            <ol className="fm-modules">
              {(current.modules || []).map((m, i) => (
                <li key={m.id || i} className="fm-module">
                  <span className="fm-num">{i + 1}</span>
                  <div>
                    <div className="fm-module-title">{m.title}</div>
                    {m.summary && <div className="fm-muted fm-small">{m.summary}</div>}
                  </div>
                </li>
              ))}
            </ol>

            <button className="fm-btn fm-btn-disabled" disabled>
              ✨ Générer toute la formation (étape suivante)
            </button>
          </div>
        )}

        {/* MES FORMATIONS */}
        <div className="fm-label" style={{ marginTop: "2rem" }}>Mes formations</div>
        {loading ? (
          <p className="fm-muted">Chargement...</p>
        ) : formations.length === 0 ? (
          <p className="fm-muted">Aucune formation pour le moment.</p>
        ) : (
          <div className="fm-list">
            {formations.map((f) => (
              <div key={f.id} className="fm-item">
                <button className="fm-item-main" onClick={() => openFormation(f.id)}>
                  <span className="fm-module-title">{f.title}</span>
                  <span className="fm-muted fm-small">
                    {f.modules_count ?? 0} modules · {f.status === "published" ? "Publiée" : "Brouillon"}
                  </span>
                </button>
                <button className="fm-del" onClick={() => removeFormation(f.id)} aria-label="Supprimer">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .fm-page { max-width: 44rem; }
        .fm-muted { opacity: 0.7; margin-top: 0.4rem; }
        .fm-small { font-size: 0.82rem; margin-top: 0.1rem; }
        .fm-label {
          font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #D4AF37; margin-bottom: 0.7rem;
        }
        .fm-card {
          margin-top: 1.5rem; padding: 1.2rem; border-radius: 14px;
          background: rgba(128,128,128,0.10); border: 1px solid rgba(128,128,128,0.25);
        }
        .fm-input {
          width: 100%; padding: 0.8rem 1rem; border-radius: 10px; font-size: 1rem;
          background: rgba(128,128,128,0.12); border: 1px solid rgba(128,128,128,0.3);
          color: inherit; outline: none;
        }
        .fm-input:focus { border-color: #D4AF37; }
        .fm-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.8rem 0 1rem; }
        .fm-chip {
          font-size: 0.8rem; padding: 0.35rem 0.7rem; border-radius: 999px;
          border: 1px solid rgba(128,128,128,0.35); background: transparent; color: inherit;
        }
        .fm-btn { width: 100%; padding: 0.85rem; border-radius: 10px; font-weight: 600; }
        .fm-btn:disabled { opacity: 0.5; }
        .fm-btn-disabled {
          margin-top: 1.2rem; background: rgba(128,128,128,0.2); color: inherit;
          border: 1px dashed rgba(128,128,128,0.4);
        }
        .fm-title { font-size: 1.3rem; font-weight: 700; }
        .fm-modules { list-style: none; padding: 0; margin: 1.2rem 0 0; display: grid; gap: 0.7rem; }
        .fm-module { display: flex; gap: 0.9rem; align-items: flex-start; }
        .fm-num {
          flex: none; width: 2rem; height: 2rem; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; background: #D4AF37; color: #0B0B0B;
        }
        .fm-module-title { font-weight: 600; }
        .fm-list { display: grid; gap: 0.6rem; }
        .fm-item {
          display: flex; align-items: center; border-radius: 12px;
          background: rgba(128,128,128,0.10); border: 1px solid rgba(128,128,128,0.25);
        }
        .fm-item-main {
          flex: 1; text-align: left; padding: 0.9rem 1rem; display: flex;
          flex-direction: column; background: transparent; color: inherit; border: 0;
        }
        .fm-del { padding: 0.9rem 1rem; background: transparent; border: 0; color: #ef4444; }
      `}</style>
    </DashboardLayout>
  );
                    }
