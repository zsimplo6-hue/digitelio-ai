import { renderMarkdown } from "../utils/markdown.js";
import {
  FORMATION_TEMPLATES,
  formationThemeVars,
  formationFontsImport,
} from "../utils/formationTemplates.js";

/* true = chaque module commence sur une nouvelle page (avec des espaces vides si le module est court)
   false = les modules s'enchaînent sans page vide (recommandé) */
const MODULE_PER_PAGE = false;

const FX = {
  fr: { by: "Par", editions: "ÉDITIONS", sub: "FORMATION", toc: "Sommaire", module: "Module", video: "Vidéo de la leçon", watch: "▶ Regarder la vidéo de la leçon", thumb: "Miniature de la vidéo", res: "Ressources", thanks: "Merci de votre suivi", thanksText: "Cette formation a été conçue et publiée avec Digitelio AI, la plateforme qui transforme vos idées en produits digitaux prêts à vendre.", rights: "Tous droits réservés.", made: "Formation générée et éditée avec Digitelio AI.", noCopy: "Toute reproduction, distribution ou revente non autorisée est interdite." },
  en: { by: "By", editions: "EDITIONS", sub: "COURSE", toc: "Contents", module: "Module", video: "Lesson video", watch: "▶ Watch the lesson video", thumb: "Video thumbnail", res: "Resources", thanks: "Thank you for following", thanksText: "This course was designed and published with Digitelio AI, the platform that turns your ideas into ready-to-sell digital products.", rights: "All rights reserved.", made: "Course generated and edited with Digitelio AI.", noCopy: "Any unauthorized reproduction, distribution or resale is prohibited." },
  es: { by: "Por", editions: "EDICIONES", sub: "CURSO", toc: "Índice", module: "Módulo", video: "Vídeo de la lección", watch: "▶ Ver el vídeo de la lección", thumb: "Miniatura del vídeo", res: "Recursos", thanks: "Gracias por seguir el curso", thanksText: "Este curso fue creado y publicado con Digitelio AI, la plataforma que convierte tus ideas en productos digitales listos para vender.", rights: "Todos los derechos reservados.", made: "Curso generado y editado con Digitelio AI.", noCopy: "Queda prohibida toda reproducción, distribución o reventa no autorizada." },
  pt: { by: "Por", editions: "EDIÇÕES", sub: "CURSO", toc: "Sumário", module: "Módulo", video: "Vídeo da aula", watch: "▶ Assistir ao vídeo da aula", thumb: "Miniatura do vídeo", res: "Recursos", thanks: "Obrigado por acompanhar", thanksText: "Este curso foi criado e publicado com o Digitelio AI, a plataforma que transforma as suas ideias em produtos digitais prontos para vender.", rights: "Todos os direitos reservados.", made: "Curso gerado e editado com o Digitelio AI.", noCopy: "É proibida qualquer reprodução, distribuição ou revenda não autorizada." },
  de: { by: "Von", editions: "AUSGABEN", sub: "KURS", toc: "Inhalt", module: "Modul", video: "Lektionsvideo", watch: "▶ Lektionsvideo ansehen", thumb: "Video-Vorschaubild", res: "Ressourcen", thanks: "Danke fürs Mitmachen", thanksText: "Dieser Kurs wurde mit Digitelio AI erstellt und veröffentlicht – der Plattform, die Ihre Ideen in verkaufsfertige digitale Produkte verwandelt.", rights: "Alle Rechte vorbehalten.", made: "Kurs erstellt und herausgegeben mit Digitelio AI.", noCopy: "Jede unerlaubte Vervielfältigung, Verbreitung oder der Weiterverkauf ist untersagt." },
  it: { by: "Di", editions: "EDIZIONI", sub: "CORSO", toc: "Indice", module: "Modulo", video: "Video della lezione", watch: "▶ Guarda il video della lezione", thumb: "Anteprima del video", res: "Risorse", thanks: "Grazie per aver seguito il corso", thanksText: "Questo corso è stato creato e pubblicato con Digitelio AI, la piattaforma che trasforma le tue idee in prodotti digitali pronti da vendere.", rights: "Tutti i diritti riservati.", made: "Corso generato e curato con Digitelio AI.", noCopy: "È vietata qualsiasi riproduzione, distribuzione o rivendita non autorizzata." },
  ar: { by: "بقلم", editions: "إصدارات", sub: "دورة", toc: "المحتويات", module: "الوحدة", video: "فيديو الدرس", watch: "▶ شاهد فيديو الدرس", thumb: "صورة مصغرة للفيديو", res: "الموارد", thanks: "شكرًا لمتابعتكم", thanksText: "تم إعداد هذه الدورة ونشرها باستخدام Digitelio AI، المنصة التي تحوّل أفكارك إلى منتجات رقمية جاهزة للبيع.", rights: "جميع الحقوق محفوظة.", made: "أُعدّت هذه الدورة وحُرّرت باستخدام Digitelio AI.", noCopy: "يُمنع أي نسخ أو توزيع أو إعادة بيع دون إذن." },
};

