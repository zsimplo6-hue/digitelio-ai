import { createPortal } from "react-dom";
import { renderMarkdown } from "../utils/markdown.js";
import { TEMPLATES, themeVars } from "../utils/templates.js";

const UI = {
  fr: { toc: "Sommaire", thanks: "Merci de votre lecture", editions: "ÉDITIONS", by: "Par", rights: "Tous droits réservés.", made: "Ouvrage généré et édité avec", noCopy: "Toute reproduction, distribution ou revente non autorisée est interdite.", thanksText: "Cet ouvrage a été conçu et publié avec Digitelio AI — la plateforme qui transforme vos idées en produits digitaux prêts à vendre." },
  en: { toc: "Contents", thanks: "Thank you for reading", editions: "EDITIONS", by: "By", rights: "All rights reserved.", made: "Book generated and edited with", noCopy: "Any unauthorized reproduction, distribution or resale is prohibited.", thanksText: "This book was designed and published with Digitelio AI — the platform that turns your ideas into ready-to-sell digital products." },
  es: { toc: "Índice", thanks: "Gracias por su lectura", editions: "EDICIONES", by: "Por", rights: "Todos los derechos reservados.", made: "Obra generada y editada con", noCopy: "Queda prohibida toda reproducción, distribución o reventa no autorizada.", thanksText: "Esta obra fue creada y publicada con Digitelio AI, la plataforma que convierte tus ideas en productos digitales listos para vender." },
  pt: { toc: "Sumário", thanks: "Obrigado pela sua leitura", editions: "EDIÇÕES", by: "Por", rights: "Todos os direitos reservados.", made: "Obra gerada e editada com", noCopy: "É proibida qualquer reprodução, distribuição ou revenda não autorizada.", thanksText: "Esta obra foi criada e publicada com o Digitelio AI, a plataforma que transforma as suas ideias em produtos digitais prontos para vender." },
  de: { toc: "Inhalt", thanks: "Vielen Dank fürs Lesen", editions: "AUSGABEN", by: "Von", rights: "Alle Rechte vorbehalten.", made: "Erstellt und herausgegeben mit", noCopy: "Jede unerlaubte Vervielfältigung, Verbreitung oder der Weiterverkauf ist untersagt.", thanksText: "Dieses Buch wurde mit Digitelio AI erstellt und veröffentlicht – der Plattform, die Ihre Ideen in verkaufsfertige digitale Produkte verwandelt." },
  it: { toc: "Indice", thanks: "Grazie per la lettura", editions: "EDIZIONI", by: "Di", rights: "Tutti i diritti riservati.", made: "Opera generata e curata con", noCopy: "È vietata qualsiasi riproduzione, distribuzione o rivendita non autorizzata.", thanksText: "Quest'opera è stata creata e pubblicata con Digitelio AI, la piattaforma che trasforma le tue idee in prodotti digitali pronti da vendere." },
  ar: { toc: "المحتويات", thanks: "شكرًا لقراءتكم", editions: "إصدارات", by: "بقلم", rights: "جميع الحقوق محفوظة.", made: "أُعدّ هذا الكتاب وحُرّر باستخدام", noCopy: "يُمنع أي نسخ أو توزيع أو إعادة بيع دون إذن.", thanksText: "تم إعداد هذا الكتاب ونشره باستخدام Digitelio AI، المنصة التي تحوّل أفكارك إلى منتجات رقمية جاهزة للبيع." },
};

const CHAPTER_PREFIX = /^(chapitre|chapter|capítulo|kapitel|capitolo|الفصل)\s*\d+\s*[:：\-–]\s*/i;

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

