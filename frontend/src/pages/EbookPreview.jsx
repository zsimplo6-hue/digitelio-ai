import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { renderMarkdown, extractChapterTitles } from "../utils/markdown.js";

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

  // On découpe le contenu par chapitre pour donner à chacun sa propre page avec grand numéro
  const rawChapters = ebook.content.split(/^## /m).slice(1); // enlève le titre principal avant le 1er "##"
  const introBlock = ebook.content.split(/^## /m)[0] || "";

  return (
    <DashboardLayout>
      <div className="no-print mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{ebook.title}</h1>
        <button onClick={() => window.print()} className="btn-primary">
          Télécharger en PDF
        </button>
      </div>

      <div id="ebook-print-area" className="ebook-doc">
        {/* COUVERTURE */}
        <section className="ebook-cover">
          <div className="ebook-cover-kicker">DIGITELIO AI ÉDITIONS</div>
          <h1 className="ebook-cover-title">{ebook.title}</h1>
          <div className="ebook-cover-rule" />
          <p className="ebook-cover-subtitle">{ebook.description}</p>
        </section>

        {/* PAGE DE COPYRIGHT */}
        <section className="ebook-copyright">
          <p>© {new Date().getFullYear()} — Tous droits réservés.</p>
          <p>Ouvrage généré et édité avec Digitelio AI.</p>
          <p>Toute reproduction, distribution ou revente non autorisée est interdite.</p>
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

        {/* CHAPITRES — chacun sur sa propre page avec un grand numéro */}
        {rawChapters.map((raw, i) => {
          const isIntro = /^Introduction/i.test(raw);
          const isConclusion = /^Conclusion/i.test(raw);
          const html = renderMarkdown("## " + raw);
          const label = isIntro ? "" : isConclusion ? "" : `${i}`;

          return (
            <section key={i} className="ebook-chapter">
              {!isIntro && !isConclusion && <div className="ebook-chapter-number">{label}</div>}
              <div
                className="ebook-body"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </section>
          );
        })}

        {/* APPEL À L'ACTION FINAL */}
        <section className="ebook-cta">
          <div className="ebook-cta-box">
            <p className="ebook-cta-title">Merci de votre lecture</p>
            <p className="ebook-cta-text">
              Cet ouvrage a été conçu et publié avec Digitelio AI — la plateforme qui transforme vos idées en produits digitaux prêts à vendre.
            </p>
          </div>
        </section>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Manrope:wght@600;700&family=Inter:wght@400;500&display=swap');

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

        /* COUVERTURE */
        .ebook-cover {
          background: var(--digi-ink);
          color: var(--digi-ivory);
          min-height: 90vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 4rem 2rem;
          page-break-after: always;
        }
        .ebook-cover-kicker {
          font-family: 'Manrope', sans-serif;
          font-weight: 700;
          letter-spacing: 0.25em;
          font-size: 0.75rem;
          color: var(--digi-gold);
          margin-bottom: 2rem;
        }
        .ebook-cover-title {
          font-family: 'Cinzel', serif;
          font-weight: 700;
          font-size: 2.6rem;
          line-height: 1.25;
          max-width: 32rem;
        }
        .ebook-cover-rule {
          width: 60px;
          height: 2px;
          background: var(--digi-gold);
          margin: 2rem auto;
        }
        .ebook-cover-subtitle {
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          font-size: 1rem;
          color: #cfcfcf;
          max-width: 28rem;
          line-height: 1.7;
        }

        /* COPYRIGHT */
        .ebook-copyright {
          padding: 6rem 3rem;
          text-align: center;
          font-size: 0.85rem;
          color: #666;
          line-height: 2;
          page-break-after: always;
        }

        /* SOMMAIRE */
        .ebook-toc {
          padding: 4rem 3rem;
          page-break-after: always;
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

        /* CHAPITRES */
        .ebook-chapter {
          padding: 4rem 3rem;
          page-break-before: always;
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

        /* CTA FINAL */
        .ebook-cta {
          padding: 5rem 3rem;
          page-break-before: always;
          display: flex;
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

        @media print {
          .no-print, header, aside { display: none !important; }
          body { background: white; }
          @page { margin: 0; }
          .ebook-doc { background: white; }
        }
      `}</style>
    </DashboardLayout>
  );
    }
