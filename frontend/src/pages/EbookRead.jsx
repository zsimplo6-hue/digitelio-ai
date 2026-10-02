import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import EbookDocument from "../components/EbookDocument.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

const BTN = {
  fr: { hello: "Bonjour", pdf: "Télécharger en PDF" },
  en: { hello: "Hello", pdf: "Download as PDF" },
  es: { hello: "Hola", pdf: "Descargar en PDF" },
  pt: { hello: "Olá", pdf: "Baixar em PDF" },
  de: { hello: "Hallo", pdf: "Als PDF herunterladen" },
  it: { hello: "Ciao", pdf: "Scarica in PDF" },
  ar: { hello: "مرحبًا", pdf: "تنزيل بصيغة PDF" },
};

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
  const lang = b.language || "fr";
  const txt = BTN[lang] || BTN.fr;

  return (
    <div className="er-root">
      <div className="no-print er-toolbar">
        <div className="er-toolbar-inner" dir={lang === "ar" ? "rtl" : "ltr"}>
          <span className="er-hello">
            {txt.hello} {data.buyer_name || ""}
          </span>
          <button className="er-cta er-cta-small" onClick={() => window.print()}>
            📄 {txt.pdf}
          </button>
        </div>
      </div>

      <EbookDocument
        title={b.title}
        description={b.description}
        sections={b.sections || []}
        template={b.template || "finance"}
        brand={b.brand || {}}
        language={lang}
      />

      <ErStyle />
    </div>
  );
}

function ErStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Manrope:wght@300;400;600;700&family=Inter:wght@400;500&display=swap');

      .er-root {
        min-height: 100vh;
        background: #F5F5F2;
        color: #0B0B0B;
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
    `}</style>
  );
         }
