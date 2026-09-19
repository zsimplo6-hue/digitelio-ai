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
  const bodyHtml = renderMarkdown(ebook.content);

  return (
    <DashboardLayout>
      <div className="no-print mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{ebook.title}</h1>
        <button onClick={() => window.print()} className="btn-primary">
          Télécharger en PDF
        </button>
      </div>

      <div id="ebook-print-area" className="ebook-page">
        <div className="ebook-cover">
          <h1>{ebook.title}</h1>
          <p className="ebook-subtitle">{ebook.description}</p>
          <p className="ebook-brand">Créé avec Digitelio AI</p>
        </div>

        {chapterTitles.length > 0 && (
          <div className="ebook-toc">
            <h2>Sommaire</h2>
            <ul>
              {chapterTitles.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="ebook-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </div>

      <style>{`
        .ebook-page { font-family: Georgia, 'Times New Roman', serif; color: #1a1a2e; }
        .ebook-cover {
          text-align: center;
          padding: 4rem 2rem;
          border-bottom: 2px solid #ddd;
          margin-bottom: 2rem;
        }
        .ebook-cover h1 { font-size: 2.2rem; margin-bottom: 1rem; }
        .ebook-subtitle { font-size: 1.1rem; color: #555; }
        .ebook-brand { margin-top: 2rem; font-size: 0.85rem; color: #888; letter-spacing: 0.05em; }
        .ebook-toc { page-break-after: always; padding: 1rem 0 3rem; }
        .ebook-toc ul { list-style: none; padding: 0; }
        .ebook-toc li { padding: 0.5rem 0; border-bottom: 1px dotted #ccc; }
        .ebook-body h2 { font-size: 1.6rem; margin-top: 2.5rem; page-break-before: always; }
        .ebook-body h3 { font-size: 1.2rem; margin-top: 1.5rem; }
        .ebook-body p { line-height: 1.8; margin: 1rem 0; text-align: justify; }
        .ebook-body ul { margin: 1rem 0; padding-left: 1.5rem; }

        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          @page { margin: 2cm; }
        }
      `}</style>
    </DashboardLayout>
  );
      }
