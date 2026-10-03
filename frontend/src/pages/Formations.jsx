import { useEffect, useRef, useState } from "react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import PublishPanel from "../components/PublishPanel.jsx";
import { renderMarkdown } from "../utils/markdown.js";
import { LANGUAGES } from "../utils/templates.js";

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

const EXAMPLES = {
  fr: ["Créer une boutique Shopify rentable", "Lancer sa chaîne YouTube", "Maîtriser le marketing sur TikTok"],
  en: ["Build a profitable Shopify store", "Launch your YouTube channel", "Master TikTok marketing"],
  es: ["Crear una tienda Shopify rentable", "Lanzar tu canal de YouTube", "Dominar el marketing en TikTok"],
  pt: ["Criar uma loja Shopify rentável", "Lançar o seu canal no YouTube", "Dominar o marketing no TikTok"],
  de: ["Einen profitablen Shopify-Shop aufbauen", "Den eigenen YouTube-Kanal starten", "TikTok-Marketing meistern"],
  it: ["Creare un negozio Shopify redditizio", "Lanciare il proprio canale YouTube", "Padroneggiare il marketing su TikTok"],
  ar: ["إنشاء متجر شوبيفاي مربح", "إطلاق قناتك على يوتيوب", "إتقان التسويق على تيك توك"],
};

function youtubeId(url) {
  const m = (url || "").match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/
  );
  return m ? m[1] : null;
}

