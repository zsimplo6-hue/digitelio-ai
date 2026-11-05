import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";
import PublishPanel from "../components/PublishPanel.jsx";
import FormationPreview from "../components/FormationPreview.jsx";
import { formationThemeVars } from "../utils/formationTemplates.js";
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

/* Informations du brief sous forme de pastilles lisibles (au lieu d'une longue phrase) */
function briefChips(b) {
  if (!b) return [];
  const out = [];
  if (b.audience) out.push(["Public cible", b.audience]);
  if (b.level) out.push(["Niveau", labelOf(LEVEL_OPTIONS, b.level)]);
  if (b.duration) out.push(["Durée", b.duration]);
  if (b.type) out.push(["Type", labelOf(TYPE_OPTIONS, b.type)]);
  if (b.tone) out.push(["Ton", labelOf(TONE_OPTIONS, b.tone)]);
  return out;
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

/* Décode l'image UNE seule fois (en arrière-plan quand le navigateur sait le faire) */
async function loadBitmap(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* repli ci-dessous */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible. Essayez un fichier JPG ou PNG."));
    };
    img.src = url;
  });
}

function bitmapToJpeg(bmp, maxW, quality) {
  const scale = Math.min(1, maxW / bmp.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

const pause = () => new Promise((resolve) => setTimeout(resolve, 0));

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
  const bmp = await loadBitmap(file);
  try {
    for (const [w, q] of IMAGE_STEPS) {
      await pause(); // laisse l'écran se mettre à jour entre deux essais
      const data = bitmapToJpeg(bmp, w, q);
      if (data.length <= IMAGE_MAX_CHARS) return data;
    }
  } finally {
    if (typeof bmp.close === "function") bmp.close();
  }
  throw new Error("Image trop lourde, choisissez-en une plus légère.");
}

/* ---------- Image d'une ressource : pleine largeur, ratio conservé, clic = agrandir ----------
   L'image est affichée directement (elle est déjà en mémoire) : aucun état intermédiaire ne peut rester bloqué.
   Le composant est recréé quand l'image change (clé côté appelant), donc l'erreur est remise à zéro. */
function ResImage({ src, alt, onOpen }) {
  const [failed, setFailed] = useState(false);
  return (
    <button type="button" className="fm-img-open" onClick={onOpen} aria-label="Agrandir l'image">
      {failed ? (
        <span className="fm-img-state fm-img-err">Image illisible. Remplacez-la ou supprimez-la.</span>
      ) : (
        <img src={src} alt={alt} className="fm-res-img" decoding="async" onError={() => setFailed(true)} />
      )}
      {!failed && <span className="fm-img-zoom">🔍 Agrandir</span>}
    </button>
  );
}

/* ---------- Modèle commun des médias d'une leçon (aperçu écran ET PDF) ---------- */
function buildMedia(mainVideo, resources) {
  const videos = [];
  if (mainVideo) videos.push({ url: mainVideo, title: "" });
  const images = [];
  const links = [];
  for (const r of resources) {
    if (r.type === "image") images.push(r);
    else if (r.type === "video") videos.push({ url: r.url, title: r.label && r.label !== "Vidéo" ? r.label : "" });
    else links.push(r);
  }
  return { videos, images, links };
}

/* Carte vidéo pour l'aperçu à l'écran : lecteur intégré, ou lien si l'intégration est impossible */
function PreviewVideo({ url, title }) {
  const emb = embedUrl(url);
  return (
    <figure className="fm-paper-video">
      {title && <figcaption className="fm-paper-vtitle">▶ {title}</figcaption>}
      {emb ? (
        <div className="fm-video" style={{ marginTop: 0 }}>
          <iframe src={emb} title={title || "Vidéo de la leçon"} allowFullScreen loading="lazy" />
        </div>
      ) : (
        <a className="fm-link" href={url} target="_blank" rel="noreferrer">
          Ouvrir la vidéo ↗
        </a>
      )}
    </figure>
  );
}

/* Médias d'un module dans l'aperçu réel de la formation : vidéos intégrées, images pleine largeur, liens */
function ModuleMedia({ module }) {
  const res = (module.resources || []).filter((r) => r && r.url);
  const media = buildMedia((module.video_url || "").trim(), res);
  if (!media.videos.length && !media.images.length && !media.links.length) return null;
  return (
    <div className="fp-media">
      {media.videos.map((v, i) => {
        const emb = embedUrl(v.url);
        return (
          <figure key={`v${i}`}>
            {v.title && <figcaption className="fp-vtitle">▶ {v.title}</figcaption>}
            {emb ? (
              <div className="fm-video">
                <iframe src={emb} title={v.title || "Vidéo"} allowFullScreen loading="lazy" />
              </div>
            ) : (
              <a href={v.url} target="_blank" rel="noreferrer">▶ Ouvrir la vidéo ↗</a>
            )}
          </figure>
        );
      })}
      {media.images.map((r, i) => (
        <figure key={`i${i}`}>
          <img src={r.url} alt={r.alt || r.label || ""} decoding="async" loading="lazy" />
          {r.label && r.label !== "Image" && <figcaption>{r.label}</figcaption>}
        </figure>
      ))}
      {media.links.length > 0 && (
        <ul className="fp-links">
          {media.links.map((r, i) => (
            <li key={`l${i}`}>
              <a href={r.url} target="_blank" rel="noreferrer">{r.label || r.url}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* Carte vidéo pour le PDF : vignette (YouTube), titre et lien cliquable bien visible */
function PrintVideo({ url, title }) {
  const yt = youtubeId(url);
  return (
    <div className="fm-sheet-vcard">
      <a className="fm-sheet-thumb" href={url} target="_blank" rel="noreferrer">
        {yt && (
          <img
            src={`https://img.youtube.com/vi/${yt}/hqdefault.jpg`}
            alt="Miniature de la vidéo"
            loading="eager"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <span className="fm-play">▶</span>
      </a>
      <div className="fm-sheet-vbody">
        {title && <div className="fm-sheet-vtitle">{title}</div>}
        <a className="fm-sheet-btn" href={url} target="_blank" rel="noreferrer">
          ▶ Regarder la vidéo
        </a>
        <a className="fm-sheet-vurl" href={url} target="_blank" rel="noreferrer">
          {url}
        </a>
      </div>
    </div>
  );
}

/* Attend que les images (miniatures incluses) soient chargées avant d'imprimer */
async function waitForImages(root, timeoutMs = 6000) {
  if (!root) return;
  const pending = [...root.querySelectorAll("img")].filter((img) => !img.complete);
  if (!pending.length) return;
  await Promise.race([
    Promise.all(
      pending.map(
        (img) =>
          new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          })
      )
    ),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
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

/* Zone de texte qui grandit avec son contenu : un titre ou un objectif long reste lisible en entier */
function AutoTextarea({ value, onChange, minRows = 1, ...props }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea ref={ref} rows={minRows} value={value} onChange={onChange} className="fm-input fm-auto" {...props} />
  );
}

const COVERS = [
  "linear-gradient(135deg,#3a2a08,#8a6a12)",
  "linear-gradient(135deg,#1b1840,#5a3fb4)",
  "linear-gradient(135deg,#0d2e2b,#1f8a7a)",
  "linear-gradient(135deg,#3b1020,#a33a5a)",
  "linear-gradient(135deg,#10213a,#2f6fb4)",
];
function coverFor(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COVERS[h % COVERS.length];
}

/* ---------- Carte d'une formation (bibliothèque) ---------- */
function FormationCard({
  f, date, busy, disabled, renaming, renameValue, onRenameValue,
  onOpen, onStartRename, onSubmitRename, onCancelRename, onDuplicate, onArchive, onDelete,
}) {
  const [menu, setMenu] = useState(false);
  const total = f.modules_count ?? 0;
  const written = f.written_count;
  const pct = total && written !== undefined ? Math.round((written / total) * 100) : null;
  return (
    <article className="fm-fcard">
      <div className="fm-fcover" style={{ background: coverFor(f.id) }}>
        <span className="fm-fico" aria-hidden="true">🎓</span>
        <span className="fm-badges">
          {f.archived ? <span className="fm-badge">Archivée</span> : null}
          <span className={f.status === "published" ? "fm-badge fm-badge-pub" : "fm-badge"}>
            {f.status === "published" ? "Publiée" : "Brouillon"}
          </span>
        </span>
      </div>
      <div className="fm-fbody">
        {renaming ? (
          <form
            className="fm-rename"
            style={{ padding: 0 }}
            onSubmit={(e) => {
              e.preventDefault();
              onSubmitRename();
            }}
          >
            <AutoTextarea
              value={renameValue}
              onChange={(e) => onRenameValue(e.target.value)}
              maxLength={200}
              autoFocus
              aria-label="Nouveau titre"
            />
            <div className="fm-rename-actions">
              <button type="submit" className="fm-btn fm-btn-gold" style={{ marginBottom: 0 }} disabled={busy}>
                {busy ? "..." : "Valider"}
              </button>
              <button type="button" className="fm-btn fm-btn-outline" onClick={onCancelRename} disabled={busy}>
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <>
            <h3 className="fm-ftitle">{f.title}</h3>
            <div className="fm-fmeta">
              {total} module{total > 1 ? "s" : ""}
              {written !== undefined ? ` · ${written}/${total} rédigées` : ""}
              {date ? ` · ${date}` : ""}
            </div>
            {pct !== null && (
              <div className="fm-fbar" aria-label={`${pct}% rédigé`}>
                <i style={{ width: `${Math.max(pct, 3)}%` }} />
              </div>
            )}
            <div className="fm-factions">
              <button type="button" className="fm-fopen" onClick={onOpen} disabled={disabled}>
                Ouvrir
              </button>
              <button
                type="button"
                className="fm-fmore"
                onClick={() => setMenu((v) => !v)}
                aria-expanded={menu}
                aria-label="Plus d'actions"
              >
                ⋯
              </button>
            </div>
            {menu && (
              <div className="fm-fmenu">
                <button type="button" className="fm-act" onClick={onStartRename} disabled={busy || disabled}>✏️ Renommer</button>
                <button type="button" className="fm-act" onClick={onDuplicate} disabled={busy || disabled}>{busy ? "…" : "⧉ Dupliquer"}</button>
                <button type="button" className="fm-act" onClick={onArchive} disabled={busy || disabled}>
                  {f.archived ? "♻️ Restaurer" : "🗄 Archiver"}
                </button>
                <button type="button" className="fm-act fm-act-danger" onClick={onDelete} disabled={busy || disabled} aria-label="Supprimer">
                  ✕ Supprimer
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
}

/* ---------- Bibliothèque : fenêtre plein écran sur mobile, centrée sur ordinateur ---------- */
function LibraryDrawer({ title, onClose, children }) {
  const [theme] = useState(() => {
    let el = document.body;
    while (el) {
      const cs = getComputedStyle(el);
      if (cs.backgroundColor && !/rgba?\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) {
        return { background: cs.backgroundColor, color: cs.color };
      }
      el = el.parentElement;
    }
    return { background: "#ffffff", color: "#111111" };
  });
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return createPortal(
    <div
      className="fm-drawer-bg no-print"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="fm-drawer" style={theme}>
        <div className="fm-drawer-head">
          <h2 className="fm-drawer-title">{title}</h2>
          <button type="button" className="fm-drawer-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="fm-drawer-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

/* ---------- Éditeur d'une leçon ---------- */
function LessonEditor({ formation, module, onChange, themeVars }) {
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
  const [processing, setProcessing] = useState(false);

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
  const media = buildMedia(cleanVideo, cleanResources);

  async function printLesson() {
    await waitForImages(document.querySelector(".fm-sheet"));
    window.print();
  }

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
    setAdding(false);
    setProcessing(true);
    try {
      const data = await prepareImage(file);
      setResources((l) => [...l, { type: "image", label: "", alt: "", url: data }]);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setProcessing(false);
    }
  }

  async function replaceImage(i, file) {
    setErr("");
    setMsg("");
    setProcessing(true);
    try {
      const data = await prepareImage(file);
      setResources((l) => l.map((r, idx) => (idx === i ? { ...r, url: data } : r)));
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setProcessing(false);
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
            <>
              <textarea
                className="fm-input fm-textarea"
                dir={rtl ? "rtl" : "ltr"}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Texte de la leçon (Markdown : ### Titre, - puce)..."
              />

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
                  <ResImage key={`${i}-${r.url.length}`} src={r.url} alt={r.alt || r.label || "Image"} onOpen={() => setViewIndex(i)} />
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
          ) : processing ? (
            <div className="fm-processing" role="status">
              <span className="fm-spin" /> Traitement de l'image en cours…
            </div>
          ) : (
            <button className="fm-chip" onClick={() => setAdding(true)}>
              + Ajouter une ressource
            </button>
          )}

            </>
          ) : (
            <article className="fm-paper" dir={rtl ? "rtl" : "ltr"} style={themeVars}>
              <div className="fm-paper-kicker">{formation.title}</div>
              <h2 className="fm-paper-title">{module.title}</h2>
              <div
                className="fm-lesson"
                dangerouslySetInnerHTML={{
                  __html: content.trim() ? renderMarkdown(content) : "<p>Aucun texte pour le moment.</p>",
                }}
              />
              {media.videos.length > 0 && (
                <section className="fm-paper-sec">
                  <h3 className="fm-paper-h">{media.videos.length > 1 ? "Vidéos de la leçon" : "Vidéo de la leçon"}</h3>
                  {media.videos.map((v, i) => (
                    <PreviewVideo key={i} url={v.url} title={v.title} />
                  ))}
                </section>
              )}
              {media.images.length > 0 && (
                <section className="fm-paper-sec">
                  <h3 className="fm-paper-h">Illustrations</h3>
                  {media.images.map((r, i) => (
                    <figure key={i} className="fm-paper-fig">
                      <img src={r.url} alt={r.alt || r.label} decoding="async" />
                      {r.label && r.label !== "Image" && <figcaption>{r.label}</figcaption>}
                    </figure>
                  ))}
                </section>
              )}
              {media.links.length > 0 && (
                <section className="fm-paper-sec">
                  <h3 className="fm-paper-h">Ressources</h3>
                  <ul className="fm-paper-links">
                    {media.links.map((r, i) => (
                      <li key={i}>
                        <a href={r.url} target="_blank" rel="noreferrer">
                          {r.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </article>
          )}

          {err && <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{err}</div>}
          {msg && <div className="fm-ok">{msg}</div>}

          <div className="fm-actions">
            <button className="btn-primary fm-btn" onClick={save} disabled={saving || generating}>
              {saving ? "Enregistrement..." : "💾 Enregistrer"}
            </button>
            <button className="fm-btn fm-btn-outline" onClick={printLesson} disabled={!content.trim()}>
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

        {media.videos.length > 0 && (
          <div className="fm-sheet-videobox">
            <h2 className="fm-sheet-h2">{media.videos.length > 1 ? "Vidéos de la leçon" : "Vidéo de la leçon"}</h2>
            {media.videos.map((v, i) => (
              <PrintVideo key={i} url={v.url} title={v.title} />
            ))}
          </div>
        )}

        {media.images.length > 0 && (
          <div className="fm-sheet-res">
            <h2 className="fm-sheet-h2">Illustrations</h2>
            {media.images.map((r, i) => (
              <figure key={i} className="fm-sheet-img">
                <img src={r.url} alt={r.alt || r.label} />
                {r.label && r.label !== "Image" && <figcaption>{r.label}</figcaption>}
              </figure>
            ))}
          </div>
        )}

        {media.links.length > 0 && (
          <div className="fm-sheet-res">
            <h2 className="fm-sheet-h2">Ressources</h2>
            <ul>
              {media.links.map((r, i) => (
                <li key={i}>
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {r.label}
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
  const [libOpen, setLibOpen] = useState(false);
  const [openKey, setOpenKey] = useState(null);
  const planRef = useRef(null);
  const scrollToPlan = useRef(false);
  const [style, setStyle] = useState({ template: "noir", brand: {} });
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

  /* Modèle (couleurs, polices) et style de marque : partagés par l'aperçu réel et le panneau de finalisation */
  useEffect(() => {
    if (!current?.id) return undefined;
    let alive = true;
    api(`/formations/${current.id}/style`)
      .then((d) => alive && d.template && setStyle((s) => ({ ...s, template: d.template })))
      .catch(() => {});
    api("/brand")
      .then((d) => alive && setStyle((s) => ({ ...s, brand: d.brand || {} })))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [current?.id]);

  async function chooseTemplate(id) {
    const previous = style.template;
    setStyle((s) => ({ ...s, template: id }));
    try {
      await api(`/formations/${current.id}/style`, { method: "PUT", body: JSON.stringify({ template: id }) });
    } catch (e) {
      setStyle((s) => ({ ...s, template: previous }));
      throw e;
    }
  }

  function editFromPreview(m) {
    setActiveId(m.id);
    setTimeout(() => {
      const el = document.getElementById("fm-lesson-editor");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

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
    setOpenKey(null);
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
    setOpenKey(newKey);
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
    const newKey = `new-${draftKey.current}`;
    setDraft((l) => [
      ...l,
      {
        key: newKey, id: null, copy_from: null,
        title: "", summary: "", objective: "", skills: "", hasContent: false,
      },
    ]);
    setOpenKey(newKey);
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

  useEffect(() => {
    if (current && scrollToPlan.current) {
      scrollToPlan.current = false;
      planRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [current?.id]);

  async function openFromLibrary(id) {
    scrollToPlan.current = true;
    setLibOpen(false);
    await openFormation(id);
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
  const totalWritten = formations.reduce((n, f) => n + (f.written_count || 0), 0);
  const stage = !current ? 0 : planEdit ? 1 : emptyCount > 0 ? 2 : 3;
  const recent = [...formations]
    .filter((f) => !f.archived)
    .sort((a, b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")))
    .slice(0, 3);

  function renderCard(f) {
    return (
      <FormationCard
        key={f.id}
        f={f}
        date={fmtDate(f.updated_at || f.created_at) ? `Modifiée le ${fmtDate(f.updated_at || f.created_at)}` : ""}
        busy={busyId === f.id}
        disabled={gen.running}
        renaming={renamingId === f.id}
        renameValue={renameValue}
        onRenameValue={setRenameValue}
        onOpen={() => openFromLibrary(f.id)}
        onStartRename={() => startRename(f)}
        onSubmitRename={() => submitRename(f.id)}
        onCancelRename={() => setRenamingId(null)}
        onDuplicate={() => duplicateFormation(f.id)}
        onArchive={() => archiveFormation(f.id, !f.archived)}
        onDelete={() => removeFormation(f.id)}
      />
    );
  }

  return (
    <DashboardLayout>
      <div className="fm-page">
        <div className="fm-screen no-print">
          <header className="fm-hero">
            <div className="fm-hero-glow" aria-hidden="true" />
            <div className="fm-eyebrow">Studio de formations</div>
            <h1 className="fm-hero-title">Transformez votre expertise en formation premium</h1>
            <p className="fm-hero-sub">
              Donnez un sujet : l'IA construit le plan, rédige les leçons et prépare un PDF professionnel prêt à
              vendre.
            </p>
            {formations.length > 0 && (
              <div className="fm-hero-stats">
                <div><b>{formations.filter((f) => !f.archived).length}</b><span>formation(s)</span></div>
                <div><b>{totalWritten}</b><span>leçons rédigées</span></div>
              </div>
            )}
            <ol className="fm-steps" aria-label="Étapes de création">
              {["Sujet", "Plan", "Leçons", "Export"].map((label, i) => (
                <li key={label} className={i < stage ? "fm-step done" : i === stage ? "fm-step on" : "fm-step"}>
                  <b>0{i + 1}</b>
                  {label}
                </li>
              ))}
            </ol>
          </header>

          {error && (
            <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</div>
          )}

          <form onSubmit={createFormation} className="fm-card fm-card-create">
            <div className="fm-card-head">
              <span className="fm-card-ico" aria-hidden="true">✨</span>
              <div>
                <div className="fm-card-title">Nouvelle formation</div>
                <div className="fm-card-sub">Un sujet suffit. Affinez ensuite si vous le souhaitez.</div>
              </div>
            </div>
            <input
              className="fm-input fm-topic"
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
            <div className="fm-card fm-plan" ref={planRef}>
              <div className="fm-plan-hero">
                <div className="fm-plan-kicker">Plan de la formation</div>
                <h2 className="fm-plan-title" dir={current.language === "ar" ? "rtl" : "ltr"}>
                  {current.title}
                </h2>
                {current.description && (
                  <p className="fm-plan-desc" dir={current.language === "ar" ? "rtl" : "ltr"}>
                    {current.description}
                  </p>
                )}
                <div className="fm-plan-stats">
                  <span><b>{(current.modules || []).length}</b> modules</span>
                  <span><b>{(current.modules || []).filter((m) => (m.content || "").trim()).length}</b> leçons rédigées</span>
                </div>
                {briefChips(current.brief).length > 0 && (
                  <div className="fm-plan-chips">
                    {briefChips(current.brief).map(([k, v]) => (
                      <div key={k} className={`fm-plan-chip${k === "Public cible" || k === "Durée" ? " wide" : ""}`}>
                        <span>{k}</span>
                        <b>{v}</b>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {planMsg && !planEdit && <div className="fm-ok" style={{ marginTop: "0.6rem" }}>{planMsg}</div>}

              {planEdit ? (
                <div>
                  <p className="fm-muted fm-small" style={{ marginTop: "0.8rem" }}>
                    Modifiez, ajoutez, dupliquez, supprimez ou réordonnez les modules. Rien n'est enregistré tant que
                    vous n'appuyez pas sur « Enregistrer le plan ».
                  </p>
                  <ol className="fm-modules">
                    {draft.map((d, i) => {
                      const open = openKey === d.key;
                      return (
                        <li key={d.key} className={open ? "fm-pe open" : "fm-pe"}>
                          <button
                            type="button"
                            className="fm-pe-top"
                            onClick={() => setOpenKey(open ? null : d.key)}
                            aria-expanded={open}
                          >
                            <span className="fm-num">{i + 1}</span>
                            <span className="fm-pe-main">
                              <span className="fm-pe-title">{d.title || "Module sans titre"}</span>
                              {!open && d.summary && <span className="fm-pe-sum">{d.summary}</span>}
                              {!d.id && <span className="fm-pe-new">{d.copy_from ? "Copie" : "Nouveau"}</span>}
                            </span>
                            <span className="fm-pe-chev" aria-hidden="true">⌄</span>
                          </button>
                          {open && (
                            <div className="fm-pe-body">
                              <div className="fm-pe-tools">
                                <button type="button" className="fm-pe-btn" onClick={() => moveDraft(d.key, -1)} disabled={i === 0} aria-label="Monter le module">↑ Monter</button>
                                <button type="button" className="fm-pe-btn" onClick={() => moveDraft(d.key, 1)} disabled={i === draft.length - 1} aria-label="Descendre le module">↓ Descendre</button>
                                <button type="button" className="fm-pe-btn" onClick={() => duplicateDraft(d.key)} aria-label="Dupliquer le module">⧉ Dupliquer</button>
                                <button type="button" className="fm-pe-btn fm-pe-del" onClick={() => removeDraft(d.key)} aria-label="Supprimer le module">🗑 Supprimer</button>
                              </div>
                              <label className="fm-field">
                                <span className="fm-flabel">Titre du module</span>
                                <AutoTextarea
                                  value={d.title}
                                  onChange={(e) => editDraft(d.key, "title", e.target.value)}
                                  placeholder="Titre du module"
                                  maxLength={150}
                                />
                              </label>
                              <label className="fm-field">
                                <span className="fm-flabel">Description</span>
                                <AutoTextarea
                                  minRows={2}
                                  value={d.summary}
                                  onChange={(e) => editDraft(d.key, "summary", e.target.value)}
                                  placeholder="De quoi parle ce module ?"
                                  maxLength={400}
                                />
                              </label>
                              <label className="fm-field">
                                <span className="fm-flabel">Objectif pédagogique</span>
                                <AutoTextarea
                                  minRows={2}
                                  value={d.objective}
                                  onChange={(e) => editDraft(d.key, "objective", e.target.value)}
                                  placeholder="Ce que l'apprenant saura faire à la fin du module"
                                  maxLength={400}
                                />
                              </label>
                              <label className="fm-field">
                                <span className="fm-flabel">Compétences à acquérir</span>
                                <AutoTextarea
                                  value={d.skills}
                                  onChange={(e) => editDraft(d.key, "skills", e.target.value)}
                                  placeholder="Séparées par des virgules"
                                />
                              </label>
                              {!d.id && (
                                <div className="fm-muted fm-small">
                                  {d.copy_from
                                    ? "Copie : le texte, la vidéo et les ressources de la leçon sont repris."
                                    : "Nouveau module : leçon à rédiger."}
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
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
                        <span className={m.content ? "fm-state ok" : "fm-state"}>
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

        {current && !planEdit && !gen.running && (current.modules || []).length > 0 && (
          <FormationPreview
            formation={current}
            language={current.language || "fr"}
            template={style.template}
            brand={style.brand}
            onTemplate={chooseTemplate}
            renderMedia={(m) => <ModuleMedia module={m} />}
            onEdit={editFromPreview}
            activeId={activeId}
          />
        )}

        {current && activeModule && !gen.running && (
          <div id="fm-lesson-editor">
            <LessonEditor
              key={activeModule.id}
              formation={current}
              module={activeModule}
              onChange={patchModule}
              themeVars={formationThemeVars(style.template, style.brand)}
            />
          </div>
        )}

        {current && !gen.running && (
          <PublishPanel
            key={current.id}
            formation={current}
            onChange={patchFormation}
            template={style.template}
            brand={style.brand}
            onTemplate={chooseTemplate}
          />
        )}

        <div className="fm-screen no-print">
          <section className="fm-library">
            <div className="fm-library-head">
              <div>
                <div className="fm-label" style={{ marginBottom: "0.2rem" }}>Mes formations</div>
                <div className="fm-muted fm-small" style={{ marginTop: 0 }}>
                  {formations.length > 0 ? "Reprenez là où vous vous êtes arrêté." : "Vos formations apparaîtront ici."}
                </div>
              </div>
              {formations.length > 0 && (
                <button type="button" className="fm-btn-lib" onClick={() => setLibOpen(true)}>
                  📚 Voir tout ({formations.length})
                </button>
              )}
            </div>
            {notice && !libOpen && <div className="fm-ok" style={{ marginTop: 0, marginBottom: "0.8rem" }}>{notice}</div>}
            {loading ? (
              <div className="fm-cards">
                <div className="fm-skel" />
                <div className="fm-skel" />
              </div>
            ) : formations.length === 0 ? (
              <div className="fm-empty">
                <div className="fm-empty-ico" aria-hidden="true">🎓</div>
                <div className="fm-empty-title">Créez votre première formation</div>
                <div className="fm-muted fm-small">Saisissez un sujet ci-dessus : le plan est prêt en quelques secondes.</div>
              </div>
            ) : (
              <>
                <div className="fm-cards">{recent.map((f) => renderCard(f))}</div>
                {formations.length > recent.length && (
                  <button type="button" className="fm-more" onClick={() => setLibOpen(true)}>
                    Voir toutes les formations ({formations.length})
                  </button>
                )}
              </>
            )}
          </section>
        </div>

        {libOpen && (
          <LibraryDrawer title={`Mes formations (${formations.length})`} onClose={() => setLibOpen(false)}>
            {notice && <div className="fm-ok" style={{ marginTop: 0, marginBottom: "0.8rem" }}>{notice}</div>}
            {error && <div className="mb-3 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</div>}
            <div className="fm-tabs">
              <button type="button" className={!showArchived ? "fm-tab on" : "fm-tab"} onClick={() => setShowArchived(false)}>
                Actives ({activeCount})
              </button>
              <button type="button" className={showArchived ? "fm-tab on" : "fm-tab"} onClick={() => setShowArchived(true)}>
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
              <select className="fm-input" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Trier les formations">
                <option value="recent">Modifiées récemment</option>
                <option value="old">Plus anciennes d'abord</option>
                <option value="az">Titre A → Z</option>
                <option value="za">Titre Z → A</option>
              </select>
            </div>
            {visibleFormations.length === 0 ? (
              <p className="fm-muted">
                {q ? "Aucune formation ne correspond à votre recherche." : showArchived ? "Aucune formation archivée." : "Aucune formation active."}
              </p>
            ) : (
              <div className="fm-cards">{visibleFormations.map((f) => renderCard(f))}</div>
            )}
          </LibraryDrawer>
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

        /* ================= THÈME PREMIUM ================= */
        .fm-page { max-width: 58rem; }
        .fm-hero {
          position: relative; overflow: hidden; color: #fff; border-radius: 22px;
          padding: 1.6rem 1.3rem 1.2rem; border: 1px solid rgba(212,175,55,0.4);
          background: radial-gradient(120% 140% at 0% 0%, #2f2411 0%, #15110a 48%, #0b0b0b 100%);
          box-shadow: 0 22px 44px -24px rgba(0,0,0,0.7);
        }
        .fm-hero-glow {
          position: absolute; right: -28%; top: -70%; width: 90%; aspect-ratio: 1; pointer-events: none;
          background: radial-gradient(circle, rgba(212,175,55,0.38), transparent 62%);
        }
        .fm-eyebrow { position: relative; font-size: 0.7rem; letter-spacing: 0.22em; text-transform: uppercase; color: #D4AF37; font-weight: 700; }
        .fm-hero-title { position: relative; font-size: clamp(1.45rem, 5.4vw, 2.15rem); line-height: 1.15; font-weight: 800; margin: 0.55rem 0 0.6rem; }
        .fm-hero-sub { position: relative; opacity: 0.78; max-width: 38rem; line-height: 1.55; font-size: 0.95rem; margin: 0; }
        .fm-hero-stats { position: relative; display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1rem; }
        .fm-hero-stats > div { padding: 0.45rem 0.85rem; border-radius: 12px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.14); }
        .fm-hero-stats b { font-size: 1.15rem; margin-right: 0.4rem; color: #D4AF37; }
        .fm-hero-stats span { font-size: 0.78rem; opacity: 0.8; }
        .fm-steps { position: relative; list-style: none; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.45rem; margin: 1.3rem 0 0; padding: 0; }
        .fm-step { position: relative; padding-top: 0.7rem; font-size: 0.74rem; opacity: 0.5; }
        .fm-step::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 3px; background: rgba(255,255,255,0.22); }
        .fm-step.done, .fm-step.on { opacity: 1; }
        .fm-step.done::before { background: rgba(212,175,55,0.55); }
        .fm-step.on::before { background: #D4AF37; box-shadow: 0 0 12px rgba(212,175,55,0.7); }
        .fm-step b { display: block; font-size: 0.6rem; letter-spacing: 0.16em; color: #D4AF37; margin-bottom: 0.1rem; }

        .fm-card {
          margin-top: 1.4rem; padding: 1.3rem; border-radius: 20px;
          background: linear-gradient(180deg, rgba(128,128,128,0.13), rgba(128,128,128,0.07));
          border: 1px solid rgba(128,128,128,0.22); box-shadow: 0 14px 32px -22px rgba(0,0,0,0.55);
        }
        .fm-card-head { display: flex; gap: 0.8rem; align-items: center; margin-bottom: 1rem; }
        .fm-card-ico {
          flex: none; width: 2.7rem; height: 2.7rem; border-radius: 14px; display: grid; place-items: center;
          font-size: 1.25rem; color: #0b0b0b; background: linear-gradient(135deg, #f3d777, #c9a227);
          box-shadow: 0 8px 18px -8px rgba(201,162,39,0.8);
        }
        .fm-card-title { font-weight: 800; font-size: 1.12rem; }
        .fm-card-sub { font-size: 0.82rem; opacity: 0.65; }
        .fm-input { border-radius: 12px; transition: border-color 0.15s, box-shadow 0.15s; }
        .fm-input:focus { border-color: #D4AF37; box-shadow: 0 0 0 3px rgba(212,175,55,0.25); }
        .fm-topic { font-size: 1.05rem; padding: 1rem 1.1rem; }
        .fm-chips { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; padding-bottom: 0.2rem; }
        .fm-chips::-webkit-scrollbar { display: none; }
        .fm-chip { white-space: nowrap; transition: background 0.15s, border-color 0.15s; }
        .fm-chip:hover { background: rgba(212,175,55,0.12); border-color: rgba(212,175,55,0.6); }
        .fm-btn { border-radius: 14px; padding: 0.95rem; transition: transform 0.12s, box-shadow 0.12s, opacity 0.12s; }
        .fm-btn:not(:disabled):active { transform: scale(0.985); }
        .fm-btn-gold { background: linear-gradient(135deg, #f3d777, #d4af37 55%, #b8931f); box-shadow: 0 10px 22px -12px rgba(201,162,39,0.9); }
        .fm-card-create .btn-primary { box-shadow: 0 12px 26px -14px rgba(99,102,241,0.9); }
        .fm-tabs { padding: 0.25rem; border-radius: 999px; background: rgba(128,128,128,0.14); width: fit-content; gap: 0.2rem; }
        .fm-tab { border: 0; padding: 0.5rem 1.05rem; font-weight: 600; transition: background 0.15s; }
        .fm-tab.on { background: linear-gradient(135deg, #f3d777, #d4af37); box-shadow: 0 6px 14px -8px rgba(201,162,39,0.9); }

        /* Plan : modules */
        .fm-modules { gap: 0.6rem; }
        .fm-module-btn {
          padding: 0.85rem; border-radius: 16px; border: 1px solid rgba(128,128,128,0.25);
          background: rgba(128,128,128,0.07); transition: border-color 0.15s, background 0.15s, transform 0.12s;
        }
        .fm-module-btn:not(:disabled):hover { border-color: rgba(212,175,55,0.6); background: rgba(212,175,55,0.07); }
        .fm-module-btn.active { border-color: #D4AF37; background: rgba(212,175,55,0.12); box-shadow: 0 0 0 3px rgba(212,175,55,0.18); }
        .fm-num { background: linear-gradient(135deg, #f3d777, #c9a227); box-shadow: 0 6px 14px -8px rgba(201,162,39,0.9); }
        .fm-state { padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.7rem; font-weight: 700; border: 1px solid rgba(128,128,128,0.35); opacity: 0.85; white-space: nowrap; }
        .fm-state.ok { color: #15803d; border-color: rgba(22,163,74,0.4); background: rgba(22,163,74,0.1); opacity: 1; }


        /* ===== En-tête du plan : premium ===== */
        .fm-plan-hero { position: relative; margin: -0.2rem 0 0.4rem; padding: 1.3rem 1.1rem 1.1rem; border-radius: 18px; color: #F6F1E4; overflow: hidden;
          background: radial-gradient(circle at 85% 0%, rgba(212,175,55,0.28), transparent 55%), linear-gradient(160deg, #15110a, #0b0b0b 70%); box-shadow: 0 18px 36px -24px rgba(0,0,0,0.8); }
        .fm-plan-kicker { font-size: 0.68rem; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 800; color: #D9B95B; }
        .fm-plan-title { margin: 0.5rem 0 0; font-size: clamp(1.25rem, 5.6vw, 1.7rem); line-height: 1.22; font-weight: 800; color: #fff; overflow-wrap: anywhere; }
        .fm-plan-desc { margin: 0.7rem 0 0; font-size: 0.93rem; line-height: 1.65; color: rgba(246,241,228,0.78); overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
        .fm-plan-stats { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; }
        .fm-plan-stats span { padding: 0.35rem 0.75rem; border-radius: 999px; background: rgba(255,255,255,0.09); border: 1px solid rgba(255,255,255,0.14); font-size: 0.8rem; color: rgba(246,241,228,0.85); }
        .fm-plan-stats b { color: #F3D777; margin-right: 0.2rem; }
        .fm-plan-chips { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; margin-top: 0.9rem; }
        .fm-plan-chip.wide { grid-column: 1 / -1; }
        .fm-plan-chip { padding: 0.55rem 0.75rem; border-radius: 12px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); min-width: 0; }
        .fm-plan-chip span { display: block; font-size: 0.66rem; letter-spacing: 0.14em; text-transform: uppercase; color: #D9B95B; font-weight: 700; }
        .fm-plan-chip b { display: block; margin-top: 0.15rem; font-size: 0.84rem; font-weight: 600; line-height: 1.4; color: #fff; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

        /* Modules du plan : texte sur toute la largeur, état sous le titre (pas de colonne étroite sur mobile) */
        .fm-module-btn { display: grid; grid-template-columns: 2rem minmax(0, 1fr); column-gap: 0.8rem; row-gap: 0.55rem; align-items: start; text-align: left; }
        .fm-module-btn > div { min-width: 0; overflow-wrap: anywhere; }
        .fm-module-btn .fm-state { grid-column: 2; justify-self: start; margin: 0; }
        @media (min-width: 560px) {
          .fm-module-btn { grid-template-columns: 2rem minmax(0, 1fr) auto; align-items: center; }
          .fm-module-btn .fm-state { grid-column: 3; }
        }

        /* Plan : éditeur en accordéon */
        .fm-pe { display: block; padding: 0; overflow: hidden; border-radius: 16px; border: 1px solid rgba(128,128,128,0.28); background: rgba(128,128,128,0.07); }
        .fm-pe.open { border-color: rgba(212,175,55,0.7); box-shadow: 0 0 0 3px rgba(212,175,55,0.16); }
        .fm-pe-top { width: 100%; display: flex; align-items: flex-start; gap: 0.8rem; padding: 0.85rem; text-align: left; background: transparent; border: 0; color: inherit; }
        .fm-pe-main { flex: 1; min-width: 0; display: grid; gap: 0.15rem; }
        .fm-pe-title { font-weight: 700; line-height: 1.3; overflow-wrap: anywhere; }
        .fm-pe-sum { font-size: 0.8rem; opacity: 0.65; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .fm-pe-new { justify-self: start; font-size: 0.68rem; font-weight: 700; padding: 0.1rem 0.5rem; border-radius: 999px; background: rgba(212,175,55,0.2); color: #9a7a14; }
        .fm-pe-chev { flex: none; font-size: 1.3rem; line-height: 1; opacity: 0.6; transition: transform 0.2s; }
        .fm-pe.open .fm-pe-chev { transform: rotate(180deg); }
        .fm-pe-body { display: grid; gap: 0.2rem; padding: 0.9rem 0.85rem 1rem; border-top: 1px dashed rgba(128,128,128,0.35); }
        .fm-pe-tools { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.4rem; margin-bottom: 0.7rem; }
        .fm-pe-btn { width: auto; min-width: 0; height: auto; min-height: 44px; padding: 0.5rem 0.6rem; font-size: 0.82rem; font-weight: 600; border-radius: 12px; }
        .fm-auto { resize: none; overflow: hidden; line-height: 1.5; min-height: 2.9rem; font-family: inherit; }

        /* Bibliothèque */
        .fm-library { margin-top: 2.2rem; }
        .fm-library-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
        .fm-btn-lib { flex: none; padding: 0.6rem 1rem; border-radius: 999px; font-weight: 700; font-size: 0.85rem; white-space: nowrap; color: inherit; border: 1px solid rgba(212,175,55,0.65); background: rgba(212,175,55,0.1); }
        .fm-cards { display: grid; gap: 0.9rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr)); }
        .fm-fcard { display: flex; flex-direction: column; overflow: hidden; border-radius: 18px; border: 1px solid rgba(128,128,128,0.25); background: rgba(128,128,128,0.08); transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s; }
        .fm-fcard:hover { transform: translateY(-2px); border-color: rgba(212,175,55,0.55); box-shadow: 0 16px 30px -20px rgba(0,0,0,0.7); }
        .fm-fcover { position: relative; display: flex; align-items: flex-end; justify-content: space-between; min-height: 4.4rem; padding: 0.7rem 0.85rem; color: #fff; }
        .fm-fico { font-size: 1.6rem; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4)); }
        .fm-badges { display: flex; gap: 0.3rem; flex-wrap: wrap; justify-content: flex-end; }
        .fm-badge { font-size: 0.66rem; font-weight: 700; letter-spacing: 0.04em; padding: 0.18rem 0.55rem; border-radius: 999px; background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.25); }
        .fm-badge-pub { background: rgba(22,163,74,0.85); border-color: rgba(255,255,255,0.35); }
        .fm-fbody { display: grid; gap: 0.55rem; padding: 0.9rem 1rem 1rem; }
        .fm-ftitle { margin: 0; font-weight: 700; line-height: 1.3; font-size: 1rem; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
        .fm-fmeta { font-size: 0.76rem; opacity: 0.65; }
        .fm-fbar { height: 6px; border-radius: 99px; background: rgba(128,128,128,0.25); overflow: hidden; }
        .fm-fbar i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #c9a227, #f3d777); }
        .fm-factions { display: flex; gap: 0.5rem; }
        .fm-fopen { flex: 1; min-height: 44px; border-radius: 12px; font-weight: 700; color: #0b0b0b; background: linear-gradient(135deg, #f3d777, #d4af37); border: 0; }
        .fm-fopen:disabled { opacity: 0.5; }
        .fm-fmore { flex: none; min-width: 44px; min-height: 44px; border-radius: 12px; font-size: 1.2rem; color: inherit; background: transparent; border: 1px solid rgba(128,128,128,0.4); }
        .fm-fmenu { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .fm-more { width: 100%; margin-top: 0.9rem; padding: 0.8rem; border-radius: 14px; font-weight: 600; color: inherit; border: 1px dashed rgba(128,128,128,0.5); background: transparent; }
        .fm-skel { height: 11rem; border-radius: 18px; background: linear-gradient(90deg, rgba(128,128,128,0.1), rgba(128,128,128,0.2), rgba(128,128,128,0.1)); background-size: 200% 100%; animation: fmshimmer 1.4s linear infinite; }
        @keyframes fmshimmer { to { background-position: -200% 0; } }
        .fm-empty { text-align: center; padding: 2rem 1rem; border-radius: 18px; border: 1px dashed rgba(212,175,55,0.55); background: rgba(212,175,55,0.06); }
        .fm-empty-ico { font-size: 2rem; }
        .fm-empty-title { font-weight: 800; margin-top: 0.3rem; }

        /* Fenêtre « Mes formations » */
        .fm-drawer-bg { position: fixed; inset: 0; z-index: 900; display: flex; align-items: flex-end; justify-content: center; background: rgba(0,0,0,0.62); backdrop-filter: blur(3px); }
        .fm-drawer { width: 100%; max-width: 62rem; height: 94vh; display: flex; flex-direction: column; overflow: hidden; border-radius: 24px 24px 0 0; box-shadow: 0 -20px 60px rgba(0,0,0,0.5); }
        .fm-drawer-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.2rem; border-bottom: 1px solid rgba(128,128,128,0.25); }
        .fm-drawer-title { margin: 0; font-size: 1.15rem; font-weight: 800; }
        .fm-drawer-close { min-width: 44px; min-height: 44px; border-radius: 12px; font-size: 1rem; color: inherit; background: transparent; border: 1px solid rgba(128,128,128,0.4); }
        .fm-drawer-body { flex: 1; overflow-y: auto; padding: 1rem 1.2rem 2rem; -webkit-overflow-scrolling: touch; }
        @media (min-width: 720px) {
          .fm-drawer-bg { align-items: center; padding: 1.5rem; }
          .fm-drawer { height: auto; max-height: 88vh; border-radius: 24px; }
        }

        /* Éditeur de leçon, ressources et aperçu */
        .fm-textarea { border-radius: 14px; min-height: 22rem; line-height: 1.7; font-size: 0.95rem; }
        .fm-res { padding: 0.8rem 2.4rem 0.8rem 0.8rem; border-radius: 14px; border: 1px solid rgba(128,128,128,0.25); background: rgba(128,128,128,0.06); }
        .fm-res .fm-del { top: 0.5rem; right: 0.3rem; }
        .fm-img-open { border-radius: 14px; background: linear-gradient(135deg, rgba(128,128,128,0.12), rgba(128,128,128,0.22)); }
        .fm-processing { display: flex; align-items: center; gap: 0.7rem; padding: 0.85rem 1rem; border-radius: 12px; font-size: 0.9rem; font-weight: 600; border: 1px dashed rgba(212,175,55,0.65); background: rgba(212,175,55,0.08); }
        .fm-spin { flex: none; width: 1.1rem; height: 1.1rem; border-radius: 50%; border: 2px solid rgba(212,175,55,0.35); border-top-color: #D4AF37; animation: fmspin 0.8s linear infinite; }
        @keyframes fmspin { to { transform: rotate(360deg); } }
        .fm-paper { margin-top: 0.4rem; padding: 1.5rem 1.2rem; border-radius: 18px; color: #1a1a1a; background: #fff; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 14px 34px -20px rgba(0,0,0,0.55); }
        .fm-paper-kicker { font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase; color: #b8931f; font-weight: 700; }
        .fm-paper-title { font-size: 1.55rem; line-height: 1.2; font-weight: 800; margin: 0.35rem 0 1rem; color: #0b0b0b; }
        .fm-paper .fm-lesson h2, .fm-paper .fm-lesson h3 { color: #0b0b0b; }
        .fm-paper .fm-lesson p, .fm-paper .fm-lesson li { color: #262626; }
        .fm-paper-sec { margin-top: 1.7rem; padding-top: 1.1rem; border-top: 1px solid rgba(0,0,0,0.08); }
        .fm-paper-h { font-size: 1.05rem; font-weight: 800; margin: 0 0 0.8rem; color: #0b0b0b; }
        .fm-paper-fig { margin: 0 0 1.2rem; }
        .fm-paper-fig img { display: block; width: 100%; height: auto; border-radius: 12px; }
        .fm-paper-fig figcaption { text-align: center; font-size: 0.82rem; color: #666; margin-top: 0.45rem; }
        .fm-paper-video { margin: 0 0 1.2rem; }
        .fm-paper-vtitle { font-weight: 700; margin-bottom: 0.45rem; color: #0b0b0b; }
        .fm-paper-links { padding-left: 1.2rem; }
        .fm-paper-links a, .fm-paper .fm-link { color: #9a7a14; }

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
          .fm-sheet-h2 { font-size: 1.2rem; font-weight: 700; margin: 1.5rem 0 0.6rem; color: #0B0B0B; break-after: avoid; page-break-after: avoid; }
          .fm-sheet .fm-lesson p { font-size: 0.95rem; line-height: 1.7; text-align: justify; color: #222; }
          .fm-sheet .fm-lesson h3 { break-after: avoid; color: #0B0B0B; }

          .fm-sheet-videobox { margin-top: 1.5rem; }
          .fm-sheet-vcard {
            break-inside: avoid; margin: 0 0 6mm; overflow: hidden;
            border: 0.3mm solid #e4d9b0; border-radius: 3mm; background: #fbf8ee;
          }
          .fm-sheet-thumb {
            position: relative; display: block; width: 100%; aspect-ratio: 16 / 9;
            background: linear-gradient(135deg, #15110a, #4a3a0c); text-decoration: none !important;
          }
          .fm-sheet-thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
          .fm-play {
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 16mm; height: 16mm; border-radius: 50%;
            background: rgba(11,11,11,0.78); color: #D4AF37;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.4rem; padding-left: 1mm;
          }
          .fm-sheet-vbody { padding: 4mm 5mm 5mm; }
          .fm-sheet-vtitle { font-weight: 700; font-size: 1rem; color: #0B0B0B; margin-bottom: 2mm; }
          .fm-sheet-btn {
            display: inline-block; padding: 0.5rem 1rem;
            border-radius: 6px; background: #D4AF37; color: #0B0B0B !important;
            font-weight: 700; text-decoration: none !important;
          }
          .fm-sheet-vurl {
            display: block; margin-top: 2.5mm; font-size: 0.78rem; color: #7a6417 !important;
            word-break: break-all; overflow-wrap: anywhere;
          }
          .fm-sheet-res { margin-top: 1rem; }
          .fm-sheet-res ul { padding-left: 1.3rem; }
          .fm-sheet-res li { margin: 0.3rem 0; }
          .fm-sheet-img { margin: 0 0 6mm; break-inside: avoid; text-align: center; }
          .fm-sheet-img img {
            display: block; width: 100%; height: auto; max-height: 232mm;
            object-fit: contain; border-radius: 3mm;
          }
          .fm-sheet-img figcaption { font-size: 0.82rem; color: #666; margin-top: 2mm; text-align: center; }
        }
      `}</style>
    </DashboardLayout>
  );
}