function Doc({ title, description, sections, prefix, template, brand, language }) {
  const t = TEMPLATES[template] || TEMPLATES.finance;
  const ui = UI[language] || UI.fr;
  const rtl = language === "ar";
  const vars = themeVars(template, brand);
  if (rtl) {
    vars["--h-font"] = "'Noto Naskh Arabic', serif";
    vars["--b-font"] = "'Noto Naskh Arabic', serif";
  }

  const chapterSections = sections.filter((s) => s.type === "chapter");
  const conclusionSection = sections.find((s) => s.type === "conclusion");
  const bodySections = sections.filter((s) => s.type !== "conclusion");
  const { main, sub } = splitTitle(title);
  const owner = brand.author_name || brand.brand_name || "";

  function scrollToSection(id) {
    const el = document.getElementById(`${prefix}${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div
      className="ebook-doc"
      dir={rtl ? "rtl" : "ltr"}
      data-cover={t.layout.cover}
      data-ribbons={t.layout.ribbons ? "1" : "0"}
      data-upper={t.layout.upper ? "1" : "0"}
      data-chapter={t.layout.chapter}
      style={vars}
    >
      {/* PAGE DE TITRE */}
      <section className="ebook-cover">
        <div className="cv-ribbon cv-ribbon-tl" />
        <div className="cv-ribbon cv-ribbon-tl2" />
        <div className="cv-ribbon cv-ribbon-br" />
        <div className="cv-ribbon cv-ribbon-br2" />

        <div className="cv-inner">
          <div className="cv-brand">{brand.brand_name || "DIGITELIO AI"}</div>
          <div className="cv-editions">
            <span />
            <em>{ui.editions}</em>
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
          {brand.tagline && <div className="cv-slogan">{brand.tagline}</div>}
          {brand.author_name && (
            <div className="cv-author">
              {ui.by} {brand.author_name}
            </div>
          )}
        </div>
      </section>

      <div className="ebook-flow">
        {/* SOMMAIRE */}
        {chapterSections.length > 0 && (
          <section className="ebook-toc">
            <div className="ebook-section-label">{ui.toc}</div>
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
                    <span>{s.title.replace(CHAPTER_PREFIX, "")}</span>
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
                <p className="ebook-cta-title">{ui.thanks}</p>
                {!brand.brand_name && <p className="ebook-cta-text">{ui.thanksText}</p>}
                {brand.brand_name && brand.tagline && <p className="ebook-cta-text">{brand.tagline}</p>}
              </div>
            </div>

            <footer className="ebook-copyright">
              <p>
                © {new Date().getFullYear()} — {owner ? `${owner}. ` : ""}
                {ui.rights}
              </p>
              <p>{ui.made} Digitelio AI.</p>
              <p>{ui.noCopy}</p>
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
*/
export default function EbookDocument({
  title,
  description,
  sections = [],
  showPreview = true,
  template = "finance",
  brand = {},
  language = "fr",
}) {
  const props = { title, description, sections, template, brand, language };
  const printCopy =
    typeof document !== "undefined"
      ? createPortal(
          <div className="print-only-root">
            <Doc {...props} prefix="p-" />
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <DocStyle template={template} ar={language === "ar"} />
      {showPreview && <Doc {...props} prefix="v-" />}
      {printCopy}
    </>
  );
}

function DocStyle({ template, ar }) {
  const t = TEMPLATES[template] || TEMPLATES.finance;
  const fonts = `${t.fonts}${ar ? "&family=Noto+Naskh+Arabic:wght@400;700" : ""}`;
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?${fonts}&display=swap');

      .print-only-root { display: none; }

      .ebook-doc {
        font-family: var(--b-font);
        color: var(--text);
        background: var(--paper);
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .ebook-section-label {
        font-family: var(--b-font);
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        font-size: 0.8rem;
        color: var(--accent);
        margin-bottom: 1.5rem;
      }

      /* ----- Couverture ----- */
      .ebook-cover {
        position: relative;
        overflow: hidden;
        min-height: 80vh;
        background: var(--cover-bg);
        color: var(--cover-ink);
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
        opacity: 0.08;
        pointer-events: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      }
      .cv-ribbon {
        display: none;
        position: absolute;
        width: 75%;
        height: 2px;
        background: linear-gradient(90deg, transparent, var(--accent), transparent);
        box-shadow: 0 0 14px var(--accent);
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .ebook-doc[data-ribbons="1"] .cv-ribbon { display: block; }
      .cv-ribbon-tl  { top: 8%;  left: -20%; transform: rotate(-42deg); }
      .cv-ribbon-tl2 { top: 12%; left: -24%; transform: rotate(-42deg); opacity: 0.45; }
      .cv-ribbon-br  { bottom: 8%;  right: -20%; transform: rotate(-42deg); }
      .cv-ribbon-br2 { bottom: 12%; right: -24%; transform: rotate(-42deg); opacity: 0.45; }

      /* variante : texte à gauche avec barre d'accent */
      .ebook-doc[data-cover="left"] .ebook-cover { justify-content: flex-start; text-align: left; }
      .ebook-doc[data-cover="left"] .cv-inner { align-items: flex-start; margin-left: 14%; max-width: 72%; }
      .ebook-doc[data-cover="left"] .ebook-cover::after {
        content: ""; position: absolute; left: 8%; top: 12%; bottom: 12%; width: 4px; background: var(--accent);
      }
      .ebook-doc[data-cover="left"] .cv-editions span:first-child,
      .ebook-doc[data-cover="left"] .cv-divider span:first-child { display: none; }
      .ebook-doc[dir="rtl"][data-cover="left"] .ebook-cover { justify-content: flex-start; text-align: right; }

      /* variante : cadre fin */
      .ebook-doc[data-cover="frame"] .ebook-cover::after {
        content: ""; position: absolute; inset: 5%; border: 1.5px solid var(--accent); pointer-events: none;
      }

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
        font-family: var(--b-font);
        font-weight: 700;
        font-size: 1.1rem;
        letter-spacing: 0.22em;
        color: var(--accent);
      }
      .cv-editions {
        display: flex;
        align-items: center;
        gap: 14px;
        color: var(--accent);
        font-family: var(--b-font);
        font-size: 0.65rem;
        letter-spacing: 0.5em;
      }
      .cv-editions em { font-style: normal; margin-right: -0.5em; }
      .cv-editions span,
      .cv-divider span {
        display: block;
        width: 50px;
        height: 1px;
        background: var(--accent);
      }
      .cv-title {
        font-family: var(--h-font);
        font-weight: 700;
        font-size: 2.4rem;
        line-height: 1.12;
        margin: 1.5rem 0 0;
        background: var(--title-bg);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        color: transparent;
      }
      .ebook-doc[data-upper="1"] .cv-title { text-transform: uppercase; }
      .cv-sub {
        font-family: var(--h-font);
        font-weight: 400;
        font-size: 1.3rem;
        text-transform: uppercase;
        letter-spacing: 0.5em;
        margin-right: -0.5em;
        color: var(--cover-sub);
      }
      .cv-divider { display: flex; align-items: center; gap: 10px; margin: 0.6rem 0; }
      .cv-divider i {
        width: 9px; height: 9px; background: var(--accent); transform: rotate(45deg);
      }
      .cv-desc {
        font-family: var(--b-font);
        font-weight: 400;
        font-size: 0.9rem;
        line-height: 1.7;
        color: var(--cover-ink);
        opacity: 0.88;
        max-width: 90%;
        margin: 0;
      }
      .cv-slogan {
        font-family: var(--b-font);
        font-style: italic;
        font-size: 0.95rem;
        line-height: 1.5;
        color: var(--cover-sub);
        max-width: 85%;
      }
      .cv-author {
        font-family: var(--b-font);
        font-size: 0.85rem;
        letter-spacing: 0.1em;
        color: var(--cover-sub);
        margin-top: 0.4rem;
      }

      /* ----- Sommaire ----- */
      .ebook-toc { padding: 3rem 1.5rem 1rem; max-width: 42rem; margin: 0 auto; }
      .ebook-toc ul { list-style: none; padding: 0; margin: 0; }
      .ebook-toc li {
        border-bottom: 1px solid rgba(128,128,128,0.25);
        font-family: var(--b-font);
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
        background: var(--accent); color: var(--on-accent);
      }
      .no-print-color { color: inherit; }

      /* ----- Chapitres ----- */
      .ebook-chapter { padding: 2.5rem 1.5rem; max-width: 42rem; margin: 0 auto; }
      .ebook-chapter-number {
        font-family: var(--h-font);
        font-weight: 700;
        color: var(--accent);
        line-height: 1;
      }
      .ebook-doc[data-chapter="big"] .ebook-chapter-number { font-size: 4rem; opacity: 0.35; margin-bottom: -1rem; }
      .ebook-doc[data-chapter="small"] .ebook-chapter-number { font-size: 0.9rem; letter-spacing: 0.3em; margin-bottom: 0.5rem; }
      .ebook-doc[data-chapter="small"] .ebook-chapter-number::before { content: "— "; }
      .ebook-doc[data-chapter="small"] .ebook-chapter-number::after { content: " —"; }
      .ebook-doc[data-chapter="badge"] .ebook-chapter-number {
        width: 2.6rem; height: 2.6rem; border-radius: 50%; background: var(--accent); color: var(--on-accent);
        display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 0.8rem;
      }
      .ebook-body h2 {
        font-family: var(--h-font);
        font-weight: 700;
        font-size: 1.6rem;
        line-height: 1.25;
        margin: 0 0 1.5rem;
        color: var(--ink);
      }
      .ebook-doc[data-upper="1"] .ebook-body h2 { text-transform: uppercase; letter-spacing: 0.02em; font-size: 1.4rem; }
      .ebook-body h3 {
        font-family: var(--b-font);
        font-weight: 700;
        font-size: 1.05rem;
        margin-top: 1.8rem;
        color: var(--ink);
      }
      .ebook-body p {
        font-family: var(--b-font);
        font-size: 0.98rem;
        line-height: 1.9;
        margin: 1.1rem 0;
        text-align: var(--p-align);
        color: var(--text);
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
        border: 1.5px solid var(--accent);
        border-radius: 4px;
        padding: 2rem;
        max-width: 28rem;
        text-align: center;
      }
      .ebook-cta-title {
        font-family: var(--h-font); font-weight: 700; font-size: 1.2rem; margin-bottom: 1rem; color: var(--ink);
      }
      .ebook-cta-text { font-family: var(--b-font); font-size: 0.9rem; color: #555; line-height: 1.8; margin: 0; }
      .ebook-copyright {
        margin-top: auto; padding-top: 1rem; text-align: center;
        font-size: 0.78rem; color: #666; line-height: 1.8;
      }
      .ebook-copyright p { margin: 0; }

      /* ----- Droite à gauche (arabe) ----- */
      .ebook-doc[dir="rtl"] .ebook-body p { text-align: right; }
      .ebook-doc[dir="rtl"] .ebook-body ul,
      .ebook-doc[dir="rtl"] .ebook-body ol { padding-left: 0 !important; padding-right: 1.5rem !important; }
      .ebook-doc[dir="rtl"] .ebook-body blockquote {
        border-left: 0 !important; border-right: 4px solid var(--accent) !important;
        border-radius: 8px 0 0 8px !important;
      }
      .ebook-doc[dir="rtl"] .ebook-body th { text-align: right !important; }
      .ebook-doc[dir="rtl"] .cv-sub,
      .ebook-doc[dir="rtl"] .cv-editions,
      .ebook-doc[dir="rtl"] .cv-brand,
      .ebook-doc[dir="rtl"] .ebook-section-label,
      .ebook-doc[dir="rtl"] .cv-author { letter-spacing: 0; margin-right: 0; }
      .ebook-doc[dir="rtl"] .cv-editions em { margin-right: 0; }

      /* ===== IMPRESSION PDF ===== */
      @page { size: A4; margin: 0; }

      @media print {
        body > *:not(.print-only-root) { display: none !important; }
        .print-only-root { display: block !important; }

        html, body {
          background: #fff !important;
          margin: 0 !important;
          padding: 0 !important;
          height: auto !important;
          overflow: visible !important;
        }

        .print-only-root .ebook-cover {
          height: 296mm;
          min-height: 0;
          width: 100%;
          padding: 0;
         break-after: page;
          page-break-after: always;
        }

        .print-only-root .ebook-flow {
          padding: 14mm 0;
          background: var(--paper);
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
        /* Pour un chapitre par page, ajoutez dans la règle .ebook-chapter ci-dessus :
           break-before: page; page-break-before: always; */

        .ebook-chapter-number { break-after: avoid; }
        .ebook-doc[data-chapter="big"] .ebook-chapter-number { margin-bottom: 0; }
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
