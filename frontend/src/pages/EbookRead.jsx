import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { renderMarkdown } from "../utils/markdown.js";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

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

export default function EbookRead() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`${API}/api/read/${token}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Lien d'accès invalide.");
        if (alive) {
          setData(json);
          document.title = `${json.ebook.title} | Digitelio AI`;
        }
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
  }, [token]);

  if (loading) {
    return (
      <div className="er-root">
        <p className="er-center">Chargement...</p>
        <ErStyle />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="er-root">
        <div className="er-center">
          <div className="er-brand">DIGITELIO AI</div>
          <h1 className="er-title" style={{ fontSize: "1.3rem" }}>Accès indisponible</h1>
          <p className="er-muted">{error || "Ce lien d'accès n'est pas valide."}</p>
        </div>
        <ErStyle />
      </div>
    );
  }

  const b = data.ebook;
  const sections = b.sections || [];
  const chapterSections = sections.filter((s) => s.type === "chapter");
  const conclusionSection = sections.find((s) => s.type === "conclusion");
  const bodySections = sections.filter((s) => s.type !== "conclusion");

  function scrollToSection(sectionId) {
    const el = document.getElementById(`sec-${sectionId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="er-root">
      <div className="no-print er-toolbar">
        <div className="er-toolbar-inner">
          <span className="er-hello">Bonjour {data.buyer_name || ""}</span>
          <button className="er-cta er-cta-small" onClick={() => window.print()}>
            📄 Télécharger en PDF
          </button>
        </div>
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
              const words = (b.title || "").trim().split(/\s+/);
              if (words.length > 2) words.pop();
              return words.join(" ");
            })()}</h1>
            {(() => {
              const words = (b.title || "").trim().split(/\s+/);
              const sub = words.length > 2 ? words[words.length - 1] : "";
              return sub && <div className="cv-sub">{sub}</div>;
            })()}

            <div className="cv-divider">
              <span />
              <i />
              <span />
            </div>

            {b.description && <p className="cv-desc">{b.description}</p>}
          </div>
        </section>

        {/* SOMMAIRE */}
        {chapterSections.length > 0 && (
          <section className="ebook-toc">
            <div className="ebook-section-label">Sommaire</div>
            <ul>
              {chapterSections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#sec-${s.id}`}
                    className="dg-toc-link no-print-color"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(s.id);
                    }}
                  >
                    <span className="dg-toc-num">{i + 1}</span>
                    <span>{s.title.replace(/^Chapitre\s*\d+\s*:\s*/i, "")}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* INTRODUCTION + CHAPITRES */}
        {bodySections.map((s) => (
          <section key={s.id} id={`sec-${s.id}`} className={`ebook-chapter${s.type === "intro" ? " is-intro" : ""}`}>
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

      <ErStyle />
    </div>
  );
}

function ErStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Manrope:wght@300;400;600;700&family=Inter:wght@400;500&display=swap');

      :root {
        --digi-ink: #0B0B0B;
        --digi-ivory: #F5F5F2;
        --digi-gold: #D4AF37;
      }

      .er-root {
        min-height: 100vh;
        background: var(--digi-ivory);
        color: var(--digi-ink);
        font-family: 'Inter', sans-serif;
      }
      .er-center { text-align: center; margin: 30vh auto 0; }
      .er-muted { opacity: 0.7; }
      .er-brand {
        text-align: center; font-weight: 600; font-size: 1.1rem; letter-spacing: 0.22em; color: #D4AF37;
        font-family: 'Manrope', sans-serif;
      }
      .er-title {
        font-family: 'Cinzel', serif; font-weight: 700; margin: 1rem 0 0.5rem; color: #0B0B0B;
      }

      .er-toolbar {
        position: sticky; top: 0; z-index: 10;
        background: #0B0B0B; padding: 0.9rem 1.2rem;
        box-shadow: 0 2px 10px rgba(0,0,0,0.15);
      }
      .er-toolbar-inner {
        max-width: 46rem; margin: 0 auto;
        display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
      }
      .er-hello {
        color: #F5F0E1; font-family: 'Manrope', sans-serif; font-weight: 600; font-size: 0.9rem;
      }
      .er-cta {
        display: inline-block; padding: 0.7rem 1.2rem; border-radius: 10px;
        background: #D4AF37; color: #0B0B0B; font-weight: 700; font-size: 0.9rem; border: 0;
        cursor: pointer; font-family: inherit;
      }
      .er-cta-small { padding: 0.6rem 1rem; font-size: 0.85rem; }

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

      .ebook-cover {
        position: relative;
        overflow: hidden;
        min-height: 100vh;
        background: #0B0B0B;
        color: #F5F0E1;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 2rem 1.5rem;
        box-sizing: border-box;
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
        max-width: 90%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }
      .cv-brand {
        font-family: 'Manrope', sans-serif;
        font-weight: 600;
        font-size: 1.2rem;
        letter-spacing: 0.22em;
        color: var(--digi-gold);
      }
      .cv-editions {
        display: flex;
        align-items: center;
        gap: 14px;
        color: var(--digi-gold);
        font-family: 'Manrope', sans-serif;
        font-size: 0.65rem;
        letter-spacing: 0.5em;
      }
      .cv-editions em { font-style: normal; margin-right: -0.5em; }
      .cv-editions span,
      .cv-divider span {
        display: block;
        width: 50px;
        height: 1px;
        background: var(--digi-gold);
      }
      .cv-title {
        font-family: 'Cinzel', serif;
        font-weight: 700;
        font-size: 2.4rem;
        line-height: 1.1;
        text-transform: uppercase;
        margin: 1.5rem 0 0;
        background: linear-gradient(180deg, #F6E27A 0%, #D4AF37 50%, #8C6D1F 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        color: transparent;
      }
      .cv-sub {
        font-family: 'Cinzel', serif;
        font-weight: 400;
        font-size: 1.3rem;
        text-transform: uppercase;
        letter-spacing: 0.5em;
        margin-right: -0.5em;
        color: #fff;
      }
      .cv-divider {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0.6rem 0;
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
        font-size: 0.9rem;
        line-height: 1.7;
        color: #fff;
        max-width: 90%;
        margin: 0;
      }

      .ebook-toc {
        padding: 3rem 1.5rem;
        max-width: 40rem;
        margin: 0 auto;
      }
      .ebook-toc ul { list-style: none; padding: 0; margin: 0; }
      .ebook-toc li {
        border-bottom: 1px solid #e3e0d8;
        font-family: 'Manrope', sans-serif;
        font-weight: 600;
        font-size: 1rem;
      }
      .dg-toc-link {
        display: flex; align-items: center; gap: 0.9rem;
        padding: 0.9rem 0;
        text-decoration: none;
      }
      .dg-toc-num {
        flex: none; width: 1.8rem; height: 1.8rem; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 0.85rem;
        background: var(--digi-gold); color: #0B0B0B;
      }
      .no-print-color { color: inherit; }

      .ebook-chapter {
        padding: 2.5rem 1.5rem;
        max-width: 40rem;
        margin: 0 auto;
      }
      .ebook-chapter-number {
        font-family: 'Cinzel', serif;
        font-weight: 700;
        font-size: 4rem;
        color: var(--digi-gold);
        opacity: 0.35;
        line-height: 1;
        margin-bottom: -1rem;
      }
      .ebook-body h2 {
        font-family: 'Cinzel', serif;
        font-weight: 700;
        font-size: 1.5rem;
        margin: 0 0 1.5rem;
        color: var(--digi-ink);
        break-after: avoid;
      }
      .ebook-body h3 {
        font-family: 'Manrope', sans-serif;
        font-weight: 700;
        font-size: 1.05rem;
        margin-top: 1.8rem;
        color: var(--digi-ink);
        break-after: avoid;
      }
      .ebook-body p {
        font-family: 'Inter', sans-serif;
        font-size: 0.98rem;
        line-height: 1.9;
        margin: 1.1rem 0;
        text-align: justify;
        color: #222;
        orphans: 3;
        widows: 3;
      }
      .ebook-body ul {
        margin: 1rem 0;
        padding-left: 1.4rem;
      }
      .ebook-body li { margin: 0.4rem 0; line-height: 1.7; }

      .ebook-illustration {
        margin: 1.4rem 0;
        border-radius: 8px;
        overflow: hidden;
      }
      .ebook-illustration img { display: block; width: 100%; height: auto; }

      .ebook-cta {
        display: flex;
        flex-direction: column;
        min-height: 60vh;
        padding: 3rem 1.5rem 2rem;
        max-width: 40rem;
        margin: 0 auto;
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
        padding: 2rem;
        max-width: 28rem;
        text-align: center;
      }
      .ebook-cta-title {
        font-family: 'Cinzel', serif;
        font-weight: 700;
        font-size: 1.2rem;
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
        font-size: 0.78rem;
        color: #666;
        line-height: 1.8;
      }
      .ebook-copyright p { margin: 0; }

      /* ===== IMPRESSION PDF ===== */
      @page { margin: 14mm 0; }
      @page cover { margin: 0; }

      @media print {
        .no-print, .er-toolbar, header, aside { display: none !important; }
        html, body, #root, main {
          height: auto !important;
          overflow: visible !important;
          background: white;
        }
        .er-root, .ebook-doc { background: white; min-height: 0; }

        .ebook-cover {
          page: cover;
          height: 296mm;
          min-height: 0;
          padding: 0;
          break-after: page;
          page-break-after: always;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .cv-ribbon {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .ebook-toc,
        .ebook-chapter,
        .ebook-cta {
          max-width: none;
          margin: 0;
          padding-left: 3rem;
          padding-right: 3rem;
          padding-top: 0;
          padding-bottom: 0;
        }
        .ebook-chapter {
          break-before: page;
          page-break-before: always;
        }
        .ebook-chapter-number { margin-bottom: 0; }

        .ebook-cta {
          min-height: 255mm;
          break-before: page;
          page-break-before: always;
        }

        .ebook-body div,
        .ebook-body table { break-inside: auto !important; }
        .ebook-body table { width: 100%; border-collapse: collapse; }
        .ebook-body thead { display: table-header-group; }
        .ebook-body tr,
        .ebook-body blockquote,
        .ebook-body li { break-inside: avoid !important; }

        .ebook-illustration { break-inside: avoid; margin: 8mm 0; }
        .ebook-illustration img { max-height: 120mm; object-fit: contain; }
      }
    `}</style>
  );
}
