import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { renderMarkdown } from "../utils/markdown.js";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

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
    <div className="ebx-card no-print">
      <div className="ebx-label">Édition : {section.title}</div>

      <div className="ebx-tabs">
        <button className={tab === "edit" ? "ebx-tab on" : "ebx-tab"} onClick={() => setTab("edit")}>
          Éditer
        </button>
        <button className={tab === "preview" ? "ebx-tab on" : "ebx-tab"} onClick={() => setTab("preview")}>
          Aperçu
        </button>
      </div>

      {tab === "edit" ? (
        <textarea
          className="ebx-input ebx-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Texte de cette partie (Markdown : ### Titre, - puce)..."
        />
      ) : (
        <SectionBody section={previewSection} />
      )}

      <div className="ebx-label" style={{ marginTop: "1.2rem" }}>Image d'illustration</div>
      {image ? (
        <div className="ebx-cover">
          <img src={image} alt="Illustration" />
        </div>
      ) : (
        <div className="ebx-cover ebx-cover-empty">Aucune image</div>
      )}
      <div className="ebx-cover-actions">
        <label className="ebx-chip ebx-file">
          {image ? "Changer l'image" : "+ Ajouter une image"}
          <input type="file" accept="image/*" onChange={onImageFile} hidden />
        </label>
        {image && (
          <button type="button" className="ebx-chip" onClick={() => setImage("")}>
            Retirer
          </button>
        )}
      </div>

      {err && <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{err}</div>}
      {msg && <div className="ebx-ok">{msg}</div>}

      <button className="btn-primary ebx-save" onClick={save} disabled={saving}>
        {saving ? "Enregistrement..." : "💾 Enregistrer"}
      </button>
    </div>
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
        <div className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</div>
      </DashboardLayout>
    );
  }

  if (!ebook) {
    return (
      <DashboardLayout title="eBook">
        <p>Chargement...</p>
      </DashboardLayout>
    );
  }

  function patchSection(patch) {
    setSections((list) => list.map((s) => (s.id === patch.id ? { ...s, ...patch } : s)));
  }

  const chapterSections = sections.filter((s) => s.type === "chapter");
  const conclusionSection = sections.find((s) => s.type === "conclusion");
  const bodySections = sections.filter((s) => s.type !== "conclusion");
  const activeSection = sections.find((s) => s.id === activeId);

  return (
    <DashboardLayout>
      <div className="no-print mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{ebook.title}</h1>
        <button onClick={() => window.print()} className="btn-primary">
          Télécharger en PDF
        </button>
      </div>

      <div className="no-print ebx-wrap">
        <div className="ebx-card">
          <div className="ebx-label">Plan de l'eBook</div>
          <ol className="ebx-list">
            {sections.map((s) => (
              <li key={s.id}>
                <button
                  className={`ebx-item${s.id === activeId ? " active" : ""}`}
                  onClick={() => setActiveId(s.id === activeId ? null : s.id)}
                >
                  <span className="ebx-item-title">{s.title}</span>
                  {s.image && <span className="ebx-tag">🖼 Illustrée</span>}
                </button>
              </li>
            ))}
          </ol>
          <div className="ebx-muted ebx-small">
            Touchez une partie pour modifier son texte ou ajouter une image d'illustration.
            Enregistrez avant de télécharger le PDF pour inclure vos modifications.
          </div>
        </div>

        {activeSection && (
          <SectionEditor
            key={activeSection.id}
            ebookId={ebook.id}
            section={activeSection}
            onChange={patchSection}
          />
        )}
      </div>

      <div id="ebook-print-area" className="ebook-doc">
        {/* PAGE DE TITRE PREMIUM */}
        <section className="ebook-cover">
          <div className="cv-ribbon cv-ribbon-tl" />
          <div className="cv-ribbon cv-ribbon-tl2" />
          <div className="cv-ribbon cv-ribbon-br" />
          <div className="cv-ribbon cv-ribbon-br2" />

          <div className="cv-inner">
            <div className="cv-brand">DIGITELIO AI</div>
            <div className="cv-editions">
              <span />
              <em>ÉDITIONS</em>
              <span />
            </div>

            <h1 className="cv-title">{(() => {
              const words = (ebook.title || "").trim().split(/\s+/);
              const sub = words.length > 2 ? words.pop() : "";
              return words.join(" ");
            })()}</h1>
            {(() => {
              const words = (ebook.title || "").trim().split(/\s+/);
              const sub = words.length > 2 ? words[words.length - 1] : "";
              return sub && <div className="cv-sub">{sub}</div>;
            })()}

            <div className="cv-divider">
              <span />
              <i />
              <span />
            </div>

            {ebook.description && <p className="cv-desc">{ebook.description}</p>}
          </div>
        </section>

        {/* SOMMAIRE */}
        {chapterSections.length > 0 && (
          <section className="ebook-toc">
            <div className="ebook-section-label">Sommaire</div>
            <ul>
              {chapterSections.map((s) => (
                <li key={s.id}>
                  <span className="ebook-toc-icon">◆</span>
                  <span>{s.title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* INTRODUCTION + CHAPITRES */}
        {bodySections.map((s) => (
          <section key={s.id} className={`ebook-chapter${s.type === "intro" ? " is-intro" : ""}`}>
            {s.type === "chapter" && (
              <div className="ebook-chapter-number">
                {chapterSections.findIndex((c) => c.id === s.id) + 1}
              </div>
            )}
            <SectionBody section={s} />
          </section>
        ))}

        {/* DERNIÈRE PAGE */}
        <section className="ebook-cta">
          {conclusionSection && <SectionBody section={conclusionSection} />}

          <div className="ebook-cta-center">
            <div className="ebook-cta-box">
              <p className="ebook-cta-title">Merci de votre lecture</p>
              <p className="ebook-cta-text">
                Cet ouvrage a été conçu et publié avec Digitelio AI — la plateforme qui transforme vos idées en produits digitaux prêts à vendre.
              </p>
            </div>
          </div>

          <footer className="ebook-copyright">
            <p>© {new Date().getFullYear()} — Tous droits réservés.</p>
            <p>Ouvrage généré et édité avec Digitelio AI.</p>
            <p>Toute reproduction, distribution ou revente non autorisée est interdite.</p>
          </footer>
        </section>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Manrope:wght@300;400;600;700&family=Inter:wght@400;500&display=swap');

        :root {
          --digi-ink: #0B0B0B;
          --digi-ivory: #F5F5F2;
          --digi-gold: #D4AF37;
        }

        .ebook-doc {
          font-family: 'Inter', sans-serif;
          color: var(--digi-ink);
          background: var(--digi-ivory);
        }

        .ebook-section-label {
          font-family: 'Manrope', sans-serif;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-size: 0.8rem;
          color: var(--digi-gold);
          margin-bottom: 1.5rem;
        }

        /* ===== PAGE DE TITRE PREMIUM ===== */
        .ebook-cover {
          position: relative;
          overflow: hidden;
          height: 297mm;
          background: #0B0B0B;
          color: #F5F0E1;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          page-break-after: always;
          break-after: page;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .ebook-cover::before {
          content: "";
          position: absolute;
          inset: 0;
          opacity: 0.14;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .cv-ribbon {
          position: absolute;
          width: 75%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #D4AF37, transparent);
          box-shadow: 0 0 14px rgba(212,175,55,0.8);
        }
        .cv-ribbon-tl  { top: 8%;  left: -20%; transform: rotate(-42deg); }
        .cv-ribbon-tl2 { top: 12%; left: -24%; transform: rotate(-42deg); opacity: 0.45; }
        .cv-ribbon-br  { bottom: 8%;  right: -20%; transform: rotate(-42deg); }
        .cv-ribbon-br2 { bottom: 12%; right: -24%; transform: rotate(-42deg); opacity: 0.45; }

        .cv-inner {
          position: relative;
          z-index: 1;
          max-width: 78%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5mm;
        }
        .cv-brand {
          font-family: 'Manrope', sans-serif;
          font-weight: 600;
          font-size: 1.4rem;
          letter-spacing: 0.22em;
          color: var(--digi-gold);
        }
        .cv-editions {
          display: flex;
          align-items: center;
          gap: 14px;
          color: var(--digi-gold);
          font-family: 'Manrope', sans-serif;
          font-size: 0.7rem;
          letter-spacing: 0.5em;
        }
        .cv-editions em { font-style: normal; margin-right: -0.5em; }
        .cv-editions span,
        .cv-divider span {
          display: block;
          width: 60px;
          height: 1px;
          background: var(--digi-gold);
        }
        .cv-title {
          font-family: 'Cinzel', serif;
          font-weight: 700;
          font-size: 3.4rem;
          line-height: 1.08;
          text-transform: uppercase;
          margin: 12mm 0 0;
          background: linear-gradient(180deg, #F6E27A 0%, #D4AF37 50%, #8C6D1F 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .cv-sub {
          font-family: 'Cinzel', serif;
          font-weight: 400;
          font-size: 1.9rem;
          text-transform: uppercase;
          letter-spacing: 0.6em;
          margin-right: -0.6em;
          color: #fff;
        }
        .cv-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 4mm 0;
        }
        .cv-divider i {
          width: 9px;
          height: 9px;
          background: var(--digi-gold);
          transform: rotate(45deg);
        }
        .cv-desc {
          font-family: 'Manrope', sans-serif;
          font-weight: 300;
          font-size: 0.85rem;
          line-height: 1.7;
          color: #fff;
          max-width: 85%;
          margin: 0;
        }

        /* ===== SOMMAIRE ===== */
        .ebook-toc {
          padding: 3rem 3rem;
        }
        .ebook-toc ul { list-style: none; padding: 0; margin: 0; }
        .ebook-toc li {
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
          padding: 0.9rem 0;
          border-bottom: 1px solid #e3e0d8;
          font-family: 'Manrope', sans-serif;
          font-weight: 600;
          font-size: 1rem;
        }
        .ebook-toc-icon { color: var(--digi-gold); font-size: 0.7rem; }

        /* ===== CHAPITRES ===== */
        .ebook-chapter {
          padding: 2.5rem 3rem;
          page-break-before: always;
          break-before: page;
        }
        .ebook-chapter-number {
          font-family: 'Cinzel', serif;
          font-weight: 700;
          font-size: 5rem;
          color: var(--digi-gold);
          opacity: 0.35;
          line-height: 1;
          margin-bottom: -1.5rem;
        }
        .ebook-body h2 {
          font-family: 'Cinzel', serif;
          font-weight: 700;
          font-size: 1.7rem;
          margin: 0 0 1.5rem;
          color: var(--digi-ink);
        }
        .ebook-body h3 {
          font-family: 'Manrope', sans-serif;
          font-weight: 700;
          font-size: 1.1rem;
          margin-top: 1.8rem;
          color: var(--digi-ink);
        }
        .ebook-body p {
          font-family: 'Inter', sans-serif;
          font-size: 0.98rem;
          line-height: 1.9;
          margin: 1.1rem 0;
          text-align: justify;
          color: #222;
        }
        .ebook-body ul {
          margin: 1rem 0;
          padding-left: 1.4rem;
        }
        .ebook-body li { margin: 0.4rem 0; line-height: 1.7; }

        /* Image d'illustration */
        .ebook-illustration {
          margin: 1.4rem 0;
          border-radius: 8px;
          overflow: hidden;
        }
        .ebook-illustration img { display: block; width: 100%; height: auto; }

        /* ===== DERNIÈRE PAGE : CONCLUSION + CTA + COPYRIGHT EN BAS ===== */
        .ebook-cta {
          display: flex;
          flex-direction: column;
          min-height: 297mm;
          padding: 3rem 3rem 2rem;
          page-break-before: always;
          break-before: page;
          page-break-inside: avoid;
          box-sizing: border-box;
        }
        .ebook-cta-center {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ebook-cta-box {
          border: 1.5px solid var(--digi-gold);
          border-radius: 4px;
          padding: 2.5rem;
          max-width: 30rem;
          text-align: center;
        }
        .ebook-cta-title {
          font-family: 'Cinzel', serif;
          font-weight: 700;
          font-size: 1.3rem;
          margin-bottom: 1rem;
        }
        .ebook-cta-text {
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          color: #555;
          line-height: 1.8;
        }
        .ebook-copyright {
          margin-top: auto;
          padding-top: 1rem;
          text-align: center;
          font-size: 0.8rem;
          color: #666;
          line-height: 1.8;
        }
        .ebook-copyright p { margin: 0; }

        /* ===== ÉDITEUR (écran uniquement) ===== */
        .ebx-wrap { display: grid; gap: 1rem; }
        .ebx-card {
          padding: 1.2rem; border-radius: 14px;
          background: rgba(128,128,128,0.10); border: 1px solid rgba(128,128,128,0.25);
        }
        .ebx-label {
          font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #D4AF37; margin-bottom: 0.7rem;
        }
        .ebx-muted { opacity: 0.7; margin-top: 0.8rem; }
        .ebx-small { font-size: 0.82rem; }
        .ebx-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.4rem; }
        .ebx-item {
          width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 0.6rem;
          padding: 0.7rem 0.9rem; border-radius: 10px; text-align: left;
          background: transparent; border: 1px solid transparent; color: inherit; font-family: inherit;
        }
        .ebx-item.active { border-color: #D4AF37; background: rgba(212,175,55,0.08); }
        .ebx-item-title { font-weight: 600; }
        .ebx-tag { font-size: 0.72rem; color: #D4AF37; font-weight: 700; }
        .ebx-tabs { display: flex; gap: 0.5rem; margin-bottom: 0.7rem; }
        .ebx-tab {
          padding: 0.4rem 0.9rem; border-radius: 999px; font-size: 0.85rem;
          border: 1px solid rgba(128,128,128,0.35); background: transparent; color: inherit; font-family: inherit;
        }
        .ebx-tab.on { background: #D4AF37; color: #0B0B0B; border-color: #D4AF37; }
        .ebx-input {
          width: 100%; padding: 0.8rem 1rem; border-radius: 10px; font-size: 1rem;
          background: rgba(128,128,128,0.12); border: 1px solid rgba(128,128,128,0.3);
          color: inherit; outline: none; font-family: inherit;
        }
        .ebx-textarea { min-height: 16rem; line-height: 1.6; font-size: 0.92rem; resize: vertical; }
        .ebx-cover {
          width: 100%; max-width: 20rem; aspect-ratio: 16 / 9; border-radius: 10px; overflow: hidden;
          border: 1px solid rgba(128,128,128,0.3);
        }
        .ebx-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .ebx-cover-empty {
          display: flex; align-items: center; justify-content: center;
          font-size: 0.85rem; opacity: 0.6; border-style: dashed;
        }
        .ebx-cover-actions { display: flex; gap: 0.5rem; margin-top: 0.6rem; }
        .ebx-chip {
          font-size: 0.8rem; padding: 0.35rem 0.7rem; border-radius: 999px; cursor: pointer;
          border: 1px solid rgba(128,128,128,0.35); background: transparent; color: inherit; font-family: inherit;
        }
        .ebx-file { display: inline-block; }
        .ebx-ok { margin-top: 0.8rem; color: #16a34a; font-size: 0.9rem; font-weight: 600; }
        .ebx-save { width: 100%; margin-top: 1.2rem; padding: 0.85rem; border-radius: 10px; font-weight: 600; }

        @media print {
          .no-print, header, aside { display: none !important; }
          body { background: white; }
          @page { margin: 0; }
          .ebook-doc { background: white; }
          .ebook-cover, .cv-ribbon {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .ebook-illustration { break-inside: avoid; margin: 8mm 0; }
          .ebook-illustration img { max-height: 130mm; object-fit: cover; }
        }
      `}</style>
    </DashboardLayout>
  );
      }
