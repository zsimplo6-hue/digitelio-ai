import { useEffect, useState } from "react";

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

export default function LearnersPanel({ formation }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const written = (formation.modules || []).filter((m) => (m.content || "").trim()).length;

  const linkFor = (token) => `${window.location.origin}/learn/${token}`;
  const waLink = (r) =>
    `https://wa.me/?text=${encodeURIComponent(
      `Bonjour ${r.learner_name}, voici votre accès à la formation « ${formation.title} » : ${linkFor(r.token)}`
    )}`;

  async function load() {
    try {
      const data = await api(`/formations/${formation.id}/enrollments`);
      setRows(data.enrollments || []);
      setTotal(data.total || 0);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formation.id]);

  async function create(e) {
    e?.preventDefault();
    if (name.trim().length < 2 || busy) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      await api(`/formations/${formation.id}/enrollments`, {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      setName("");
      setMsg("Accès créé ✓ Copiez le lien ou envoyez-le par WhatsApp.");
      await load();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy(token) {
    setErr("");
    try {
      await navigator.clipboard.writeText(linkFor(token));
      setMsg("Lien copié ✓");
    } catch {
      window.prompt("Copiez ce lien :", linkFor(token));
    }
  }

  async function remove(id) {
    if (!window.confirm("Supprimer cet accès ? L'apprenant ne pourra plus ouvrir son lien.")) return;
    setErr("");
    setMsg("");
    try {
      await api(`/formations/${formation.id}/enrollments/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="fm-screen no-print">
      <div className="fm-card">
        <div className="fm-label">Mes apprenants</div>

        {written === 0 ? (
          <div className="fm-muted fm-small">
            Rédigez au moins une leçon pour pouvoir donner un accès à un apprenant.
          </div>
        ) : (
          <form onSubmit={create}>
            <input
              className="fm-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom de l'apprenant (ex : Awa Traoré)"
              maxLength={60}
            />
            <button
              type="submit"
              className="fm-btn fm-btn-gold"
              style={{ marginTop: "0.7rem", marginBottom: 0 }}
              disabled={busy || name.trim().length < 2}
            >
              {busy ? "Création..." : "➕ Créer un accès"}
            </button>
            <div className="fm-muted fm-small">
              Chaque apprenant reçoit un lien privé vers son espace de cours. Après un paiement,
              créez son accès et envoyez-lui le lien.
            </div>
          </form>
        )}

        {err && <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{err}</div>}
        {msg && <div className="fm-ok">{msg}</div>}

        {loading ? (
          <p className="fm-muted">Chargement...</p>
        ) : rows.length === 0 ? (
          <p className="fm-muted fm-small" style={{ marginTop: "1rem" }}>
            Aucun apprenant pour le moment.
          </p>
        ) : (
          <div className="ln-list">
            {rows.map((r) => (
              <div key={r.id} className="ln-item">
                <div className="ln-top">
                  <div>
                    <div className="fm-module-title">{r.learner_name}</div>
                    <div className={r.completed_at ? "ln-prog done" : "ln-prog"}>
                      {r.completed_at ? "✓ Terminé" : `Progression : ${r.completed_count}/${total}`}
                    </div>
                  </div>
                  <button className="fm-del" style={{ padding: "0.3rem 0.5rem" }} onClick={() => remove(r.id)} aria-label="Supprimer">
                    ✕
                  </button>
                </div>
                <div className="ln-actions">
                  <button type="button" className="fm-chip" onClick={() => copy(r.token)}>
                    📋 Copier le lien
                  </button>
                  <a className="fm-chip" href={waLink(r)} target="_blank" rel="noopener noreferrer">
                    💬 WhatsApp
                  </a>
                  <a className="fm-chip" href={linkFor(r.token)} target="_blank" rel="noopener noreferrer">
                    👁 Ouvrir
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .ln-list { display: grid; gap: 0.7rem; margin-top: 1.1rem; }
        .ln-item {
          padding: 0.8rem; border-radius: 12px;
          border: 1px solid rgba(128,128,128,0.3); background: rgba(128,128,128,0.06);
        }
        .ln-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
        .ln-prog { font-size: 0.82rem; opacity: 0.75; margin-top: 0.1rem; }
        .ln-prog.done { color: #16a34a; opacity: 1; font-weight: 700; }
        .ln-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.7rem; }
        .ln-actions a { text-decoration: none; }
      `}</style>
    </div>
  );
}
