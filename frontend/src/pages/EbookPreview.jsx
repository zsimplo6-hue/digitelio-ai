import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";
import CoverMockup from "../components/CoverMockup.jsx";
import EbookDocument from "../components/EbookDocument.jsx";
import { renderMarkdown } from "../utils/markdown.js";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

/* Nettoie la description pour la couverture : pas de symboles, pas de consignes de style, longueur limitée */
function cleanForCover(text, title = "", max = 240) {
  let t = String(text || "");
  t = t.split(/style\s+souhait[ée]/i)[0];
  t = t.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "");
  t = t.replace(/[#*_`>]+/g, " ");
  t = t.replace(/(^|\s)[-•]\s+/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  const ti = String(title || "").trim();
  if (ti && t.toLowerCase().startsWith(ti.toLowerCase())) {
    t = t.slice(ti.length).replace(/^[\s:,.\-–]+/, "");
  }
  if (t.length > max) {
    t = t.slice(0, max);
    const cut = t.lastIndexOf(" ");
    if (cut > 120) t = t.slice(0, cut);
    t = t.replace(/[\s,;:.\-–]+$/, "") + "…";
  }
  return t;
}

function compressImage(file, maxW = 1200, quality = 0.82) {
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

function SectionBody({ section }) {
  return (
    <div className="ebook-body">
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown("## " + section.title) }} />
      {section.image && (
        <div className="ebook-illustration">
          <img src={section.image} alt="" />
        </div>
      )}
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content || "") }} />
    </div>
  );
}

/* ---------- Éditeur d'une partie (intro, chapitre ou conclusion) ---------- */
function SectionEditor({ ebookId, section, onChange }) {
  const [content, setContent] = useState(section.content || "");
  const [image, setImage] = useState(section.image || "");
  const [tab, setTab] = useState("edit");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function save() {
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch(`${API}/api/ebooks/${ebookId}/sections/${section.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, image }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'enregistrement.");
      onChange(data.section);
      setMsg("Partie enregistrée ✓");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function onImageFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    if (!file.type.startsWith("image/")) {
      setErr("Choisissez une image (JPG, PNG ou WebP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErr("Image trop lourde (10 Mo maximum).");
      return;
    }
    try {
      let data = await compressImage(file, 1200, 0.82);
      if (data.length > 850000) data = await compressImage(file, 900, 0.6);
      setImage(data);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  const previewSection = { ...section, content, image };

  return (
    <Card className="no-print" title={`Édition : ${section.title}`}>
      <div className="dg-editor-tabs">
        <button className={`dg-editor-tab ${tab === "edit" ? "is-active" : ""}`} onClick={() => setTab("edit")}>
          Éditer
        </button>
        <button className={`dg-editor-tab ${tab === "preview" ? "is-active" : ""}`} onClick={() => setTab("preview")}>
          Aperçu réel
        </button>
      </div>

      {tab === "edit" ? (
        <textarea
          className="dg-field__input dg-textarea-lg"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Texte de cette partie (Markdown : ### Titre, - puce)..."
        />
      ) : (
        <div style={{ background: "#F5F5F2", borderRadius: 12, padding: "1.5rem" }}>
          <SectionBody section={previewSection} />
        </div>
      )}

      <div>
        <label className="dg-field__label">Image d'illustration</label>
        {image ? (
          <div className="dg-cover-box" style={{ marginTop: 8 }}>
            <img src={image} alt="Illustration" />
          </div>
        ) : (
          <div className="dg-cover-box dg-cover-box--empty" style={{ marginTop: 8 }}>Aucune image</div>
        )}
        <div className="dg-cover-actions">
          <label className="dg-chip">
            {image ? "Changer l'image" : "+ Ajouter une image"}
            <input type="file" accept="image/*" onChange={onImageFile} hidden />
          </label>
          {image && (
            <button type="button" className="dg-chip" onClick={() => setImage("")}>
              Retirer
            </button>
          )}
        </div>
      </div>

      {err && <div className="dg-alert dg-alert--error">{err}</div>}
      {msg && <div className="dg-alert dg-alert--success">{msg}</div>}

      <Button variant="primary" size="lg" onClick={save} disabled={saving} style={{ width: "100%" }}>
        {saving ? "Enregistrement..." : "💾 Enregistrer"}
      </Button>
    </Card>
  );
}

/* ---------- Page principale ---------- */
export default function EbookPreview() {
  const { id } = useParams();
  const [ebook, setEbook] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchEbook() {
      try {
        const res = await fetch(`${API}/api/ebooks/${id}`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur de chargement.");
        setEbook(data.ebook);
        setSections(data.ebook.sections || []);
      } catch (err) {
        setError(err.message);
      }
    }
    fetchEbook();
  }, [id]);

  if (error) {
    return (
      <DashboardLayout title="eBook">
        <div className="dg-alert dg-alert--error">{error}</div>
      </DashboardLayout>
    );
  }

  if (!ebook) {
    return (
      <DashboardLayout title="eBook">
        <p className="dg-page__subtitle">Chargement...</p>
      </DashboardLayout>
    );
  }

  function patchSection(patch) {
    setSections((list) => list.map((s) => (s.id === patch.id ? { ...s, ...patch } : s)));
  }

  function patchEbook(patch) {
    setEbook((e) => ({ ...e, ...patch }));
  }

  const activeSection = sections.find((s) => s.id === activeId);
  const coverDesc = ebook.tagline ? ebook.tagline : cleanForCover(ebook.description, ebook.title);

  return (
    <DashboardLayout>
      <div
        className="no-print"
        style={{ marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
      >
        <h1 className="text-2xl font-bold">{ebook.title}</h1>
        <div className="dg-export-group">
          <Button variant="primary" onClick={() => window.print()}>📄 Télécharger en PDF</Button>
        </div>
      </div>
      <p className="dg-helper-text no-print" style={{ marginBottom: 24 }}>
        Dans la fenêtre d'impression, choisissez « Enregistrer au format PDF ». Enregistrez vos modifications avant.
      </p>

      <div className="no-print" style={{ display: "grid", gap: 16, marginBottom: 24 }}>
        <Card title="Plan de l'eBook">
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
            {sections.map((s) => (
              <li key={s.id}>
                <button
                  className={`dg-plan-item ${s.id === activeId ? "is-active" : ""}`}
                  onClick={() => setActiveId(s.id === activeId ? null : s.id)}
                >
                  <span className="dg-plan-item__title">{s.title}</span>
                  {s.image && <span className="dg-plan-item__tag">🖼 Illustrée</span>}
                </button>
              </li>
            ))}
          </ol>
          <p className="dg-helper-text">
            Touchez une partie pour modifier son texte ou ajouter une image d'illustration.
            Enregistrez avant de télécharger le PDF pour inclure vos modifications.
          </p>
        </Card>

        {activeSection && (
          <SectionEditor
            key={activeSection.id}
            ebookId={ebook.id}
            section={activeSection}
            onChange={patchSection}
          />
        )}

        <CoverMockup ebook={ebook} onSaved={patchEbook} />
      </div>

      <EbookDocument title={ebook.title} description={coverDesc} sections={sections} />
    </DashboardLayout>
  );
          }