function youtubeId(url) {
  const m = (url || "").match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/
  );
  return m ? m[1] : null;
}

/* Charge les polices AVANT l'impression (elles sont sinon ignorées car le document est caché) */
async function ensureFonts(templateId, withArabic) {
  if (!document.fonts || !document.fonts.load) return;
  const t = FORMATION_TEMPLATES[templateId] || FORMATION_TEMPLATES.academy;
  const sample = "AaÉéèêàçÔô0123456789";
  const loads = [
    `700 1em ${t.heading}`,
    `400 1em ${t.heading}`,
    `400 1em ${t.body}`,
    `600 1em ${t.body}`,
    `700 1em ${t.body}`,
  ].map((f) => document.fonts.load(f, sample));
  if (withArabic) {
    loads.push(document.fonts.load("700 1em 'Noto Naskh Arabic'", "دورة"));
    loads.push(document.fonts.load("400 1em 'Noto Naskh Arabic'", "دورة"));
  }
  await Promise.race([
    Promise.allSettled(loads),
    new Promise((resolve) => setTimeout(resolve, 4000)),
  ]);
}

/* Lance l'impression de la formation complète */
export async function printFormation(template = "academy", language = "fr") {
  await ensureFonts(typeof template === "string" ? template : "academy", language === "ar");

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

export default function FormationDoc({ formation, language = "fr", template = "academy", brand = {} }) {
  const T = FX[language] || FX.fr;
  const tpl = FORMATION_TEMPLATES[template] || FORMATION_TEMPLATES.academy;
  const rtl = language === "ar";
  const vars = formationThemeVars(template, brand);
  if (rtl) {
    vars["--h-font"] = "'Noto Naskh Arabic', serif";
    vars["--b-font"] = "'Noto Naskh Arabic', serif";
  }
  const all = formation.modules || [];
  const year = new Date().getFullYear();
  const owner = brand.author_name || brand.brand_name || "";

  const t = formation.title || "";
  const titleSize =
    t.length > 70 ? "1.6rem" : t.length > 50 ? "1.9rem" : t.length > 30 ? "2.3rem" : "2.8rem";

  return (
    <div
      className={`fx-doc${rtl ? " fx-rtl" : ""}`}
      dir={rtl ? "rtl" : "ltr"}
      data-cover={tpl.layout.cover}
      data-ribbons={tpl.layout.ribbons ? "1" : "0"}
      data-upper={tpl.layout.upper ? "1" : "0"}
      style={vars}
    >
      {/* COUVERTURE */}
      <section className="fx-cover">
        <div className="fx-ribbon fx-tl" />
        <div className="fx-ribbon fx-tl2" />
        <div className="fx-ribbon fx-br" />
        <div className="fx-ribbon fx-br2" />
        <div className="fx-cover-inner">
          <div className="fx-brand">{brand.brand_name || "DIGITELIO AI"}</div>
          <div className="fx-editions">
            <span />
            <em>{T.editions}</em>
            <span />
          </div>
          <h1 className="fx-cover-title" style={{ fontSize: titleSize }}>
            {formation.title}
          </h1>
          <div className="fx-cover-sub">{T.sub}</div>
          <div className="fx-divider">
            <span />
            <i />
            <span />
          </div>
          {formation.description && <p className="fx-cover-desc">{formation.description}</p>}
          {brand.tagline && <div className="fx-cover-slogan">{brand.tagline}</div>}
          {brand.author_name && (
            <div className="fx-cover-author">
              {T.by} {brand.author_name}
            </div>
          )}
        </div>
      </section>

      {/* SOMMAIRE */}
      <section className="fx-toc">
        <div className="fx-label">{T.toc}</div>
        <ul>
          {all.map((m, i) => (
            <li key={m.id}>
              <span className="fx-toc-icon">◆</span>
              <div>
                <div className="fx-toc-title">
                  {T.module} {i + 1} : {m.title}
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
        const imgs = res.filter((r) => r.type === "image");
        const links = res.filter((r) => r.type !== "image");
        return (
          <section key={m.id} className={`fx-module${MODULE_PER_PAGE ? " fx-newpage" : ""}`}>
            <div className="fx-head">
              <div className="fx-num">{i + 1}</div>
              <h2 className="fx-title">{m.title}</h2>
            </div>
            <div className="fx-lesson" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />

            {m.video_url && (
              <div className="fx-video">
                <h3 className="fx-h3">{T.video}</h3>
                {yt && (
                  <a className="fx-thumb" href={m.video_url} target="_blank" rel="noreferrer">
                    <img src={`https://img.youtube.com/vi/${yt}/hqdefault.jpg`} alt={T.thumb} />
                    <span className="fx-play">▶</span>
                  </a>
                )}
                <a className="fx-btn" href={m.video_url} target="_blank" rel="noreferrer">
                  {T.watch}
                </a>
              </div>
            )}

            {res.length > 0 && (
              <div className="fx-res">
                <h3 className="fx-h3">{T.res}</h3>
                {imgs.map((r, k) => (
                  <figure key={`i${k}`} className="fx-res-img">
                    <img src={r.url} alt={r.label} />
                    {r.label && <figcaption>{r.label}</figcaption>}
                  </figure>
                ))}
                {links.length > 0 && (
                  <ul>
                    {links.map((r, k) => (
                      <li key={k}>
                        <a href={r.url} target="_blank" rel="noreferrer">
                          {r.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        );
      })}

      {/* DERNIÈRE PAGE */}
      <section className="fx-end">
        <div className="fx-end-center">
          <div className="fx-end-box">
            <p className="fx-end-title">{T.thanks}</p>
            <p className="fx-end-text">{brand.tagline ? brand.tagline : T.thanksText}</p>
          </div>
        </div>
        <footer className="fx-copy">
          <p>
            © {year} — {owner ? `${owner}. ` : ""}
            {T.rights}
          </p>
          <p>{T.made}</p>
          <p>{T.noCopy}</p>
        </footer>
      </section>

      <style>{`
        ${formationFontsImport([template], rtl)}

        .fx-doc { display: none; }

        @media print {
          .printing-formation .fm-sheet { display: none !important; }
          .printing-formation .fx-doc {
            display: block !important;
            background: var(--paper);
            color: var(--text);
            font-family: var(--b-font);
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
            background: var(--cover-bg);
            color: var(--cover-ink);
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
            opacity: 0.09;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          }
          .fx-ribbon {
            display: none;
            position: absolute;
            width: 75%;
            height: 2px;
            background: linear-gradient(90deg, transparent, var(--accent), transparent);
            box-shadow: 0 0 14px var(--accent);
          }
          .fx-doc[data-ribbons="1"] .fx-ribbon { display: block; }
          .fx-tl  { top: 8%;  left: -20%; transform: rotate(-42deg); }
          .fx-tl2 { top: 12%; left: -24%; transform: rotate(-42deg); opacity: 0.45; }
          .fx-br  { bottom: 8%;  right: -20%; transform: rotate(-42deg); }
          .fx-br2 { bottom: 12%; right: -24%; transform: rotate(-42deg); opacity: 0.45; }

          .fx-doc[data-cover="left"] .fx-cover { justify-content: flex-start; text-align: left; }
          .fx-doc[data-cover="left"] .fx-cover-inner { align-items: flex-start; margin-left: 16%; max-width: 70%; }
          .fx-doc[data-cover="left"] .fx-cover::after {
            content: ""; position: absolute; left: 9%; top: 14%; bottom: 14%; width: 4px; background: var(--accent);
          }
          .fx-doc[data-cover="left"] .fx-editions span:first-child,
          .fx-doc[data-cover="left"] .fx-divider span:first-child { display: none; }
          .fx-doc[dir="rtl"][data-cover="left"] .fx-cover { text-align: right; }
          .fx-doc[data-cover="frame"] .fx-cover::after {
            content: ""; position: absolute; inset: 8mm; border: 1.5px solid var(--accent); pointer-events: none;
          }

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
            font-family: var(--b-font);
            font-weight: 700;
            font-size: 1.3rem;
            letter-spacing: 0.22em;
            color: var(--cover-ink);
          }
          .fx-editions {
            display: flex;
            align-items: center;
            gap: 14px;
            color: var(--accent);
            font-family: var(--b-font);
            font-size: 0.7rem;
            letter-spacing: 0.5em;
          }
          .fx-editions em { font-style: normal; margin-right: -0.5em; }
          .fx-editions span, .fx-divider span {
            display: block;
            width: 60px;
            height: 1px;
            background: var(--accent);
          }
          .fx-cover-title {
            font-family: var(--h-font);
            font-weight: 700;
            line-height: 1.15;
            margin: 10mm 0 0;
            background: var(--title-bg);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            color: transparent;
          }
          .fx-doc[data-upper="1"] .fx-cover-title { text-transform: uppercase; }
          .fx-cover-sub {
            font-family: var(--h-font);
            font-weight: 400;
            font-size: 1.4rem;
            letter-spacing: 0.6em;
            margin-right: -0.6em;
            color: var(--cover-sub);
          }
          .fx-divider { display: flex; align-items: center; gap: 10px; margin: 3mm 0; }
          .fx-divider i {
            width: 9px; height: 9px; background: var(--accent); transform: rotate(45deg);
          }
          .fx-cover-desc {
            font-family: var(--b-font);
            font-weight: 400;
            font-size: 0.95rem;
            line-height: 1.7;
            color: var(--cover-ink);
            opacity: 0.9;
            max-width: 88%;
            margin: 0;
          }
          .fx-cover-slogan {
            font-family: var(--b-font);
            font-style: italic;
            font-size: 1rem;
            color: var(--cover-sub);
            max-width: 85%;
          }
          .fx-cover-author {
            font-family: var(--b-font);
            font-size: 0.85rem;
            letter-spacing: 0.12em;
            color: var(--cover-sub);
            font-weight: 700;
          }

          /* ===== SOMMAIRE ===== */
          .fx-toc { padding: 0; }
          .fx-label {
            font-family: var(--b-font);
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            font-size: 0.8rem;
            color: var(--accent);
            margin-bottom: 1rem;
          }
          .fx-toc ul { list-style: none; padding: 0; margin: 0; }
          .fx-toc li {
            display: flex;
            gap: 0.75rem;
            align-items: flex-start;
            padding: 0.7rem 0;
            border-bottom: 1px solid rgba(128,128,128,0.28);
            break-inside: avoid;
          }
          .fx-toc-icon { color: var(--accent); font-size: 0.7rem; margin-top: 0.35rem; }
          .fx-toc-title { font-family: var(--b-font); font-weight: 600; font-size: 1rem; color: var(--ink); }
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
          .fx-head {
            break-inside: avoid;
            break-after: avoid;
          }
          .fx-num {
            font-family: var(--h-font);
            font-weight: 700;
            font-size: 3.6rem;
            color: var(--accent);
            opacity: 0.4;
            line-height: 1;
            margin-bottom: -0.9rem;
          }
          .fx-title {
            font-family: var(--h-font);
            font-weight: 700;
            font-size: 1.55rem;
            margin: 0 0 0.8rem;
            color: var(--ink);
            break-after: avoid;
          }
          .fx-lesson h2, .fx-lesson h3 {
            font-family: var(--b-font);
            font-weight: 700;
            color: var(--ink);
            break-after: avoid;
          }
          .fx-lesson h2 { font-size: 1.15rem; margin: 1rem 0 0.4rem; }
          .fx-lesson h3 { font-size: 1.05rem; margin: 1rem 0 0.35rem; }
          .fx-lesson p {
            font-size: 0.92rem;
            line-height: 1.6;
            margin: 0.6rem 0;
            text-align: justify;
            color: var(--text);
            orphans: 3;
            widows: 3;
          }
          .fx-lesson p:has(+ ul),
          .fx-lesson p:has(+ ol) { break-after: avoid; }
          .fx-lesson ul { padding-left: 1.3rem; margin: 0.5rem 0; }
          .fx-lesson li { margin: 0.25rem 0; line-height: 1.55; font-size: 0.92rem; break-inside: avoid; }
          .fx-lesson tr, .fx-lesson blockquote { break-inside: avoid; }

          .fx-h3 {
            font-family: var(--b-font);
            font-weight: 700;
            font-size: 1.05rem;
            margin: 1.1rem 0 0.5rem;
            color: var(--ink);
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
            color: #fff;
            display: flex; align-items: center; justify-content: center;
            font-size: 1rem; padding-left: 1mm;
          }
          .fx-btn {
            display: inline-block;
            margin-top: 0.5rem;
            padding: 0.5rem 0.95rem;
            border-radius: 6px;
            background: var(--accent);
            color: var(--on-accent) !important;
            font-family: var(--b-font);
            font-weight: 700;
            font-size: 0.9rem;
            text-decoration: none !important;
          }
          .fx-res-img { margin: 0 0 5mm; break-inside: avoid; }
          .fx-res-img img {
            display: block;
            max-width: 100%;
            max-height: 110mm;
            object-fit: contain;
            border-radius: 4px;
          }
          .fx-res-img figcaption { font-size: 0.8rem; color: #666; margin-top: 1.5mm; }
          .fx-res ul { padding-left: 1.3rem; margin: 0; break-inside: avoid; }
          .fx-res li { margin: 0.25rem 0; }
          .fx-res a { color: var(--ink); text-decoration: underline; }

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
            background: var(--paper);
          }
          .fx-end-center { flex: 1; display: flex; align-items: center; justify-content: center; }
          .fx-end-box {
            border: 1.5px solid var(--accent);
            border-radius: 4px;
            padding: 2.5rem;
            max-width: 30rem;
            text-align: center;
          }
          .fx-end-title {
            font-family: var(--h-font);
            font-weight: 700;
            font-size: 1.3rem;
            margin: 0 0 1rem;
            color: var(--ink);
          }
          .fx-end-text { font-family: var(--b-font); font-size: 0.9rem; color: #555; line-height: 1.8; margin: 0; }
          .fx-copy {
            margin-top: auto;
            text-align: center;
            font-size: 0.8rem;
            color: #666;
            line-height: 1.8;
          }
          .fx-copy p { margin: 0; }

          /* ===== Arabe : droite à gauche ===== */
          .fx-rtl .fx-lesson p { text-align: right; }
          .fx-rtl .fx-lesson ul,
          .fx-rtl .fx-lesson ol { padding-left: 0 !important; padding-right: 1.3rem !important; }
          .fx-rtl .fx-res ul { padding-left: 0; padding-right: 1.3rem; }
          .fx-rtl .fx-brand,
          .fx-rtl .fx-editions,
          .fx-rtl .fx-cover-sub,
          .fx-rtl .fx-label,
          .fx-rtl .fx-cover-author { letter-spacing: 0; margin-right: 0; }
          .fx-rtl .fx-editions em { margin-right: 0; }
          .fx-rtl .fx-cover-title { text-transform: none; }
        }
      `}</style>
    </div>
  );
      }
