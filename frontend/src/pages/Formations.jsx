import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

/* Paramètres de création (envoyés au serveur, qui les valide) */
const OPT_NONE = ["", "Non précisé"];
const LEVEL_OPTIONS = [OPT_NONE, ["debutant", "Débutant"], ["intermediaire", "Intermédiaire"], ["avance", "Avancé"]];
const TYPE_OPTIONS = [
  OPT_NONE, ["pratique", "Pratique"], ["theorique", "Théorique"], ["professionnelle", "Professionnelle"],
  ["tutoriel", "Tutoriel pas à pas"], ["business", "Business"], ["technique", "Technique"], ["autre", "Autre"],
];
const TONE_OPTIONS = [
  OPT_NONE, ["professionnel", "Professionnel"], ["academique", "Académique"], ["accessible", "Accessible"],
  ["inspirant", "Inspirant"], ["specialise", "Spécialisé"],
];
const DETAIL_OPTIONS = [OPT_NONE, ["concis", "Concis"], ["standard", "Standard"], ["approfondi", "Approfondi"]];
const STYLE_OPTIONS = [
  OPT_NONE, ["conversationnel", "Conversationnel"], ["didactique", "Didactique et structuré"],
  ["narratif", "Narratif (histoires)"], ["actionnable", "Direct et actionnable"],
];
const MODULE_COUNT_OPTIONS = [
  ["auto", "Automatique"],
  ...Array.from({ length: 10 }, (_, i) => [String(i + 3), `${i + 3} modules`]),
];
const EMPTY_BRIEF = {
  audience: "", level: "", modules_count: "auto", objectives: "", prerequisites: "",
  duration: "", type: "", tone: "", detail: "", style: "",
};
const MAX_PLAN_MODULES = 20;

const labelOf = (options, value) => (options.find((o) => o[0] === value) || [])[1] || "";

function briefSummary(b) {
  if (!b) return "";
  const parts = [];
  if (b.audience) parts.push(`Public : ${b.audience}`);
  if (b.level) parts.push(`Niveau : ${labelOf(LEVEL_OPTIONS, b.level)}`);
  if (b.duration) parts.push(`Durée : ${b.duration}`);
  if (b.type) parts.push(`Type : ${labelOf(TYPE_OPTIONS, b.type)}`);
  if (b.tone) parts.push(`Ton : ${labelOf(TONE_OPTIONS, b.tone)}`);
  return parts.join(" · ");
}

function SelectField({ label, value, onChange, options, disabled }) {
  return (
    <label className="fm-field">
      <span className="fm-flabel">{label}</span>
      <select className="fm-input" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

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

/* Paliers de compression : on garde la meilleure qualité qui tient dans la limite du serveur (400 Ko) */
const IMAGE_STEPS = [
  [1600, 0.85],
  [1280, 0.78],
  [1000, 0.7],
  [800, 0.62],
  [600, 0.55],
];
const IMAGE_MAX_CHARS = 380000;

async function prepareImage(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choisissez une image (JPG, PNG ou WebP).");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Image trop lourde (10 Mo maximum).");
  }
  for (const [w, q] of IMAGE_STEPS) {
    const data = await compressImage(file, w, q);
    if (data.length <= IMAGE_MAX_CHARS) return data;
  }
  throw new Error("Image trop lourde, choisissez-en une plus légère.");
}

