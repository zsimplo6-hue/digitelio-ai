import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { renderMarkdown, extractChapterTitles } from "../utils/markdown.js";

/* ---------- Helpers pour la page de titre ---------- */

function splitDescription(desc = "") {
  const text = desc.trim();
  const m = text.match(/^(.*?)[\s.]+((?:Cet|Ce|Cette|Ces)\s+(?:ebook|e-book|livre|guide|ouvrage)\b[\s\S]*)$/i);
  if (m) return { tagline: m[1].trim(), description: m[2].trim() };
  const s = text.match(/^(.*?[.!?])\s+([\s\S]+)$/);
  if (s) return { tagline: s[1].trim(), description: s[2].trim() };
  return { tagline: text, description: "" };
}

function renderTagline(tagline) {
  const re = /(?:créer|produire|maîtriser|réaliser|créez)\s+(?:des|de|du|la|le|les|l['’])\s*/i;
  const start = tagline.match(re);
  if (!start) return tagline;
  const from = start.index + start[0].length;
  const rest = tagline.slice(from);
  const end = rest.search(/\s+(?:avec|grâce|en|sans|pour)\b/i);
  const phrase = end === -1 ? rest : rest.slice(0, end);
  const after = end === -1 ? "" : rest.slice(end);
  return (
    <>
      {tagline.slice(0, from)}
      <b>{phrase}</b>
      {after}
    </>
  );
}

function renderDescription(text) {
  const parts = text.split(/(\b[\w-]+\.(?:ai|com|io|app|co)\b)/gi);
  return parts.map((p, i) => (i % 2 === 1 ? <b key={i}>{p}</b> : p));
}

export default function EbookPreview() {
  const { id } = useParams();
  const [ebook, setEbook] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchEbook() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ebooks/${id}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur de chargement.");
        setEbook(data.ebook);
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

  const chapterTitles = extractChapterTitles(ebook.content);
  const rawChapters = ebook.content.split(/^## /m).slice(1);

  // La conclusion est déplacée sur la dernière page
  const conclusionIdx = rawChapters.findIndex((r) => /^Conclusion/i.test(r));
  const conclusionHtml =
    conclusionIdx >= 0 ? renderMarkdown("## " + rawChapters[conclusionIdx]) : "";

  const words = (ebook.title || "").trim().split(/\s+/);
  const subtitle = words.length > 2 ? words.pop() : "";
  const mainTitle = words.join(" ");
  const { tagline, description } = splitDescription(ebook.description || "");

  return (
    <DashboardLayout>
      <div className="no-print mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{ebook.title}</h1>
        <button onClick={() => window.print()} className="btn-primary">
          Télécharger en PDF
        </button>
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

            <h1 className="cv-title">{mainTitle}</h1>
            {subtitle && <div className="cv-sub">{subtitle}</div>}

            <div className="cv-divider">
              <span />
              <i />
              <span />
            </div>

            {tagline && <p className="cv-tagline">{renderTagline(tagline)}</p>}
            {description && <p className="cv-desc">{renderDescription(description)}</p>}
          </div>
        </section>

        {/* SOMMAIRE */}
        {chapterTitles.length > 0 && (
          <section className="ebook-toc">
            <div className="ebook-section-label">Sommaire</div>
            <ul>
              {chapterTitles.map((t, i) => (
                <li key={i}>
                  <span className="ebook-toc-icon">◆</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CHAPITRES */}
        {rawChapters.map((raw, i) => {
          if (i === conclusionIdx) return null;

          const isIntro = /^Introduction/i.test(raw);
          const html = renderMarkdown("## " + raw);
          const label = isIntro ? "" : `${i}`;

          return (
            <section key={i} className={`ebook-chapter${isIntro ? " is-intro" : ""}`}>
              {!isIntro && <div className="ebook-chapter-number">{label}</div>}
              <div className="ebook-body" dangerouslySetInnerHTML={{ __html: html }} />
            </section>
          );
        })}

        {/* DERNIÈRE PAGE : CONCLUSION + REMERCIEMENT + COPYRIGHT EN BAS */}
        <section className="ebook-cta">
          {conclusionHtml && (
            <div className="ebook-body" dangerouslySetInnerHTML={{ __html: conclusionHtml }} />
          )}

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
        .cv-tagline {
          font-family: 'Manrope', sans-serif;
          font-weight: 300;
          font-size: 1.2rem;
          line-height: 1.5;
          color: #fff;
          margin: 0;
        }
        .cv-tagline b,
        .cv-desc b {
          color: var(--digi-gold);
          font-weight: 600;
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

        /* ===== IMPRESSION PDF ===== */
        @media print {
          @page { size: A4; margin: 0; }

          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }

          .no-print, header, aside { display: none !important; }

          /* Neutralise la mise en page du dashboard autour de l'ebook */
          *:has(#ebook-print-area) {
            display: block !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            width: auto !important;
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            border: 0 !important;
            background: transparent !important;
            transform: none !important;
          }

          .ebook-doc { background: #fff; width: 100%; }

          /* Couverture et dernière page : une page A4 exacte */
          .ebook-cover, .ebook-cta {
            height: 296mm;
            min-height: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .cv-ribbon {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Sommaire + introduction sur la même page */
          .ebook-toc { padding: 12mm 3rem 4mm; }
          .ebook-chapter {
            padding: 10mm 3rem 6mm;
            -webkit-box-decoration-break: clone;
            box-decoration-break: clone;
          }
          .ebook-chapter.is-intro {
            page-break-before: auto;
            break-before: auto;
            padding-top: 4mm;
          }
          .ebook-cta { padding: 10mm 3rem 8mm; }

          /* Texte un peu plus compact à l'impression */
          .ebook-chapter-number { font-size: 3.6rem; }
          .ebook-body h2 { font-size: 1.45rem; margin-bottom: 0.8rem; break-after: avoid; }
          .ebook-body h3 { break-after: avoid; }
          .ebook-body p {
            font-size: 0.9rem;
            line-height: 1.62;
            margin: 0.7rem 0;
          }
        }
      `}</style>
    </DashboardLayout>
  );
      }
