import { createPortal } from "react-dom";
import { renderMarkdown } from "../utils/markdown.js";

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

function splitTitle(title) {
  const words = String(title || "").trim().split(/\s+/).filter(Boolean);
  if (words.length > 2) {
    const sub = words.pop();
    return { main: words.join(" "), sub };
  }
  return { main: words.join(" "), sub: "" };
}

function Doc({ title, description, sections, prefix }) {
  const chapterSections = sections.filter((s) => s.type === "chapter");
  const conclusionSection = sections.find((s) => s.type === "conclusion");
  const bodySections = sections.filter((s) => s.type !== "conclusion");
  const { main, sub } = splitTitle(title);

  function scrollToSection(id) {
    const el = document.getElementById(`${prefix}${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="ebook-doc">
      {/* PAGE DE TITRE */}
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

          <h1 className="cv-title">{main}</h1>
          {sub && <div className="cv-sub">{sub}</div>}

          <div className="cv-divider">
            <span />
            <i />
            <span />
          </div>

          {description && <p className="cv-desc">{description}</p>}
        </div>
      </section>

      <div className="ebook-flow">
        {/* SOMMAIRE */}
        {chapterSections.length > 0 && (
          <section className="ebook-toc">
            <div className="ebook-section-label">Sommaire</div>
            <ul>
              {chapterSections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${prefix}${s.id}`}
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
          <section
            key={s.id}
            id={`${prefix}${s.id}`}
            className={`ebook-chapter${s.type === "intro" ? " is-intro" : ""}`}
          >
            {s.type === "chapter" && (
              <div className="ebook-chapter-number">
                {chapterSections.findIndex((c) => c.id === s.id) + 1}
              </div>
            )}
            <SectionBody section={s} />
          </section>
        ))}

        {/* CONCLUSION + FIN */}
        <section className="ebook-cta">
          {conclusionSection && <SectionBody section={conclusionSection} />}

          <div className="ebook-end">
            <div className="ebook-cta-center">
              <div className="ebook-cta-box">
                <p className="ebook-cta-title">Merci de votre lecture</p>
                <p className="ebook-cta-text">
                  Cet ouvrage a été conçu et publié avec Digitelio AI — la plateforme qui transforme vos idées en
                  produits digitaux prêts à vendre.
                </p>
              </div>
            </div>

            <footer className="ebook-copyright">
              <p>© {new Date().getFullYear()} — Tous droits réservés.</p>
              <p>Ouvrage généré et édité avec Digitelio AI.</p>
              <p>Toute reproduction, distribution ou revente non autorisée est interdite.</p>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}

/*
  Le livre est affiché 2 fois :
  - une version "aperçu" dans la page (cachée à l'impression) ;
  - une copie placée directement dans <body>, visible seulement à l'impression.
  Ainsi le PDF n'hérite d'aucune marge ni d'aucun espace du tableau de bord.
*/
export default function EbookDocument({ title, description, sections = [], showPreview = true }) {
  const printCopy =
    typeof document !== "undefined"
      ? createPortal(
          <div className="print-only-root">
            <Doc title={title} description={description} sections={sections} prefix="p-" />
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <DocStyle />
      {showPreview && <Doc title={title} description={description} sections={sections} prefix="v-" />}
      {printCopy}
    </>
  );
}

function DocStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Manrope:wght@300;400;600;700&family=Inter:wght@400;500&display=swap');

      :root {
        --digi-ink: #0B0B0B;
        --digi-ivory: #F5F5F2;
        --digi-gold: #D4AF37;
      }

      .print-only-root { display: none; }

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

      /* ----- Couverture ----- */
      .ebook-cover {
        position: relative;
        overflow: hidden;
        min-height: 80vh;
        background: #0B0B0B;
        color: #F5F0E1;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 2rem 1.5rem;
        box-sizing: border-box;
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
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .cv-ribbon-tl  { top: 8%;  left: -20%; transform: rotate(-42deg); }
      .cv-ribbon-tl2 { top: 12%; left: -24%; transform: rotate(-42deg); opacity: 0.45; }
      .cv-ribbon-br  { bottom: 8%;  right: -20%; transform: rotate(-42deg); }
      .cv-ribbon-br2 { bottom: 12%; right: -24%; transform: rotate(-42deg); opacity: 0.45; }

      .cv-inner {
        position: relative;
        z-index: 1;
        max-width: 85%;
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
      .cv-divider { display: flex; align-items: center; gap: 10px; margin: 0.6rem 0; }
      .cv-divider i {
        width: 9px; height: 9px; background: var(--digi-gold); transform: rotate(45deg);
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

      /* ----- Sommaire ----- */
      .ebook-toc { padding: 3rem 1.5rem 1rem; max-width: 42rem; margin: 0 auto; }
      .ebook-toc ul { list-style: none; padding: 0; margin: 0; }
      .ebook-toc li {
        border-bottom: 1px solid #e3e0d8;
        font-family: 'Manrope', sans-serif;
        font-weight: 600;
        font-size: 1rem;
      }
      .dg-toc-link {
        display: flex; align-items: center; gap: 0.9rem;
        padding: 0.9rem 0; text-decoration: none;
      }
      .dg-toc-num {
        flex: none; width: 1.8rem; height: 1.8rem; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 0.85rem;
        background: var(--digi-gold); color: #0B0B0B;
      }
      .no-print-color { color: inherit; }

      /* ----- Chapitres ----- */
      .ebook-chapter { padding: 2.5rem 1.5rem; max-width: 42rem; margin: 0 auto; }
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
      }
      .ebook-body h3 {
        font-family: 'Manrope', sans-serif;
        font-weight: 700;
        font-size: 1.05rem;
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
      .ebook-body ul { margin: 1rem 0; padding-left: 1.4rem; }
      .ebook-body li { margin: 0.4rem 0; line-height: 1.7; }

      .ebook-illustration { margin: 1.4rem 0; border-radius: 8px; overflow: hidden; }
      .ebook-illustration img { display: block; width: 100%; height: auto; }

      /* ----- Fin du livre ----- */
      .ebook-cta {
        display: flex;
        flex-direction: column;
        min-height: 60vh;
        padding: 3rem 1.5rem 2rem;
        max-width: 42rem;
        margin: 0 auto;
        box-sizing: border-box;
      }
      .ebook-end { flex: 1; display: flex; flex-direction: column; }
      .ebook-cta-center { flex: 1; display: flex; align-items: center; justify-content: center; }
      .ebook-cta-box {
        border: 1.5px solid var(--digi-gold);
        border-radius: 4px;
        padding: 2rem;
        max-width: 28rem;
        text-align: center;
      }
      .ebook-cta-title {
        font-family: 'Cinzel', serif; font-weight: 700; font-size: 1.2rem; margin-bottom: 1rem;
      }
      .ebook-cta-text {
        font-family: 'Inter', sans-serif; font-size: 0.9rem; color: #555; line-height: 1.8;
      }
      .ebook-copyright {
        margin-top: auto; padding-top: 1rem; text-align: center;
        font-size: 0.78rem; color: #666; line-height: 1.8;
      }
      .ebook-copyright p { margin: 0; }

      /* ===== IMPRESSION PDF ===== */
      @page { size: A4; margin: 0; }

      @media print {
        /* On n'imprime QUE la copie du livre placée dans <body> */
        body > *:not(.print-only-root) { display: none !important; }
        .print-only-root { display: block !important; }

        html, body {
          background: #fff !important;
          margin: 0 !important;
          padding: 0 !important;
          height: auto !important;
          overflow: visible !important;
        }
        .print-only-root .ebook-doc { background: #fff; }

        /* Couverture : une page exacte, bord à bord */
        .print-only-root .ebook-cover {
          height: 296mm;
          min-height: 0;
          width: 100%;
          padding: 0;
          break-after: page;
          page-break-after: always;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* Marges haut/bas répétées sur chaque page du contenu */
        .print-only-root .ebook-flow {
          padding: 14mm 0;
          -webkit-box-decoration-break: clone;
          box-decoration-break: clone;
        }
        .print-only-root .ebook-toc,
        .print-only-root .ebook-chapter,
        .print-only-root .ebook-cta {
          max-width: none;
          margin: 0;
          padding: 0 16mm;
          min-height: 0;
          display: block;
        }
        .print-only-root .ebook-toc { padding-bottom: 6mm; }
        .print-only-root .ebook-chapter { margin-top: 12mm; }
        .print-only-root .ebook-chapter.is-intro { margin-top: 6mm; }
        /* Pour remettre chaque chapitre sur une nouvelle page, ajoutez dans la règle ci-dessus :
           break-before: page; page-break-before: always; */

        .ebook-chapter-number { break-after: avoid; margin-bottom: 0; }
        .ebook-body h2,
        .ebook-body h3 { break-after: avoid; page-break-after: avoid; }
        .ebook-body p { orphans: 3; widows: 3; }

        .ebook-body table { width: 100%; border-collapse: collapse; }
        .ebook-body thead { display: table-header-group; }
        .ebook-body tr,
        .ebook-body blockquote,
        .ebook-body li { break-inside: avoid; page-break-inside: avoid; }

        .ebook-illustration { break-inside: avoid; margin: 8mm 0; }
        .ebook-illustration img { max-height: 120mm; object-fit: contain; margin: 0 auto; }

        /* Dernière page : pas de hauteur forcée, donc pas de page blanche */
        .print-only-root .ebook-end {
          display: block;
          margin-top: 12mm;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .print-only-root .ebook-cta-center { display: flex; justify-content: center; padding-bottom: 8mm; }
        .ebook-cta-box { break-inside: avoid; }
      }
    `}</style>
  );
    }