function embedUrl(url) {
  if (!url) return null;
  const yt = youtubeId(url);
  if (yt) return `https://www.youtube.com/embed/${yt}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

function compressImage(file, maxW = 1000, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire l'image."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image illisible."));
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---------- Éditeur d'une leçon ---------- */
function LessonEditor({ formation, module, onChange }) {
  const [content, setContent] = useState(module.content || "");
  const [videoUrl, setVideoUrl] = useState(module.video_url || "");
  const [resources, setResources] = useState(module.resources || []);
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState("edit");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const cleanVideo = videoUrl.trim();
  const embed = embedUrl(cleanVideo);
  const ytId = youtubeId(cleanVideo);
  const rtl = formation.language === "ar";

  const cleanResources = resources.reduce((acc, r) => {
    const url = (r.url || "").trim();
    const label = (r.label || "").trim();
    if (r.type === "image") {
      if (url) acc.push({ type: "image", label: label || "Image", url });
    } else if (r.type === "video") {
      if (url) acc.push({ type: "video", label: label || "Vidéo", url });
    } else if (label && url) {
      acc.push({ type: "link", label, url });
    }
    return acc;
  }, []);

  async function save() {
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const data = await api(`/formations/${formation.id}/modules/${module.id}`, {
        method: "PUT",
        body: JSON.stringify({ content, video_url: cleanVideo, resources: cleanResources }),
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

  function addVideo() {
    setResources((l) => [...l, { type: "video", label: "", url: "" }]);
    setAdding(false);
  }

  async function onImageFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    setMsg("");
    if (!file.type.startsWith("image/")) {
      setErr("Choisissez une image (JPG, PNG ou WebP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErr("Image trop lourde (10 Mo maximum).");
      return;
    }
    try {
      let data = await compressImage(file, 1000, 0.8);
      if (data.length > 380000) data = await compressImage(file, 800, 0.65);
      if (data.length > 380000) data = await compressImage(file, 600, 0.55);
      if (data.length > 400000) {
        setErr("Image trop lourde, choisissez-en une plus légère.");
        return;
      }
      setResources((l) => [...l, { type: "image", label: "", url: data }]);
      setAdding(false);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  function removeResource(i) {
    setResources((l) => l.filter((_, idx) => idx !== i));
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
              dir={rtl ? "rtl" : "ltr"}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Texte de la leçon (Markdown : ### Titre, - puce)..."
            />
          ) : (
            <div
              className="fm-lesson"
              dir={rtl ? "rtl" : "ltr"}
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
          {cleanVideo && !embed && (
            <a className="fm-link" href={cleanVideo} target="_blank" rel="noreferrer">
              Ouvrir la vidéo ↗
            </a>
          )}

          <div className="fm-label" style={{ marginTop: "1.2rem" }}>Ressources</div>
          {resources.map((r, i) => {
            if (r.type === "image") {
              return (
                <div key={i} className="fm-res fm-res-image">
                  <img src={r.url} alt={r.label || "Image"} className="fm-res-thumb" />
                  <input
                    className="fm-input"
                    value={r.label || ""}
                    onChange={(e) => updateResource(i, "label", e.target.value)}
                    placeholder="Légende de l'image (facultatif)"
                    maxLength={100}
                  />
                  <button className="fm-del" onClick={() => removeResource(i)}>✕</button>
                </div>
              );
            }
            if (r.type === "video") {
              const emb = embedUrl((r.url || "").trim());
              return (
                <div key={i} className="fm-res">
                  <input
                    className="fm-input"
                    value={r.url || ""}
                    onChange={(e) => updateResource(i, "url", e.target.value)}
                    placeholder="Lien de la vidéo YouTube ou Vimeo (https://...)"
                  />
                  <input
                    className="fm-input"
                    value={r.label || ""}
                    onChange={(e) => updateResource(i, "label", e.target.value)}
                    placeholder="Titre de la vidéo (facultatif)"
                    maxLength={100}
                  />
                  {emb && (
                    <div className="fm-video" style={{ marginTop: 0 }}>
                      <iframe src={emb} title="Vidéo" allowFullScreen />
                    </div>
                  )}
                  <button className="fm-del" onClick={() => removeResource(i)}>✕</button>
                </div>
              );
            }
            return (
              <div key={i} className="fm-res">
                <input
                  className="fm-input"
                  value={r.label || ""}
                  onChange={(e) => updateResource(i, "label", e.target.value)}
                  placeholder="Nom (ex : Modèle Canva)"
                />
                <input
                  className="fm-input"
                  value={r.url || ""}
                  onChange={(e) => updateResource(i, "url", e.target.value)}
                  placeholder="https://..."
                />
                <button className="fm-del" onClick={() => removeResource(i)}>✕</button>
              </div>
            );
          })}

          {adding ? (
            <div className="fm-addbox">
              <div className="fm-muted fm-small">Que voulez-vous ajouter ?</div>
              <div className="fm-addrow">
                <label className="fm-chip" style={{ cursor: "pointer" }}>
                  🖼️ Ajouter une image
                  <input type="file" accept="image/*" hidden onChange={onImageFile} />
                </label>
                <button type="button" className="fm-chip" onClick={addVideo}>
                  🎬 Ajouter un lien vidéo (YouTube ou Vimeo)
                </button>
                <button type="button" className="fm-chip" onClick={() => setAdding(false)}>
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button className="fm-chip" onClick={() => setAdding(true)}>
              + Ajouter une ressource
            </button>
          )}

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
      <div className="fm-sheet" dir={rtl ? "rtl" : "ltr"}>
        <div className="fm-sheet-kicker">{formation.title}</div>
        <h1 className="fm-sheet-title">{module.title}</h1>

        <div
          className="fm-lesson"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content || "") }}
        />

        {cleanVideo && (
          <div className="fm-sheet-videobox">
            <h2 className="fm-sheet-h2">Vidéo de la leçon</h2>
            {ytId && (
              <a className="fm-sheet-thumb" href={cleanVideo} target="_blank" rel="noreferrer">
                <img
                  src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                  alt="Miniature de la vidéo"
                  loading="eager"
                />
                <span className="fm-play">▶</span>
              </a>
            )}
            <a className="fm-sheet-btn" href={cleanVideo} target="_blank" rel="noreferrer">
              ▶ Regarder la vidéo de la leçon
            </a>
          </div>
        )}

        {cleanResources.length > 0 && (
          <div className="fm-sheet-res">
            <h2 className="fm-sheet-h2">Ressources</h2>
            {cleanResources
              .filter((r) => r.type === "image")
              .map((r, i) => (
                <figure key={`i${i}`} className="fm-sheet-img">
                  <img src={r.url} alt={r.label} />
                  {r.label && r.label !== "Image" && <figcaption>{r.label}</figcaption>}
                </figure>
              ))}
            <ul>
              {cleanResources
                .filter((r) => r.type !== "image")
                .map((r, i) => (
                  <li key={i}>
                    <a href={r.url} target="_blank" rel="noreferrer">
                      {r.type === "video" ? `▶ ${r.label}` : r.label}
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        )}
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
  const [language, setLanguage] = useState("fr");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [gen, setGen] = useState({
    running: false,
    done: 0,
    total: 0,
    currentTitle: "",
    failed: [],
    cancelled: false,
    finished: false,
  });
  const cancelRef = useRef(false);

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

  function resetGen() {
    setGen({
      running: false,
      done: 0,
      total: 0,
      currentTitle: "",
      failed: [],
      cancelled: false,
      finished: false,
    });
  }

  async function createFormation(e) {
    e?.preventDefault();
    if (topic.trim().length < 5 || creating || gen.running) return;
    setCreating(true);
    setError("");
    try {
      const data = await api("/formations", {
        method: "POST",
        body: JSON.stringify({ topic: topic.trim(), language }),
      });
      setCurrent(data.formation);
      setActiveId(null);
      setTopic("");
      resetGen();
      loadList();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function openFormation(id) {
    if (gen.running) return;
    setError("");
    try {
      const data = await api(`/formations/${id}`);
      setCurrent(data.formation);
      setActiveId(null);
      resetGen();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeFormation(id) {
    if (gen.running) return;
    if (!window.confirm("Supprimer cette formation ?")) return;
    try {
      await api(`/formations/${id}`, { method: "DELETE" });
      if (current?.id === id) {
        setCurrent(null);
        setActiveId(null);
        resetGen();
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

  function patchFormation(patch) {
    setCurrent((f) => ({ ...f, ...patch }));
    loadList();
  }

  /* ----- Génération de toute la formation ----- */
  async function generateAll() {
    if (!current || gen.running) return;

    let targets = current.modules.filter((m) => !(m.content || "").trim());
    if (targets.length === 0) {
      if (!window.confirm("Toutes les leçons sont déjà rédigées. Tout régénérer ?")) return;
      targets = current.modules;
    }

    const formationId = current.id;
    cancelRef.current = false;
    setActiveId(null);
    setError("");
    setGen({
      running: true,
      done: 0,
      total: targets.length,
      currentTitle: targets[0].title,
      failed: [],
      cancelled: false,
      finished: false,
    });

    const failed = [];
    let doneCount = 0;

    for (let i = 0; i < targets.length; i++) {
      if (cancelRef.current) break;
      const m = targets[i];
      setGen((g) => ({ ...g, currentTitle: m.title, done: doneCount }));

      let ok = false;
      for (let attempt = 0; attempt < 2 && !ok; attempt++) {
        if (cancelRef.current) break;
        try {
          const data = await api(`/formations/${formationId}/modules/${m.id}/generate`, {
            method: "POST",
          });
          patchModule({ id: m.id, content: data.module.content });
          ok = true;
        } catch (e) {
          /* on réessaie une fois */
        }
      }

      if (ok) doneCount += 1;
      else if (!cancelRef.current) failed.push(m.title);
    }

    setGen({
      running: false,
      done: doneCount,
      total: targets.length,
      currentTitle: "",
      failed,
      cancelled: cancelRef.current,
      finished: true,
    });
    loadList();
  }

  function stopGeneration() {
    cancelRef.current = true;
  }

  const activeModule = current?.modules?.find((m) => m.id === activeId);
  const emptyCount = current
    ? current.modules.filter((m) => !(m.content || "").trim()).length
    : 0;
  const percent = gen.total ? Math.round((gen.done / gen.total) * 100) : 0;
  const examples = EXAMPLES[language] || EXAMPLES.fr;

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
              dir={language === "ar" ? "rtl" : "ltr"}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
  placeholder={`Ex : ${examples[0]}`}
              maxLength={150}
              disabled={creating || gen.running}
            />
            <div className="fm-chips">
              {examples.map((ex) => (
                <button type="button" key={ex} className="fm-chip" onClick={() => setTopic(ex)}>
                  {ex}
                </button>
              ))}
            </div>

            <div className="fm-label" style={{ marginTop: "0.4rem" }}>Langue de la formation</div>
            <select
              className="fm-input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={creating || gen.running}
              style={{ marginBottom: language === "ar" ? "0.4rem" : "1rem" }}
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
            {language === "ar" && (
              <p className="fm-muted fm-small" style={{ marginBottom: "1rem" }}>
                La qualité est un peu moins régulière en arabe : relisez bien les leçons avant de vendre.
              </p>
            )}

            <button
              type="submit"
              className="btn-primary fm-btn"
              disabled={creating || gen.running || topic.trim().length < 5}
            >
              {creating ? "Génération du plan..." : "✨ Générer le plan"}
            </button>
          </form>

          {current && (
            <div className="fm-card">
              <div className="fm-label">Plan de la formation</div>
              <h2 className="fm-title" dir={current.language === "ar" ? "rtl" : "ltr"}>
                {current.title}
              </h2>
              {current.description && (
                <p className="fm-muted" dir={current.language === "ar" ? "rtl" : "ltr"}>
                  {current.description}
                </p>
              )}

              <ol className="fm-modules">
                {(current.modules || []).map((m, i) => {
                  const isCurrent = gen.running && gen.currentTitle === m.title;
                  return (
                    <li key={m.id || i}>
                      <button
                        className={`fm-module fm-module-btn${m.id === activeId ? " active" : ""}`}
                        onClick={() => setActiveId(m.id === activeId ? null : m.id)}
                        disabled={gen.running}
                      >
                        <span className="fm-num">{i + 1}</span>
                        <div style={{ flex: 1, textAlign: "left" }}>
                          <div className="fm-module-title">{m.title}</div>
                          {m.summary && <div className="fm-muted fm-small">{m.summary}</div>}
                        </div>
                        <span className="fm-state">
                          {isCurrent ? "⏳ En cours..." : m.content ? "✓ Rédigée" : "À rédiger"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>

              {gen.running ? (
                <div className="fm-progress-box">
                  <div className="fm-progress-top">
                    <span>
                      Leçon {Math.min(gen.done + 1, gen.total)} sur {gen.total}
                    </span>
                    <span>{percent}%</span>
                  </div>
                  <div className="fm-progress">
                    <div className="fm-progress-bar" style={{ width: `${Math.max(percent, 4)}%` }} />
                  </div>
                  <div className="fm-muted fm-small">
                    Rédaction : {gen.currentTitle}. Gardez cette page ouverte.
                  </div>
                  <button className="fm-btn fm-btn-outline" style={{ marginTop: "0.8rem" }} onClick={stopGeneration}>
                    ⏹ Arrêter
                  </button>
                </div>
              ) : (
                <>
                  <button className="fm-btn fm-btn-gold" style={{ marginTop: "1.2rem", marginBottom: 0 }} onClick={generateAll}>
                    {emptyCount > 0
                      ? `✨ Générer toute la formation (${emptyCount} ${emptyCount > 1 ? "leçons" : "leçon"})`
                      : "🔁 Tout régénérer"}
                  </button>

                  {gen.finished && (
                    <div className={gen.failed.length ? "fm-warn" : "fm-ok"}>
                      {gen.cancelled
                        ? `Génération arrêtée : ${gen.done} leçon(s) rédigée(s).`
                        : gen.failed.length === 0
                        ? `✓ ${gen.done} leçon(s) rédigée(s). Ouvrez un module pour l'éditer, ajouter une vidéo ou télécharger le PDF.`
                        : `${gen.done} leçon(s) rédigée(s). Échec pour : ${gen.failed.join(", ")}. Relancez le bouton pour compléter.`}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {current && activeModule && !gen.running && (
          <LessonEditor
            key={activeModule.id}
            formation={current}
            module={activeModule}
            onChange={patchModule}
          />
        )}

        {current && !gen.running && (
          <PublishPanel key={current.id} formation={current} onChange={patchFormation} />
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
                      {f.modules_count ?? 0} modules
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
        select.fm-input option { color: #111; }
        .fm-textarea { min-height: 20rem; line-height: 1.6; font-size: 0.92rem; resize: vertical; }
        .fm-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.8rem 0 1rem; }
        .fm-chip {
          font-size: 0.8rem; padding: 0.35rem 0.7rem; border-radius: 999px;
          border: 1px solid rgba(128,128,128,0.35); background: transparent; color: inherit;
        }
        .fm-btn { width: 100%; padding: 0.85rem; border-radius: 10px; font-weight: 600; }
        .fm-btn:disabled { opacity: 0.5; }
        .fm-btn-gold { background: #D4AF37; color: #0B0B0B; margin-bottom: 1rem; }
        .fm-btn-outline { border: 1px solid rgba(128,128,128,0.45); background: transparent; color: inherit; }
        .fm-actions { display: grid; gap: 0.6rem; margin-top: 1.2rem; }
        .fm-ok { margin-top: 0.8rem; color: #16a34a; font-size: 0.9rem; font-weight: 600; }
        .fm-warn { margin-top: 0.8rem; color: #d97706; font-size: 0.9rem; font-weight: 600; }
        .fm-title { font-size: 1.3rem; font-weight: 700; }
        .fm-modules { list-style: none; padding: 0; margin: 1.2rem 0 0; display: grid; gap: 0.5rem; }
        .fm-module { display: flex; gap: 0.9rem; align-items: flex-start; }
        .fm-module-btn {
          width: 100%; padding: 0.7rem; border-radius: 12px; border: 1px solid transparent;
          background: transparent; color: inherit; align-items: center;
        }
        .fm-module-btn:disabled { opacity: 0.85; }
        .fm-module-btn.active { border-color: #D4AF37; background: rgba(212,175,55,0.08); }
        .fm-state { flex: none; font-size: 0.7rem; opacity: 0.75; }
        .fm-num {
          flex: none; width: 2rem; height: 2rem; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; background: #D4AF37; color: #0B0B0B;
        }
        .fm-module-title { font-weight: 600; }

        .fm-progress-box { margin-top: 1.2rem; }
        .fm-progress-top {
          display: flex; justify-content: space-between;
          font-size: 0.85rem; font-weight: 600; margin-bottom: 0.4rem;
        }
        .fm-progress {
          height: 10px; border-radius: 999px; overflow: hidden;
          background: rgba(128,128,128,0.25);
        }
        .fm-progress-bar {
          height: 100%; border-radius: 999px; background: #D4AF37;
          transition: width 0.6s ease;
        }

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
        .fm-res-image { grid-template-columns: 1fr; }
        .fm-res-thumb { width: 100%; max-width: 14rem; border-radius: 8px; border: 1px solid rgba(128,128,128,0.3); }
        .fm-addbox {
          padding: 0.8rem; border-radius: 12px;
          border: 1px dashed rgba(212,175,55,0.6); background: rgba(212,175,55,0.06);
        }
        .fm-addrow { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
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
          .fm-sheet[dir="rtl"] { font-family: 'Noto Naskh Arabic', 'Inter', serif; }
          .fm-sheet[dir="rtl"] .fm-lesson p { text-align: right; }
          .fm-sheet[dir="rtl"] .fm-lesson ul { padding-left: 0; padding-right: 1.3rem; }
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
          .fm-sheet-img { margin: 0 0 5mm; break-inside: avoid; }
          .fm-sheet-img img { display: block; max-width: 100%; max-height: 110mm; object-fit: contain; border-radius: 4px; }
          .fm-sheet-img figcaption { font-size: 0.8rem; color: #666; margin-top: 1.5mm; }
        }
      `}</style>
    </DashboardLayout>
  );
              }
