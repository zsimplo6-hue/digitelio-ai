import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { renderMarkdown } from "../utils/markdown.js";

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

const EXAMPLES = [
  "Créer une boutique Shopify rentable",
  "Lancer sa chaîne YouTube",
  "Maîtriser le marketing sur TikTok",
];

function embedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

/* ---------- Éditeur d'une leçon ---------- */
function LessonEditor({ formation, module, onChange }) {
  const [content, setContent] = useState(module.content || "");
  const [videoUrl, setVideoUrl] = useState(module.video_url || "");
  const [resources, setResources] = useState(module.resources || []);
  const [tab, setTab] = useState("edit");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const embed = embedUrl(videoUrl.trim());
  const cleanResources = resources.filter((r) => r.label.trim() && r.url.trim());

  async function save() {
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const data = await api(`/formations/${formation.id}/modules/${module.id}`, {
        method: "PUT",
        body: JSON.stringify({ content, video_url: videoUrl.trim(), resources: cleanResources }),
      });
      onChange(data.module);
      setResources(data.module.resources);
      setMsg("Leçon enregistrée ✓");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    if (content.trim() && !window.confirm("Remplacer le texte actuel par une nouvelle leçon générée ?")) return;
    setGenerating(true);
    setErr("");
    setMsg("");
    try {
      const data = await api(`/formations/${formation.id}/modules/${module.id}/generate`, {
        method: "POST",
      });
      setContent(data.module.content);
      onChange({ id: module.id, content: data.module.content });
      setMsg("Leçon générée et enregistrée ✓");
    } catch (e) {
      setErr(e.message);
    } finally {
      setGenerating(false);
    }
  }

  function updateResource(i, field, value) {
    setResources((list) => list.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  return (
    <>
      <div className="fm-screen no-print">
        <div className="fm-card">
          <div className="fm-label">Leçon : {module.title}</div>

          <button className="fm-btn fm-btn-gold" onClick={generate} disabled={generating || saving}>
            {generating ? "Rédaction en cours..." : "✨ Générer la leçon"}
          </button>

          <div className="fm-tabs">
            <button className={tab === "edit" ? "fm-tab on" : "fm-tab"} onClick={() => setTab("edit")}>
              Éditer
            </button>
            <button className={tab === "preview" ? "fm-tab on" : "fm-tab"} onClick={() => setTab("preview")}>
              Aperçu
            </button>
          </div>

          {tab === "edit" ? (
            <textarea
              className="fm-input fm-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Texte de la leçon (Markdown : ### Titre, - puce)..."
            />
          ) : (
            <div
              className="fm-lesson"
              dangerouslySetInnerHTML={{
                __html: content.trim() ? renderMarkdown(content) : "<p>Aucun texte pour le moment.</p>",
              }}
            />
          )}

          <div className="fm-label" style={{ marginTop: "1.2rem" }}>Vidéo</div>
          <input
            className="fm-input"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Lien YouTube ou Vimeo (https://...)"
          />
          {embed && (
            <div className="fm-video">
              <iframe src={embed} title="Vidéo de la leçon" allowFullScreen />
            </div>
          )}
          {videoUrl.trim() && !embed && (
            <a className="fm-link" href={videoUrl} target="_blank" rel="noreferrer">
              Ouvrir la vidéo ↗
            </a>
          )}

          <div className="fm-label" style={{ marginTop: "1.2rem" }}>Ressources</div>
          {resources.map((r, i) => (
            <div key={i} className="fm-res">
              <input
                className="fm-input"
                value={r.label}
                onChange={(e) => updateResource(i, "label", e.target.value)}
                placeholder="Nom (ex : Modèle Canva)"
              />
              <input
                className="fm-input"
                value={r.url}
                onChange={(e) => updateResource(i, "url", e.target.value)}
                placeholder="https://..."
              />
              <button className="fm-del" onClick={() => setResources((l) => l.filter((_, idx) => idx !== i))}>
                ✕
              </button>
            </div>
          ))}
          <button className="fm-chip" onClick={() => setResources((l) => [...l, { label: "", url: "" }])}>
            + Ajouter une ressource
          </button>

          {err && <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{err}</div>}
          {msg && <div className="fm-ok">{msg}</div>}

          <div className="fm-actions">
            <button className="btn-primary fm-btn" onClick={save} disabled={saving || generating}>
              {saving ? "Enregistrement..." : "💾 Enregistrer"}
            </button>
            <button className="fm-btn fm-btn-outline" onClick={() => window.print()} disabled={!content.trim()}>
              📄 Télécharger en PDF
            </button>
          </div>
        </div>
      </div>

      {/* Feuille imprimée (invisible à l'écran) */}
      <div className="fm-sheet">
        <div className="fm-sheet-kicker">{formation.title}</div>
        <h1 className="fm-sheet-title">{module.title}</h1>
        <div
          className="fm-lesson"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content || "") }}
        />
        {cleanResources.length > 0 && (
          <>
            <h2 className="fm-sheet-h2">Ressources</h2>
            <ul>
              {cleanResources.map((r, i) => (
                <li key={i}>
                  {r.label} : {r.url}
                </li>
              ))}
            </ul>
          </>
        )}
        {videoUrl.trim() && <p className="fm-sheet-video">Vidéo : {videoUrl}</p>}
      </div>
    </>
  );
}

