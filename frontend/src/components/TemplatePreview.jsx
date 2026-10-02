import { TEMPLATES, themeVars } from "../utils/templates.js";

export default function TemplatePreview({ templateId, brand = {}, title = "Titre de votre eBook", size = "sm" }) {
  const t = TEMPLATES[templateId] || TEMPLATES.finance;
  const vars = themeVars(templateId, brand);
  const left = t.layout.cover === "left";

  return (
    <div className="tp" style={{ ...vars, fontSize: size === "lg" ? 15 : 10 }}>
      <div
        className={`tp-cover${t.layout.cover === "frame" ? " is-frame" : ""}`}
        style={{ alignItems: left ? "flex-start" : "center", textAlign: left ? "left" : "center" }}
      >
        <div className="tp-brand">{brand.brand_name || "DIGITELIO AI"}</div>
        <div className="tp-title" style={{ textTransform: t.layout.upper ? "uppercase" : "none" }}>
          {title}
        </div>
        <div className="tp-line" />
        <div className="tp-sub">{t.tagline}</div>
      </div>

      <div className="tp-page">
        <div className="tp-chap">Chapitre 1</div>
        <div className="tp-h">Comprendre l'essentiel</div>
        <p className="tp-p">Chaque chapitre vous guide pas à pas vers des résultats concrets.</p>
        <div className="tp-callout">
          <b>À retenir :</b> une idée forte par chapitre.
        </div>
        <div className="tp-bar" />
        <div className="tp-bar short" />
      </div>

      <style>{`
        .tp { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8em; width: 100%; }
        .tp-cover {
          aspect-ratio: 3 / 4; background: var(--cover-bg); color: var(--cover-ink);
          border-radius: 0.5em; padding: 1.4em; display: flex; flex-direction: column;
          justify-content: center; gap: 0.8em; position: relative; overflow: hidden;
          box-shadow: 0 0.4em 1.2em rgba(0,0,0,0.18);
        }
        .tp-cover.is-frame::after {
          content: ""; position: absolute; inset: 0.7em; border: 1px solid var(--accent);
          border-radius: 0.2em; pointer-events: none;
        }
        .tp-brand { font-size: 0.65em; letter-spacing: 0.25em; color: var(--accent); font-weight: 700; }
        .tp-title {
          font-family: var(--h-font); font-weight: 700; font-size: 1.5em; line-height: 1.15;
          background: var(--title-bg); -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .tp-line { width: 3em; height: 2px; background: var(--accent); }
        .tp-sub { font-size: 0.7em; color: var(--cover-sub); font-family: var(--b-font); }
        .tp-page {
          aspect-ratio: 3 / 4; background: var(--paper); border: 1px solid rgba(128,128,128,0.25);
          border-radius: 0.5em; padding: 1.1em; font-family: var(--b-font); color: var(--text); overflow: hidden;
        }
        .tp-chap { font-size: 0.6em; letter-spacing: 0.2em; color: var(--accent); font-weight: 700; text-transform: uppercase; }
        .tp-h { font-family: var(--h-font); font-weight: 700; font-size: 1.1em; color: var(--ink); margin: 0.3em 0 0.5em; }
        .tp-p { font-size: 0.7em; line-height: 1.6; margin: 0 0 0.7em; }
        .tp-callout {
          font-size: 0.65em; padding: 0.6em 0.8em; border-left: 3px solid var(--accent);
          background: var(--accent-soft); border-radius: 0 0.4em 0.4em 0; margin-bottom: 0.8em;
        }
        .tp-bar { height: 0.35em; background: rgba(128,128,128,0.25); border-radius: 1em; margin-bottom: 0.4em; }
        .tp-bar.short { width: 60%; }
      `}</style>
    </div>
  );
}