/* ---------- Image d'une ressource : pleine largeur, ratio conservé, clic = agrandir ---------- */
function ResImage({ src, alt, onOpen }) {
  const [state, setState] = useState("loading");
  useEffect(() => {
    setState("loading");
  }, [src]);

  return (
    <button type="button" className="fm-img-open" onClick={onOpen} aria-label="Agrandir l'image">
      {state === "loading" && <span className="fm-img-state">Chargement de l'image…</span>}
      {state === "error" ? (
        <span className="fm-img-state fm-img-err">Image illisible. Remplacez-la ou supprimez-la.</span>
      ) : (
        <img
          src={src}
          alt={alt}
          className="fm-res-img"
          style={{ opacity: state === "ok" ? 1 : 0 }}
          onLoad={() => setState("ok")}
          onError={() => setState("error")}
        />
      )}
      {state === "ok" && <span className="fm-img-zoom">🔍 Agrandir</span>}
    </button>
  );
}

/* ---------- Visionneuse plein écran : zoom, déplacement, légende, texte alternatif ---------- */
function ImageViewer({ resource, onClose, onField, onRemove, onReplaceFile }) {
  const [view, setView] = useState({ z: 1, x: 0, y: 0 });
  const drag = useRef(null);

  function zoomBy(d) {
    setView((v) => {
      const z = Math.min(4, Math.max(1, +(v.z + d).toFixed(2)));
      return z === 1 ? { z: 1, x: 0, y: 0 } : { ...v, z };
    });
  }
  function reset() {
    setView({ z: 1, x: 0, y: 0 });
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (/INPUT|TEXTAREA/.test(e.target?.tagName || "")) return;
      if (e.key === "+" || e.key === "=") zoomBy(0.5);
      else if (e.key === "-") zoomBy(-0.5);
      else if (e.key === "0") reset();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPointerDown(e) {
    if (view.z <= 1) return;
    drag.current = { id: e.pointerId, x: e.clientX - view.x, y: e.clientY - view.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    setView((v) => ({ ...v, x: e.clientX - d.x, y: e.clientY - d.y }));
  }
  function onPointerUp(e) {
    if (drag.current && drag.current.id === e.pointerId) drag.current = null;
  }

  return createPortal(
    <div className="fm-viewer" role="dialog" aria-modal="true" aria-label="Visionneuse d'image">
      <div className="fm-vw-bar">
        <button type="button" className="fm-vw-btn" onClick={() => zoomBy(-0.5)} aria-label="Dézoomer">−</button>
        <span className="fm-vw-zoom">{Math.round(view.z * 100)}%</span>
        <button type="button" className="fm-vw-btn" onClick={() => zoomBy(0.5)} aria-label="Zoomer">+</button>
        <button type="button" className="fm-vw-btn" onClick={reset} aria-label="Taille normale">1:1</button>
        <button type="button" className="fm-vw-btn fm-vw-close" onClick={onClose} autoFocus aria-label="Fermer">
          ✕ Fermer
        </button>
      </div>

      <div
        className="fm-vw-stage"
        style={{ cursor: view.z > 1 ? "grab" : "zoom-in" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        onDoubleClick={() => setView((v) => (v.z > 1 ? { z: 1, x: 0, y: 0 } : { z: 2.5, x: 0, y: 0 }))}
        onWheel={(e) => zoomBy(e.deltaY < 0 ? 0.25 : -0.25)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          className="fm-vw-img"
          src={resource.url}
          alt={resource.alt || resource.label || "Image"}
          draggable={false}
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`,
            transition: drag.current ? "none" : "transform 0.15s ease",
          }}
        />
      </div>

      <div className="fm-vw-panel">
        <input
          className="fm-vw-input"
          value={resource.label || ""}
          onChange={(e) => onField("label", e.target.value)}
          placeholder="Légende (affichée sous l'image)"
          maxLength={100}
        />
        <input
          className="fm-vw-input"
          value={resource.alt || ""}
          onChange={(e) => onField("alt", e.target.value)}
          placeholder="Texte alternatif (décrit l'image pour l'accessibilité)"
          maxLength={200}
        />
        <div className="fm-vw-actions">
          <label className="fm-vw-btn fm-vw-act" style={{ cursor: "pointer" }}>
            🔄 Remplacer
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onReplaceFile(f);
              }}
            />
          </label>
          <button type="button" className="fm-vw-btn fm-vw-act fm-vw-danger" onClick={onRemove}>
            🗑 Supprimer
          </button>
        </div>
        <div className="fm-vw-hint">
          Double-clic ou double-tap pour zoomer. Glissez pour déplacer l'image agrandie. Les changements sont
          enregistrés avec le bouton « Enregistrer » de la leçon.
        </div>
      </div>
    </div>,
    document.body
  );
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
  const [viewIndex, setViewIndex] = useState(null);

  const cleanVideo = videoUrl.trim();
  const embed = embedUrl(cleanVideo);
  const ytId = youtubeId(cleanVideo);
  const rtl = formation.language === "ar";

  const cleanResources = resources.reduce((acc, r) => {
    const url = (r.url || "").trim();
    const label = (r.label || "").trim();
    if (r.type === "image") {
      if (url) {
        acc.push({
          type: "image",
          label: label || "Image",
          alt: (r.alt || "").trim().slice(0, 200),
          url,
        });
      }
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
    try {
      const data = await prepareImage(file);
      setResources((l) => [...l, { type: "image", label: "", alt: "", url: data }]);
      setAdding(false);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  async function replaceImage(i, file) {
    setErr("");
    setMsg("");
    try {
      const data = await prepareImage(file);
      setResources((l) => l.map((r, idx) => (idx === i ? { ...r, url: data } : r)));
    } catch (e2) {
      setErr(e2.message);
    }
  }

  function removeResource(i) {
    const r = resources[i];
    if (r?.type === "image" && !window.confirm("Supprimer cette image ?")) return;
    setResources((l) => l.filter((_, idx) => idx !== i));
    setViewIndex(null);
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
                  <ResImage src={r.url} alt={r.alt || r.label || "Image"} onOpen={() => setViewIndex(i)} />
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

      {viewIndex !== null && resources[viewIndex]?.type === "image" && (
        <ImageViewer
          resource={resources[viewIndex]}
          onClose={() => setViewIndex(null)}
          onField={(field, value) => updateResource(viewIndex, field, value)}
          onRemove={() => removeResource(viewIndex)}
          onReplaceFile={(f) => replaceImage(viewIndex, f)}
        />
      )}

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
                  <img src={r.url} alt={r.alt || r.label} />
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
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [showArchived, setShowArchived] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [brief, setBrief] = useState(EMPTY_BRIEF);
  const [planEdit, setPlanEdit] = useState(false);
  const [draft, setDraft] = useState([]);
  const [planDirty, setPlanDirty] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [planErr, setPlanErr] = useState("");
  const [planMsg, setPlanMsg] = useState("");
  const draftKey = useRef(0);
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
    if (planEdit && planDirty && !window.confirm("Abandonner les modifications non enregistrées du plan ?")) return;
    setCreating(true);
    setError("");
    try {
      const data = await api("/formations", {
        method: "POST",
        body: JSON.stringify({ topic: topic.trim(), language, ...brief }),
      });
      setCurrent(data.formation);
      setActiveId(null);
      setPlanEdit(false);
      setPlanDirty(false);
      setPlanMsg("");
      setTopic("");
      setBrief(EMPTY_BRIEF);
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
    if (planEdit && planDirty && !window.confirm("Abandonner les modifications non enregistrées du plan ?")) return;
    setError("");
    setNotice("");
    try {
      const data = await api(`/formations/${id}`);
      setCurrent(data.formation);
      setActiveId(null);
      setPlanEdit(false);
      setPlanDirty(false);
      setPlanMsg("");
      resetGen();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeFormation(id) {
    if (gen.running) return;
    const f = formations.find((x) => x.id === id);
    const label = f?.title ? `« ${f.title} »` : "cette formation";
    if (!window.confirm(`Supprimer ${label} ? Cette action est définitive.`)) return;
    setError("");
    setNotice("");
    try {
      await api(`/formations/${id}`, { method: "DELETE" });
      if (current?.id === id) {
        setCurrent(null);
        setActiveId(null);
        setPlanEdit(false);
        setPlanDirty(false);
        resetGen();
      }
      loadList();
    } catch (err) {
      setError(err.message);
    }
  }

  /* ----- Plan modifiable : tout se fait sur un brouillon, enregistré en une seule fois ----- */
  function startPlanEdit() {
    if (gen.running || !current) return;
    draftKey.current = 0;
    setDraft(
      (current.modules || []).map((m) => ({
        key: m.id,
        id: m.id,
        copy_from: null,
        title: m.title || "",
        summary: m.summary || "",
        objective: m.objective || "",
        skills: (m.skills || []).join(", "),
        hasContent: !!(m.content || "").trim(),
      }))
    );
    setPlanDirty(false);
    setPlanErr("");
    setPlanMsg("");
    setPlanEdit(true);
  }

  function cancelPlanEdit() {
    if (planDirty && !window.confirm("Abandonner les modifications du plan ?")) return;
    setPlanEdit(false);
    setPlanDirty(false);
    setPlanErr("");
  }

  function editDraft(key, field, value) {
    setDraft((l) => l.map((d) => (d.key === key ? { ...d, [field]: value } : d)));
    setPlanDirty(true);
  }

  function moveDraft(key, dir) {
    setDraft((l) => {
      const i = l.findIndex((d) => d.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= l.length) return l;
      const copy = [...l];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
    setPlanDirty(true);
  }

  function removeDraft(key) {
    const d = draft.find((x) => x.key === key);
    if (draft.length <= 1) {
      setPlanErr("Un plan doit garder au moins un module.");
      return;
    }
    if (
      d?.hasContent &&
      !window.confirm(
        `La leçon rédigée de « ${d.title || "ce module"} » sera supprimée quand vous enregistrerez le plan. Continuer ?`
      )
    ) {
      return;
    }
    setPlanErr("");
    setDraft((l) => l.filter((x) => x.key !== key));
    setPlanDirty(true);
  }

  function duplicateDraft(key) {
    if (draft.length >= MAX_PLAN_MODULES) {
      setPlanErr(`Un plan peut contenir ${MAX_PLAN_MODULES} modules au maximum.`);
      return;
    }
    setPlanErr("");
    draftKey.current += 1;
    const newKey = `new-${draftKey.current}`;
    setDraft((l) => {
      const i = l.findIndex((d) => d.key === key);
      if (i < 0) return l;
      const src = l[i];
      const copy = {
        ...src,
        key: newKey,
        id: null,
        copy_from: src.id || src.copy_from || null,
        title: `${src.title} (copie)`.slice(0, 150),
      };
      return [...l.slice(0, i + 1), copy, ...l.slice(i + 1)];
    });
    setPlanDirty(true);
  }

  function addDraft() {
    if (draft.length >= MAX_PLAN_MODULES) {
      setPlanErr(`Un plan peut contenir ${MAX_PLAN_MODULES} modules au maximum.`);
      return;
    }
    setPlanErr("");
    draftKey.current += 1;
    setDraft((l) => [
      ...l,
      {
        key: `new-${draftKey.current}`, id: null, copy_from: null,
        title: "", summary: "", objective: "", skills: "", hasContent: false,
      },
    ]);
    setPlanDirty(true);
  }

  async function savePlan() {
    if (!current || planSaving) return;
    if (draft.some((d) => !d.title.trim())) {
      setPlanErr("Donnez un titre à chaque module.");
      return;
    }
    setPlanSaving(true);
    setPlanErr("");
    try {
      const data = await api(`/formations/${current.id}/plan`, {
        method: "POST",
        body: JSON.stringify({
          modules: draft.map((d) => ({
            id: d.id || undefined,
            copy_from: d.id ? undefined : d.copy_from || undefined,
            title: d.title.trim(),
            summary: d.summary.trim(),
            objective: d.objective.trim(),
            skills: d.skills.split(/[,;،]/).map((x) => x.trim()).filter(Boolean),
          })),
        }),
      });
      setCurrent((f) => ({ ...f, modules: data.modules }));
      if (activeId && !data.modules.some((m) => m.id === activeId)) setActiveId(null);
      setPlanEdit(false);
      setPlanDirty(false);
      setPlanMsg("Plan enregistré ✓");
      loadList();
    } catch (err) {
      setPlanErr(err.message);
    } finally {
      setPlanSaving(false);
    }
  }

  function startRename(f) {
    if (gen.running) return;
    setRenamingId(f.id);
    setRenameValue(f.title || "");
  }

  async function submitRename(id) {
    const title = renameValue.trim();
    if (title.length < 3) {
      setError("Le titre doit contenir au moins 3 caractères.");
      return;
    }
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      const data = await api(`/formations/${id}/rename`, {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      setRenamingId(null);
      if (current?.id === id) setCurrent((f) => ({ ...f, title: data.title }));
      await loadList();
      setNotice("Formation renommée ✓");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function duplicateFormation(id) {
    if (gen.running || busyId) return;
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      const data = await api(`/formations/${id}/duplicate`, { method: "POST" });
      await loadList();
      setNotice(`Copie créée : « ${data.title} » ✓`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function archiveFormation(id, archived) {
    if (gen.running || busyId) return;
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      await api(`/formations/${id}/archive`, {
        method: "POST",
        body: JSON.stringify({ archived }),
      });
      await loadList();
      setNotice(archived ? "Formation archivée ✓ (retrouvez-la dans « Archivées »)" : "Formation restaurée ✓");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function fmtDate(value) {
    if (!value) return "";
    const d = new Date(String(value).includes("T") ? value : `${String(value).replace(" ", "T")}Z`);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  const activeCount = formations.filter((f) => !f.archived).length;
  const archivedCount = formations.length - activeCount;
  const q = search.trim().toLowerCase();
  const visibleFormations = formations
    .filter((f) => (showArchived ? !!f.archived : !f.archived))
    .filter((f) => !q || String(f.title || "").toLowerCase().includes(q))
    .sort((a, b) => {
      if (sort === "az") return String(a.title).localeCompare(String(b.title), "fr", { sensitivity: "base" });
      if (sort === "za") return String(b.title).localeCompare(String(a.title), "fr", { sensitivity: "base" });
      const da = String(a.updated_at || a.created_at || "");
      const db = String(b.updated_at || b.created_at || "");
      return sort === "old" ? da.localeCompare(db) : db.localeCompare(da);
    });

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

            <label className="fm-field">
              <span className="fm-flabel">Public cible (facultatif)</span>
              <input
                className="fm-input"
                value={brief.audience}
                onChange={(e) => setBrief((b) => ({ ...b, audience: e.target.value }))}
                placeholder="Ex : entrepreneurs débutants, étudiants, coachs..."
                maxLength={200}
                disabled={creating || gen.running}
              />
            </label>
            <div className="fm-grid2">
              <SelectField
                label="Niveau"
                value={brief.level}
                options={LEVEL_OPTIONS}
                onChange={(v) => setBrief((b) => ({ ...b, level: v }))}
                disabled={creating || gen.running}
              />
              <SelectField
                label="Nombre de modules"
                value={String(brief.modules_count)}
                options={MODULE_COUNT_OPTIONS}
                onChange={(v) => setBrief((b) => ({ ...b, modules_count: v }))}
                disabled={creating || gen.running}
              />
            </div>

            <details className="fm-adv">
              <summary>Options avancées</summary>
              <div className="fm-adv-body">
                <label className="fm-field">
                  <span className="fm-flabel">Objectifs pédagogiques</span>
                  <textarea
                    className="fm-input fm-pe-area"
                    rows={3}
                    value={brief.objectives}
                    onChange={(e) => setBrief((b) => ({ ...b, objectives: e.target.value }))}
                    placeholder="Ce que l'apprenant saura faire à la fin"
                    maxLength={500}
                    disabled={creating || gen.running}
                  />
                </label>
                <label className="fm-field">
                  <span className="fm-flabel">Prérequis</span>
                  <input
                    className="fm-input"
                    value={brief.prerequisites}
                    onChange={(e) => setBrief((b) => ({ ...b, prerequisites: e.target.value }))}
                    placeholder="Ex : savoir utiliser un smartphone"
                    maxLength={300}
                    disabled={creating || gen.running}
                  />
                </label>
                <label className="fm-field">
                  <span className="fm-flabel">Durée estimée</span>
                  <input
                    className="fm-input"
                    value={brief.duration}
                    onChange={(e) => setBrief((b) => ({ ...b, duration: e.target.value }))}
                    placeholder="Ex : 4 semaines, 6 heures"
                    maxLength={60}
                    disabled={creating || gen.running}
                  />
                </label>
                <div className="fm-grid2">
                  <SelectField
                    label="Type de formation"
                    value={brief.type}
                    options={TYPE_OPTIONS}
                    onChange={(v) => setBrief((b) => ({ ...b, type: v }))}
                    disabled={creating || gen.running}
                  />
                  <SelectField
                    label="Ton"
                    value={brief.tone}
                    options={TONE_OPTIONS}
                    onChange={(v) => setBrief((b) => ({ ...b, tone: v }))}
                    disabled={creating || gen.running}
                  />
                  <SelectField
                    label="Niveau de détail"
                    value={brief.detail}
                    options={DETAIL_OPTIONS}
                    onChange={(v) => setBrief((b) => ({ ...b, detail: v }))}
                    disabled={creating || gen.running}
                  />
                  <SelectField
                    label="Style rédactionnel"
                    value={brief.style}
                    options={STYLE_OPTIONS}
                    onChange={(v) => setBrief((b) => ({ ...b, style: v }))}
                    disabled={creating || gen.running}
                  />
                </div>
              </div>
            </details>

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
              {briefSummary(current.brief) && <p className="fm-muted fm-small">{briefSummary(current.brief)}</p>}
              {planMsg && !planEdit && <div className="fm-ok" style={{ marginTop: "0.6rem" }}>{planMsg}</div>}

              {planEdit ? (
                <div>
                  <p className="fm-muted fm-small" style={{ marginTop: "0.8rem" }}>
                    Modifiez, ajoutez, dupliquez, supprimez ou réordonnez les modules. Rien n'est enregistré tant que
                    vous n'appuyez pas sur « Enregistrer le plan ».
                  </p>
                  <ol className="fm-modules">
                    {draft.map((d, i) => (
                      <li key={d.key} className="fm-pe">
                        <div className="fm-pe-head">
                          <span className="fm-num">{i + 1}</span>
                          <div className="fm-pe-tools">
                            <button type="button" className="fm-pe-btn" onClick={() => moveDraft(d.key, -1)} disabled={i === 0} aria-label="Monter le module">↑</button>
                            <button type="button" className="fm-pe-btn" onClick={() => moveDraft(d.key, 1)} disabled={i === draft.length - 1} aria-label="Descendre le module">↓</button>
                            <button type="button" className="fm-pe-btn" onClick={() => duplicateDraft(d.key)} aria-label="Dupliquer le module">⧉</button>
                            <button type="button" className="fm-pe-btn fm-pe-del" onClick={() => removeDraft(d.key)} aria-label="Supprimer le module">🗑</button>
                          </div>
                        </div>
                        <input
                          className="fm-input"
                          value={d.title}
                          onChange={(e) => editDraft(d.key, "title", e.target.value)}
                          placeholder="Titre du module"
                          maxLength={150}
                          aria-label="Titre du module"
                        />
                        <textarea
                          className="fm-input fm-pe-area"
                          rows={2}
                          value={d.summary}
                          onChange={(e) => editDraft(d.key, "summary", e.target.value)}
                          placeholder="Description du module"
                          maxLength={400}
                          aria-label="Description du module"
                        />
                        <input
                          className="fm-input"
                          value={d.objective}
                          onChange={(e) => editDraft(d.key, "objective", e.target.value)}
                          placeholder="Objectif pédagogique"
                          maxLength={400}
                          aria-label="Objectif pédagogique"
                        />
                        <input
                          className="fm-input"
                          value={d.skills}
                          onChange={(e) => editDraft(d.key, "skills", e.target.value)}
                          placeholder="Compétences à acquérir (séparées par des virgules)"
                          aria-label="Compétences à acquérir"
                        />
                        {!d.id && (
                          <div className="fm-muted fm-small">
                            {d.copy_from
                              ? "Copie : le texte, la vidéo et les ressources de la leçon sont repris."
                              : "Nouveau module : leçon à rédiger."}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                  <button
                    type="button"
                    className="fm-btn fm-btn-outline"
                    style={{ marginTop: "0.8rem" }}
                    onClick={addDraft}
                    disabled={planSaving}
                  >
                    + Ajouter un module
                  </button>
                  {planErr && <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{planErr}</div>}
                  <div className="fm-rename-actions" style={{ marginTop: "1rem" }}>
                    <button type="button" className="fm-btn fm-btn-gold" style={{ marginBottom: 0 }} onClick={savePlan} disabled={planSaving}>
                      {planSaving ? "Enregistrement..." : "💾 Enregistrer le plan"}
                    </button>
                    <button type="button" className="fm-btn fm-btn-outline" onClick={cancelPlanEdit} disabled={planSaving}>
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
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
                          {m.objective && <div className="fm-muted fm-small">🎯 {m.objective}</div>}
                          {m.skills && m.skills.length > 0 && (
                            <div className="fm-muted fm-small">Compétences : {m.skills.join(", ")}</div>
                          )}
                        </div>
                        <span className="fm-state">
                          {isCurrent ? "⏳ En cours..." : m.content ? "✓ Rédigée" : "À rédiger"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              )}

              {planEdit ? null : gen.running ? (
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
                  <p className="fm-muted fm-small" style={{ marginTop: "1rem" }}>
                    Relisez le plan : vous pouvez le modifier avant de générer les leçons.
                  </p>
                  <button className="fm-btn fm-btn-outline" style={{ marginTop: "0.6rem" }} onClick={startPlanEdit}>
                    ✏️ Modifier le plan
                  </button>
                  <button className="fm-btn fm-btn-gold" style={{ marginTop: "0.8rem", marginBottom: 0 }} onClick={generateAll}>
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
          {notice && <div className="fm-ok" style={{ marginTop: 0, marginBottom: "0.8rem" }}>{notice}</div>}
          {loading ? (
            <p className="fm-muted">Chargement...</p>
          ) : formations.length === 0 ? (
            <p className="fm-muted">Aucune formation pour le moment.</p>
          ) : (
            <>
              <div className="fm-tabs">
                <button
                  type="button"
                  className={!showArchived ? "fm-tab on" : "fm-tab"}
                  onClick={() => setShowArchived(false)}
                >
                  Actives ({activeCount})
                </button>
                <button
                  type="button"
                  className={showArchived ? "fm-tab on" : "fm-tab"}
                  onClick={() => setShowArchived(true)}
                >
                  Archivées ({archivedCount})
                </button>
              </div>

              <div className="fm-toolbar">
                <input
                  className="fm-input"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="🔎 Rechercher une formation"
                  aria-label="Rechercher une formation"
                />
                <select
                  className="fm-input"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label="Trier les formations"
                >
                  <option value="recent">Modifiées récemment</option>
                  <option value="old">Plus anciennes d'abord</option>
                  <option value="az">Titre A → Z</option>
                  <option value="za">Titre Z → A</option>
                </select>
              </div>

              {visibleFormations.length === 0 ? (
                <p className="fm-muted">
                  {q
                    ? "Aucune formation ne correspond à votre recherche."
                    : showArchived
                    ? "Aucune formation archivée."
                    : "Aucune formation active."}
                </p>
              ) : (
                <div className="fm-list">
                  {visibleFormations.map((f) => {
                    const total = f.modules_count ?? 0;
                    const written = f.written_count;
                    const busy = busyId === f.id;
                    const date = fmtDate(f.updated_at || f.created_at);
                    return (
                      <div key={f.id} className="fm-item">
                        {renamingId === f.id ? (
                          <form
                            className="fm-rename"
                            onSubmit={(e) => {
                              e.preventDefault();
                              submitRename(f.id);
                            }}
                          >
                            <input
                              className="fm-input"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              maxLength={200}
                              autoFocus
                              aria-label="Nouveau titre"
                            />
                            <div className="fm-rename-actions">
                              <button type="submit" className="fm-btn fm-btn-gold" style={{ marginBottom: 0 }} disabled={busy}>
                                {busy ? "..." : "Valider"}
                              </button>
                              <button
                                type="button"
                                className="fm-btn fm-btn-outline"
                                onClick={() => setRenamingId(null)}
                                disabled={busy}
                              >
                                Annuler
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button className="fm-item-main" onClick={() => openFormation(f.id)}>
                            <span className="fm-module-title">{f.title}</span>
                            <span className="fm-muted fm-small">
                              {total} module{total > 1 ? "s" : ""}
                              {written !== undefined ? ` · ${written}/${total} rédigées` : ""}
                              {" · "}
                              {f.status === "published" ? "Publiée" : "Brouillon"}
                              {date ? ` · Modifiée le ${date}` : ""}
                            </span>
                          </button>
                        )}
                        {renamingId !== f.id && (
                          <div className="fm-item-actions">
                            <button type="button" className="fm-act" onClick={() => startRename(f)} disabled={busy || gen.running}>
                              ✏️ Renommer
                            </button>
                            <button type="button" className="fm-act" onClick={() => duplicateFormation(f.id)} disabled={busy || gen.running}>
                              {busy ? "…" : "⧉ Dupliquer"}
                            </button>
                            <button
                              type="button"
                              className="fm-act"
                              onClick={() => archiveFormation(f.id, !f.archived)}
                              disabled={busy || gen.running}
                            >
                              {f.archived ? "♻️ Restaurer" : "🗄 Archiver"}
                            </button>
                            <button
                              type="button"
                              className="fm-act fm-act-danger"
                              onClick={() => removeFormation(f.id)}
                              disabled={busy || gen.running}
                              aria-label="Supprimer"
                            >
                              ✕ Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
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
          box-sizing: border-box; width: 100%; padding: 0.8rem 1rem; border-radius: 10px; font-size: 1rem;
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
        .fm-img-open {
          position: relative; display: block; width: 100%; padding: 0; min-height: 6rem;
          border: 1px solid rgba(128,128,128,0.3); border-radius: 10px; overflow: hidden;
          background: rgba(128,128,128,0.08); cursor: zoom-in; color: inherit;
        }
        .fm-res-img {
          display: block; width: 100%; height: auto; max-height: 70vh;
          object-fit: contain; transition: opacity 0.2s ease;
        }
        .fm-img-state {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          padding: 1rem; text-align: center; font-size: 0.85rem; opacity: 0.75;
        }
        .fm-img-err { color: #ef4444; opacity: 1; }
        .fm-img-zoom {
          position: absolute; right: 0.5rem; bottom: 0.5rem; padding: 0.3rem 0.6rem;
          border-radius: 999px; font-size: 0.75rem; font-weight: 600;
          background: rgba(11,11,11,0.7); color: #fff;
        }

        .fm-viewer {
          position: fixed; inset: 0; z-index: 1000; display: flex; flex-direction: column;
          background: rgba(0,0,0,0.94); color: #fff;
        }
        .fm-vw-bar {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.8rem;
          padding-top: max(0.6rem, env(safe-area-inset-top));
        }
        .fm-vw-zoom { min-width: 3rem; text-align: center; font-size: 0.85rem; }
        .fm-vw-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem;
          min-width: 44px; height: 44px; padding: 0 0.8rem; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.08);
          color: #fff; font-size: 1rem;
        }
        .fm-vw-close { margin-left: auto; background: #D4AF37; border-color: #D4AF37; color: #0B0B0B; font-weight: 700; }
        .fm-vw-stage { position: relative; flex: 1; min-height: 0; overflow: hidden; touch-action: none; }
        .fm-vw-img {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: contain; user-select: none; -webkit-user-drag: none;
        }
        .fm-vw-panel {
          display: grid; gap: 0.5rem; padding: 0.8rem; max-height: 42vh; overflow: auto;
          padding-bottom: max(0.8rem, env(safe-area-inset-bottom));
          background: #111; border-top: 1px solid rgba(255,255,255,0.15);
        }
        .fm-vw-input {
          width: 100%; padding: 0.7rem 0.9rem; border-radius: 10px; font-size: 1rem;
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.25);
          color: #fff; outline: none;
        }
        .fm-vw-input:focus { border-color: #D4AF37; }
        .fm-vw-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
        .fm-vw-act { width: 100%; }
        .fm-vw-danger { color: #fca5a5; border-color: rgba(239,68,68,0.5); }
        .fm-vw-hint { font-size: 0.75rem; opacity: 0.6; }
        .fm-addbox {
          padding: 0.8rem; border-radius: 12px;
          border: 1px dashed rgba(212,175,55,0.6); background: rgba(212,175,55,0.06);
        }
        .fm-addrow { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
        .fm-list { display: grid; gap: 0.6rem; }
        .fm-item {
          display: flex; flex-wrap: wrap; align-items: center; border-radius: 12px;
          background: rgba(128,128,128,0.10); border: 1px solid rgba(128,128,128,0.25);
        }
        .fm-field { display: block; margin-bottom: 0.8rem; }
        .fm-flabel { display: block; font-size: 0.8rem; font-weight: 600; opacity: 0.75; margin-bottom: 0.3rem; }
        .fm-grid2 { display: grid; gap: 0.6rem; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); margin-bottom: 0.8rem; }
        .fm-grid2 .fm-field { margin-bottom: 0; }
        .fm-adv { margin: 0.2rem 0 1rem; border: 1px dashed rgba(128,128,128,0.4); border-radius: 12px; padding: 0.6rem 0.8rem; }
        .fm-adv summary { cursor: pointer; font-weight: 600; font-size: 0.9rem; padding: 0.3rem 0; list-style-position: inside; }
        .fm-adv-body { margin-top: 0.8rem; }
        .fm-pe {
          display: grid; gap: 0.5rem; padding: 0.8rem; border-radius: 12px;
          border: 1px solid rgba(128,128,128,0.3); background: rgba(128,128,128,0.06);
        }
        .fm-pe-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
        .fm-pe-tools { display: flex; gap: 0.35rem; }
        .fm-pe-btn {
          min-width: 44px; height: 44px; border-radius: 10px; font-size: 1.05rem;
          border: 1px solid rgba(128,128,128,0.4); background: transparent; color: inherit;
        }
        .fm-pe-btn:disabled { opacity: 0.35; }
        .fm-pe-del { border-color: rgba(239,68,68,0.5); }
        .fm-pe-area { min-height: 3.2rem; line-height: 1.5; resize: vertical; font-family: inherit; }
        .fm-toolbar { display: grid; gap: 0.6rem; margin-bottom: 1rem; }
        @media (min-width: 560px) { .fm-toolbar { grid-template-columns: 1fr 14rem; } }
        .fm-item-actions {
          display: flex; flex-wrap: wrap; gap: 0.4rem; width: 100%;
          padding: 0.5rem 0.8rem 0.7rem; border-top: 1px solid rgba(128,128,128,0.2);
        }
        .fm-act {
          font-size: 0.78rem; padding: 0.45rem 0.7rem; min-height: 40px; border-radius: 999px;
          border: 1px solid rgba(128,128,128,0.35); background: transparent; color: inherit;
        }
        .fm-act:disabled { opacity: 0.5; }
        .fm-act-danger { color: #ef4444; border-color: rgba(239,68,68,0.45); }
        .fm-rename { width: 100%; display: grid; gap: 0.6rem; padding: 0.8rem; }
        .fm-rename-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
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
          .no-print, .fm-screen, .fm-viewer, header, aside { display: none !important; }
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