/* ---------- Page principale ---------- */
export default function Formations() {
  const [formations, setFormations] = useState([]);
  const [current, setCurrent] = useState(null);
  const [activeId, setActiveId] = useState(null);
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
      setActiveId(null);
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
      setActiveId(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeFormation(id) {
    if (!window.confirm("Supprimer cette formation ?")) return;
    try {
      await api(`/formations/${id}`, { method: "DELETE" });
      if (current?.id === id) {
        setCurrent(null);
        setActiveId(null);
      }
      loadList();
    } catch (err) {
      setError(err.message);
    }
  }

  function patchModule(patch) {
    setCurrent((f) => ({
      ...f,
      modules: f.modules.map((m) => (m.id === patch.id ? { ...m, ...patch } : m)),
    }));
  }

  const activeModule = current?.modules?.find((m) => m.id === activeId);

  return (
    <DashboardLayout>
      <div className="fm-page">
        <div className="fm-screen no-print">
          <h1 className="text-2xl font-bold">Formations</h1>
          <p className="fm-muted">
            Saisissez un sujet : l'IA construit le plan complet de votre formation.
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</div>
          )}

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

          {current && (
            <div className="fm-card">
              <div className="fm-label">Plan de la formation</div>
              <h2 className="fm-title">{current.title}</h2>
              {current.description && <p className="fm-muted">{current.description}</p>}

              <ol className="fm-modules">
                {(current.modules || []).map((m, i) => (
                  <li key={m.id || i}>
                    <button
                      className={`fm-module fm-module-btn${m.id === activeId ? " active" : ""}`}
                      onClick={() => setActiveId(m.id === activeId ? null : m.id)}
                    >
                      <span className="fm-num">{i + 1}</span>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div className="fm-module-title">{m.title}</div>
                        {m.summary && <div className="fm-muted fm-small">{m.summary}</div>}
                      </div>
                      <span className="fm-state">{m.content ? "✓ Rédigée" : "À rédiger"}</span>
                    </button>
                  </li>
                ))}
              </ol>

              <button className="fm-btn fm-btn-disabled" disabled>
                ✨ Générer toute la formation (étape suivante)
              </button>
            </div>
          )}
        </div>

        {current && activeModule && (
          <LessonEditor
            key={activeModule.id}
            formation={current}
            module={activeModule}
            onChange={patchModule}
          />
        )}

        <div className="fm-screen no-print">
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
        .fm-textarea { min-height: 20rem; line-height: 1.6; font-size: 0.92rem; resize: vertical; }
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
        .fm-btn-gold { background: #D4AF37; color: #0B0B0B; margin-bottom: 1rem; }
        .fm-btn-outline { border: 1px solid rgba(128,128,128,0.45); background: transparent; color: inherit; }
        .fm-actions { display: grid; gap: 0.6rem; margin-top: 1.2rem; }
        .fm-ok { margin-top: 0.8rem; color: #16a34a; font-size: 0.9rem; font-weight: 600; }
        .fm-title { font-size: 1.3rem; font-weight: 700; }
        .fm-modules { list-style: none; padding: 0; margin: 1.2rem 0 0; display: grid; gap: 0.5rem; }
        .fm-module { display: flex; gap: 0.9rem; align-items: flex-start; }
        .fm-module-btn {
          width: 100%; padding: 0.7rem; border-radius: 12px; border: 1px solid transparent;
          background: transparent; color: inherit; align-items: center;
        }
        .fm-module-btn.active { border-color: #D4AF37; background: rgba(212,175,55,0.08); }
        .fm-state { flex: none; font-size: 0.7rem; opacity: 0.75; }
        .fm-num {
          flex: none; width: 2rem; height: 2rem; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; background: #D4AF37; color: #0B0B0B;
        }
        .fm-module-title { font-weight: 600; }
        .fm-tabs { display: flex; gap: 0.5rem; margin-bottom: 0.7rem; }
        .fm-tab {
          padding: 0.4rem 0.9rem; border-radius: 999px; font-size: 0.85rem;
          border: 1px solid rgba(128,128,128,0.35); background: transparent; color: inherit;
        }
        .fm-tab.on { background: #D4AF37; color: #0B0B0B; border-color: #D4AF37; }
        .fm-lesson h2 { font-size: 1.3rem; font-weight: 700; margin: 1.2rem 0 0.6rem; }
        .fm-lesson h3 { font-size: 1.05rem; font-weight: 700; margin: 1.1rem 0 0.4rem; }
        .fm-lesson p { line-height: 1.75; margin: 0.7rem 0; }
        .fm-lesson ul { padding-left: 1.3rem; margin: 0.6rem 0; }
        .fm-lesson li { margin: 0.3rem 0; line-height: 1.6; }
        .fm-video { position: relative; padding-top: 56.25%; margin-top: 0.8rem; }
        .fm-video iframe {
          position: absolute; inset: 0; width: 100%; height: 100%;
          border: 0; border-radius: 10px;
        }
        .fm-link { display: inline-block; margin-top: 0.6rem; color: #D4AF37; }
        .fm-res { display: grid; gap: 0.4rem; margin-bottom: 0.8rem; position: relative; padding-right: 2rem; }
        .fm-res .fm-del { position: absolute; right: 0; top: 0.3rem; padding: 0.4rem; }
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

        /* Feuille PDF : invisible à l'écran */
        .fm-sheet { display: none; }

               @media print {
          @page { size: A4; margin: 15mm; }
          html, body { background: #fff !important; }
          .no-print, .fm-screen, header, aside { display: none !important; }
          .fm-page { max-width: none; }
          .fm-sheet {
            display: block; color: #111; background: #fff; font-family: 'Inter', sans-serif;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          .fm-sheet a { color: #9a7a14; text-decoration: underline; }
          .fm-sheet-kicker {
            font-size: 0.8rem; letter-spacing: 0.12em; text-transform: uppercase;
            color: #b8931f; font-weight: 700; margin-bottom: 0.4rem;
          }
          .fm-sheet-title { font-size: 1.8rem; font-weight: 700; margin: 0 0 1rem; color: #0B0B0B; }
          .fm-sheet-h2 { font-size: 1.2rem; font-weight: 700; margin: 1.5rem 0 0.6rem; color: #0B0B0B; }
          .fm-sheet .fm-lesson p { font-size: 0.95rem; line-height: 1.7; text-align: justify; color: #222; }
          .fm-sheet .fm-lesson h3 { break-after: avoid; color: #0B0B0B; }

          .fm-sheet-videobox { break-inside: avoid; margin-top: 1.5rem; }
          .fm-sheet-thumb {
            position: relative; display: block; width: 100%; max-width: 110mm;
            border-radius: 6px; overflow: hidden; text-decoration: none !important;
          }
          .fm-sheet-thumb img { display: block; width: 100%; height: auto; }
          .fm-play {
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 16mm; height: 16mm; border-radius: 50%;
            background: rgba(11,11,11,0.75); color: #D4AF37;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.4rem; padding-left: 1mm;
          }
          .fm-sheet-btn {
            display: inline-block; margin-top: 0.8rem; padding: 0.6rem 1.1rem;
            border-radius: 6px; background: #D4AF37; color: #0B0B0B !important;
            font-weight: 700; text-decoration: none !important;
          }
          .fm-sheet-res { break-inside: avoid; }
          .fm-sheet-res ul { padding-left: 1.3rem; }
          .fm-sheet-res li { margin: 0.3rem 0; }
        }
      `}</style>
    </DashboardLayout>
  );
}
