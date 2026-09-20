import { renderMarkdown } from "../utils/markdown.js";

/* true = chaque module commence sur une nouvelle page (avec des espaces vides si le module est court)
   false = les modules s'enchaînent sans page vide (recommandé) */
const MODULE_PER_PAGE = false;

function youtubeId(url) {
  const m = (url || "").match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/
  );
  return m ? m[1] : null;
}

/* Charge les polices AVANT l'impression (elles sont sinon ignorées car le document est caché) */
async function ensureFonts() {
  if (!document.fonts || !document.fonts.load) return;
  const sample = "AaÉéèêàçÔô0123456789";
  const loads = [
    "700 1em Cinzel",
    "400 1em Cinzel",
    "300 1em Manrope",
    "600 1em Manrope",
    "700 1em Manrope",
    "400 1em Inter",
    "500 1em Inter",
    "700 1em Inter",
  ].map((f) => document.fonts.load(f, sample));
  await Promise.race([
    Promise.allSettled(loads),
    new Promise((resolve) => setTimeout(resolve, 4000)),
  ]);
}

/* Lance l'impression de la formation complète */
export async function printFormation() {
  await ensureFonts();

  const style = document.createElement("style");
  style.textContent = `
    @page { size: A4; margin: 16mm 18mm; }
    @page full { size: A4; margin: 0; }
  `;
  document.body.appendChild(style);
  document.body.classList.add("printing-formation");

  const cleanup = () => {
    document.body.classList.remove("printing-formation");
    style.remove();
    window.removeEventListener("afterprint", cleanup);
    document.removeEventListener("pointerdown", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  document.addEventListener("pointerdown", cleanup);

  setTimeout(() => window.print(), 300);
}

export default function FormationDoc({ formation }) {
  const all = formation.modules || [];
  const year = new Date().getFullYear();

  const t = formation.title || "";
  const titleSize =
    t.length > 70 ? "1.6rem" : t.length > 50 ? "1.9rem" : t.length > 30 ? "2.2rem" : "2.6rem";

  return (
    <div className="fx-doc">
      {/* COUVERTURE */}
      <section className="fx-cover">
        <div className="fx-ribbon fx-tl" />
        <div className="fx-ribbon fx-tl2" />
        <div className="fx-ribbon fx-br" />
        <div className="fx-ribbon fx-br2" />
        <div className="fx-cover-inner">
          <div className="fx-brand">DIGITELIO AI</div>
          <div className="fx-editions">
            <span />
            <em>ÉDITIONS</em>
            <span />
          </div>
          <h1 className="fx-cover-title" style={{ fontSize: titleSize }}>
            {formation.title}
          </h1>
          <div className="fx-cover-sub">FORMATION</div>
          <div className="fx-divider">
            <span />
            <i />
            <span />
          </div>
          {formation.description && <p className="fx-cover-desc">{formation.description}</p>}
        </div>
      </section>

      {/* SOMMAIRE */}
      <section className="fx-toc">
        <div className="fx-label">Sommaire</div>
        <ul>
          {all.map((m, i) => (
            <li key={m.id}>
              <span className="fx-toc-icon">◆</span>
              <div>
                <div className="fx-toc-title">
                  Module {i + 1} : {m.title}
                </div>
                {m.summary && <div className="fx-toc-sum">{m.summary}</div>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* MODULES */}
      {all.map((m, i) => {
        if (!(m.content || "").trim()) return null;
        const yt = youtubeId(m.video_url);
        const res = (m.resources || []).filter((r) => r.label && r.url);
        return (
          <section key={m.id} className={`fx-module${MODULE_PER_PAGE ? " fx-newpage" : ""}`}>
            <div className="fx-head">
              <div className="fx-num">{i + 1}</div>
              <h2 className="fx-title">{m.title}</h2>
            </div>
            <div className="fx-lesson" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />

            {m.video_url && (
              <div className="fx-video">
                <h3 className="fx-h3">Vidéo de la leçon</h3>
                {yt && (
                  <a className="fx-thumb" href={m.video_url} target="_blank" rel="noreferrer">
                    <img src={`https://img.youtube.com/vi/${yt}/hqdefault.jpg`} alt="Miniature de la vidéo" />
                    <span className="fx-play">▶</span>
                  </a>
                )}
                <a className="fx-btn" href={m.video_url} target="_blank" rel="noreferrer">
                  ▶ Regarder la vidéo de la leçon
                </a>
              </div>
            )}

            {res.length > 0 && (
              <div className="fx-res">
                <h3 className="fx-h3">Ressources</h3>
                <ul>
                  {res.map((r, k) => (
                    <li key={k}>
                      <a href={r.url} target="_blank" rel="noreferrer">
                        {r.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        );
      })}

      {/* DERNIÈRE PAGE */}
      <section className="fx-end">
        <div className="fx-end-center">
          <div className="fx-end-box">
            <p className="fx-end-title">Merci de votre suivi</p>
            <p className="fx-end-text">
              Cette formation a été conçue et publiée avec Digitelio AI, la plateforme qui transforme vos idées en produits digitaux prêts à vendre.
            </p>
          </div>
        </div>
        <footer className="fx-copy">
          <p>© {year} — Tous droits réservés.</p>
          <p>Formation générée et éditée avec Digitelio AI.</p>
          <p>Toute reproduction, distribution ou revente non autorisée est interdite.</p>
        </footer>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Manrope:wght@300;400;600;700&family=Inter:wght@400;500;600;700&display=swap');

        .fx-doc { display: none; }

        @media print {
          .printing-formation .fm-sheet { display: none !important; }
          .printing-formation .fx-doc {
            display: block !important;
            background: #fff;
            color: #111;
            font-family: 'Inter', sans-serif;
          }
          .printing-formation .fx-doc,
          .printing-formation .fx-doc * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .printing-formation html,
          .printing-formation body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          /* Neutralise la mise en page du dashboard autour du document */
          .printing-formation *:has(.fx-doc) {
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

          /* ===== COUVERTURE (pleine page, sans marge) ===== */
          .fx-cover {
            page: full;
            position: relative;
            overflow: hidden;
            height: 296mm;
            background: #0B0B0B;
            color: #F5F0E1;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            break-after: page;
            page-break-after: always;
          }
          .fx-cover::before {
            content: "";
            position: absolute;
            inset: 0;
            opacity: 0.14;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          }
          .fx-ribbon {
            position: absolute;
            width: 75%;
            height: 2px;
            background: linear-gradient(90deg, transparent, #D4AF37, transparent);
            box-shadow: 0 0 14px rgba(212,175,55,0.8);
          }
          .fx-tl  { top: 8%;  left: -20%; transform: rotate(-42deg); }
          .fx-tl2 { top: 12%; left: -24%; transform: rotate(-42deg); opacity: 0.45; }
          .fx-br  { bottom: 8%;  right: -20%; transform: rotate(-42deg); }
          .fx-br2 { bottom: 12%; right: -24%; transform: rotate(-42deg); opacity: 0.45; }
          .fx-cover-inner {
            position: relative;
            z-index: 1;
            max-width: 78%;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5mm;
          }
          .fx-brand {
            font-family: 'Manrope', sans-serif;
            font-weight: 600;
            font-size: 1.4rem;
            letter-spacing: 0.22em;
            color: #D4AF37;
          }
          .fx-editions {
            display: flex;
            align-items: center;
            gap: 14px;
            color: #D4AF37;
            font-family: 'Manrope', sans-serif;
            font-size: 0.7rem;
            letter-spacing: 0.5em;
          }
          .fx-editions em { font-style: normal; margin-right: -0.5em; }
          .fx-editions span, .fx-divider span {
            display: block;
            width: 60px;
            height: 1px;
            background: #D4AF37;
          }
          .fx-cover-title {
            font-family: 'Cinzel', serif;
            font-weight: 700;
            line-height: 1.2;
            text-transform: uppercase;
            margin: 10mm 0 0;
            color: #E0BC4A;
            text-shadow: 0 0 16px rgba(212,175,55,0.25);
          }
          .fx-cover-sub {
            font-family: 'Cinzel', serif;
            font-weight: 400;
            font-size: 1.5rem;
            letter-spacing: 0.6em;
            margin-right: -0.6em;
            color: #fff;
          }
          .fx-divider { display: flex; align-items: center; gap: 10px; margin: 3mm 0; }
          .fx-divider i {
            width: 9px; height: 9px; background: #D4AF37; transform: rotate(45deg);
          }
          .fx-cover-desc {
            font-family: 'Manrope', sans-serif;
            font-weight: 300;
            font-size: 0.95rem;
            line-height: 1.7;
            color: #fff;
            max-width: 85%;
            margin: 0;
          }

          /* ===== SOMMAIRE ===== */
          .fx-toc { padding: 0; }
          .fx-label {
            font-family: 'Manrope', sans-serif;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            font-size: 0.8rem;
            color: #D4AF37;
            margin-bottom: 1rem;
          }
          .fx-toc ul { list-style: none; padding: 0; margin: 0; }
          .fx-toc li {
            display: flex;
            gap: 0.75rem;
            align-items: flex-start;
            padding: 0.7rem 0;
            border-bottom: 1px solid #e3e0d8;
            break-inside: avoid;
          }
          .fx-toc-icon { color: #D4AF37; font-size: 0.7rem; margin-top: 0.35rem; }
          .fx-toc-title { font-family: 'Manrope', sans-serif; font-weight: 600; font-size: 1rem; }
          .fx-toc-sum { font-size: 0.82rem; color: #666; margin-top: 0.2rem; line-height: 1.5; }

          /* ===== MODULES : enchaînés sans page vide ===== */
          .fx-module {
            padding: 0;
            margin-top: 14mm;
            break-before: auto;
          }
          .fx-module.fx-newpage {
            margin-top: 0;
            break-before: page;
            page-break-before: always;
          }
          /* numéro + titre restent toujours avec le début du texte */
          .fx-head {
            break-inside: avoid;
            break-after: avoid;
          }
          .fx-num {
            font-family: 'Cinzel', serif;
            font-weight: 700;
            font-size: 3.6rem;
            color: #D4AF37;
            opacity: 0.35;
            line-height: 1;
            margin-bottom: -0.9rem;
          }
          .fx-title {
            font-family: 'Cinzel', serif;
            font-weight: 700;
            font-size: 1.5rem;
            margin: 0 0 0.8rem;
            color: #0B0B0B;
            break-after: avoid;
          }
          .fx-lesson h2, .fx-lesson h3 {
            font-family: 'Manrope', sans-serif;
            font-weight: 700;
            color: #0B0B0B;
            break-after: avoid;
          }
          .fx-lesson h2 { font-size: 1.15rem; margin: 1rem 0 0.4rem; }
          .fx-lesson h3 { font-size: 1.05rem; margin: 1rem 0 0.35rem; }
          .fx-lesson p {
            font-size: 0.92rem;
            line-height: 1.6;
            margin: 0.6rem 0;
            text-align: justify;
            color: #222;
            orphans: 3;
            widows: 3;
          }
          /* « Voici les points clés : » reste avec sa liste */
          .fx-lesson p:has(+ ul),
          .fx-lesson p:has(+ ol) { break-after: avoid; }
          .fx-lesson ul { padding-left: 1.3rem; margin: 0.5rem 0; }
          .fx-lesson li { margin: 0.25rem 0; line-height: 1.55; font-size: 0.92rem; break-inside: avoid; }

          .fx-h3 {
            font-family: 'Manrope', sans-serif;
            font-weight: 700;
            font-size: 1.05rem;
            margin: 1.1rem 0 0.5rem;
            color: #0B0B0B;
            break-after: avoid;
          }
          .fx-video { break-inside: avoid; }
          .fx-thumb {
            position: relative;
            display: block;
            width: 100%;
            max-width: 68mm;
            aspect-ratio: 16 / 9;
            border-radius: 6px;
            overflow: hidden;
            text-decoration: none !important;
          }
          /* recadrage 16/9 : supprime les bandes noires de la miniature YouTube */
          .fx-thumb img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .fx-play {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 12mm; height: 12mm; border-radius: 50%;
            background: rgba(11,11,11,0.75);
            color: #D4AF37;
            display: flex; align-items: center; justify-content: center;
            font-size: 1rem; padding-left: 1mm;
          }
          .fx-btn {
            display: inline-block;
            margin-top: 0.5rem;
            padding: 0.5rem 0.95rem;
            border-radius: 6px;
            background: #D4AF37;
            color: #0B0B0B !important;
            font-family: 'Inter', sans-serif;
            font-weight: 700;
            font-size: 0.9rem;
            text-decoration: none !important;
          }
          .fx-res { break-inside: avoid; }
          .fx-res ul { padding-left: 1.3rem; margin: 0; }
          .fx-res li { margin: 0.25rem 0; }
          .fx-res a { color: #9a7a14; text-decoration: underline; }

          /* ===== DERNIÈRE PAGE (pleine page, sans marge) ===== */
          .fx-end {
            page: full;
            height: 296mm;
            box-sizing: border-box;
            padding: 16mm 18mm 12mm;
            display: flex;
            flex-direction: column;
            break-before: page;
            page-break-before: always;
            page-break-inside: avoid;
          }
          .fx-end-center { flex: 1; display: flex; align-items: center; justify-content: center; }
          .fx-end-box {
            border: 1.5px solid #D4AF37;
            border-radius: 4px;
            padding: 2.5rem;
            max-width: 30rem;
            text-align: center;
          }
          .fx-end-title {
            font-family: 'Cinzel', serif;
            font-weight: 700;
            font-size: 1.3rem;
            margin: 0 0 1rem;
          }
          .fx-end-text { font-size: 0.9rem; color: #555; line-height: 1.8; margin: 0; }
          .fx-copy {
            margin-top: auto;
            text-align: center;
            font-size: 0.8rem;
            color: #666;
            line-height: 1.8;
          }
          .fx-copy p { margin: 0; }
        }
      `}</style>
    </div>
  );
}
