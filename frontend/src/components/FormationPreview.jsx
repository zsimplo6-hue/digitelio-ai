import { renderMarkdown } from "../utils/markdown.js";
import {
  FORMATION_TEMPLATES,
  FORMATION_ORDER,
  formationThemeVars,
  formationFontsImport,
} from "../utils/formationTemplates.js";

const TXT = {
  fr: { title: "Aperçu réel de la formation", hint: "Voici le rendu final : couverture, sommaire, modules, images et vidéos. Touchez « Modifier » sous un module pour le retoucher.", model: "Modèle", editions: "ÉDITIONS", sub: "FORMATION", by: "Par", toc: "Sommaire", module: "Module", edit: "✏️ Modifier ce module", empty: "Cette leçon n'est pas encore rédigée.", write: "Ouvrir pour rédiger", end: "Merci de votre suivi", endText: "Félicitations, vous avez terminé cette formation." },
  en: { title: "Real preview of the course", hint: "This is the final result: cover, contents, modules, images and videos. Tap “Edit” under a module to change it.", model: "Template", editions: "EDITIONS", sub: "COURSE", by: "By", toc: "Contents", module: "Module", edit: "✏️ Edit this module", empty: "This lesson has not been written yet.", write: "Open to write it", end: "Thank you for following", endText: "Congratulations, you have completed this course." },
  es: { title: "Vista previa real del curso", hint: "Este es el resultado final: portada, índice, módulos, imágenes y vídeos. Toca «Editar» bajo un módulo para modificarlo.", model: "Plantilla", editions: "EDICIONES", sub: "CURSO", by: "Por", toc: "Índice", module: "Módulo", edit: "✏️ Editar este módulo", empty: "Esta lección aún no está redactada.", write: "Abrir para redactarla", end: "Gracias por seguir el curso", endText: "Enhorabuena, has terminado este curso." },
  pt: { title: "Pré-visualização real do curso", hint: "Este é o resultado final: capa, sumário, módulos, imagens e vídeos. Toque em «Editar» sob um módulo para alterá-lo.", model: "Modelo", editions: "EDIÇÕES", sub: "CURSO", by: "Por", toc: "Sumário", module: "Módulo", edit: "✏️ Editar este módulo", empty: "Esta aula ainda não foi escrita.", write: "Abrir para escrever", end: "Obrigado por acompanhar", endText: "Parabéns, concluiu este curso." },
  de: { title: "Echte Vorschau des Kurses", hint: "So sieht das Endergebnis aus: Cover, Inhalt, Module, Bilder und Videos. Tippen Sie unter einem Modul auf „Bearbeiten“.", model: "Vorlage", editions: "AUSGABEN", sub: "KURS", by: "Von", toc: "Inhalt", module: "Modul", edit: "✏️ Dieses Modul bearbeiten", empty: "Diese Lektion ist noch nicht geschrieben.", write: "Zum Schreiben öffnen", end: "Danke fürs Mitmachen", endText: "Glückwunsch, Sie haben diesen Kurs abgeschlossen." },
  it: { title: "Anteprima reale del corso", hint: "Ecco il risultato finale: copertina, indice, moduli, immagini e video. Tocca «Modifica» sotto un modulo per cambiarlo.", model: "Modello", editions: "EDIZIONI", sub: "CORSO", by: "Di", toc: "Indice", module: "Modulo", edit: "✏️ Modifica questo modulo", empty: "Questa lezione non è ancora scritta.", write: "Apri per scriverla", end: "Grazie per aver seguito il corso", endText: "Complimenti, hai completato questo corso." },
  ar: { title: "معاينة حقيقية للدورة", hint: "هذه هي النتيجة النهائية: الغلاف والمحتويات والوحدات والصور والفيديوهات. اضغط «تعديل» تحت أي وحدة.", model: "القالب", editions: "إصدارات", sub: "دورة", by: "بقلم", toc: "المحتويات", module: "الوحدة", edit: "✏️ تعديل هذه الوحدة", empty: "لم يتم كتابة هذا الدرس بعد.", write: "افتح للكتابة", end: "شكرًا لمتابعتكم", endText: "تهانينا، لقد أنهيت هذه الدورة." },
};

/* Description courte et propre pour la couverture */
function coverText(text, max = 220) {
  let t = String(text || "").replace(/[#*_`>]+/g, " ").replace(/\s+/g, " ").trim();
  if (t.length > max) {
    t = t.slice(0, max);
    const cut = t.lastIndexOf(" ");
    if (cut > 100) t = t.slice(0, cut);
    t = t.replace(/[\s,;:.\-–]+$/, "") + "…";
  }
  return t;
}

/* Aperçu réel de toute la formation, à l'écran : couverture, sommaire, modules, médias, fin.
   Il reprend le modèle choisi (couleurs, polices) et s'adapte à la largeur du téléphone. */
export default function FormationPreview({
  formation,
  language = "fr",
  template = "noir",
  brand = {},
  onTemplate,
  renderMedia,
  onEdit,
  activeId,
}) {
  const T = TXT[language] || TXT.fr;
  const tpl = FORMATION_TEMPLATES[template] || FORMATION_TEMPLATES.noir;
  const rtl = language === "ar";
  const vars = formationThemeVars(template, brand);
  if (rtl) {
    vars["--h-font"] = "'Noto Naskh Arabic', serif";
    vars["--b-font"] = "'Noto Naskh Arabic', serif";
  }
  const modules = formation.modules || [];
  const title = formation.title || "";
  const desc = coverText(formation.description);

  return (
    <div className="fm-screen no-print">
      <section className="fp" style={vars} dir={rtl ? "rtl" : "ltr"} data-cover={tpl.layout.cover} data-upper={tpl.layout.upper ? "1" : "0"}>
        <style>{formationFontsImport(FORMATION_ORDER, rtl)}</style>

        <header className="fp-head">
          <div className="fp-kicker">{T.title}</div>
          <p className="fp-hint">{T.hint}</p>
          {onTemplate && (
            <div className="fp-tpls" role="group" aria-label={T.model}>
              {FORMATION_ORDER.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`fp-tpl${template === id ? " on" : ""}`}
                  onClick={() => onTemplate(id)}
                  aria-pressed={template === id}
                >
                  <i style={{ background: FORMATION_TEMPLATES[id].colors.accent }} />
                  {FORMATION_TEMPLATES[id].name}
                </button>
              ))}
            </div>
          )}
        </header>

        <div className="fp-doc">
          {/* COUVERTURE */}
          <div className="fp-cover">
            <div className="fp-cover-inner">
              <div className="fp-brand">{brand.brand_name || "DIGITELIO AI"}</div>
              <div className="fp-editions">
                <span />
                <em>{T.editions}</em>
                <span />
              </div>
              <h2 className="fp-cover-title">{title}</h2>
              <div className="fp-cover-sub">{T.sub}</div>
              <div className="fp-divider">
                <span />
                <i />
                <span />
              </div>
              {desc && <p className="fp-cover-desc">{desc}</p>}
              {brand.tagline && <div className="fp-cover-slogan">{brand.tagline}</div>}
              {brand.author_name && (
                <div className="fp-cover-author">
                  {T.by} {brand.author_name}
                </div>
              )}
            </div>
          </div>

          {/* SOMMAIRE */}
          <div className="fp-block fp-toc">
            <div className="fp-label">{T.toc}</div>
            <ol>
              {modules.map((m, i) => (
                <li key={m.id || i}>
                  <span className="fp-n">{i + 1}</span>
                  <span className="fp-toc-t">{m.title}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* MODULES */}
          {modules.map((m, i) => {
            const has = (m.content || "").trim();
            return (
              <article key={m.id || i} className={`fp-block fp-mod${m.id === activeId ? " is-active" : ""}`}>
                <div className="fp-mod-head">
                  <span className="fp-n fp-n-lg">{i + 1}</span>
                  <div className="fp-mod-kicker">
                    {T.module} {i + 1}
                  </div>
                </div>
                <h3 className="fp-mod-title">{m.title}</h3>
                {has ? (
                  <>
                    <div className="fp-lesson" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                    {renderMedia && renderMedia(m)}
                  </>
                ) : (
                  <div className="fp-empty">
                    <span>{T.empty}</span>
                    {onEdit && (
                      <button type="button" onClick={() => onEdit(m)}>
                        {T.write}
                      </button>
                    )}
                  </div>
                )}
                {has && onEdit && (
                  <button type="button" className="fp-edit" onClick={() => onEdit(m)}>
                    {T.edit}
                  </button>
                )}
              </article>
            );
          })}

          {/* FIN */}
          <div className="fp-block fp-end">
            <div className="fp-end-mark">◆</div>
            <div className="fp-end-t">{T.end}</div>
            <p>{T.endText}</p>
          </div>
        </div>
      </section>

      <style>{`
        .fp { margin-top: 1.4rem; max-width: 100%; }
        .fp, .fp * { box-sizing: border-box; }
        .fp-head { padding: 0 0.2rem 0.9rem; }
        .fp-kicker { font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 800; color: #D4AF37; }
        .fp-hint { margin: 0.4rem 0 0.9rem; font-size: 0.86rem; line-height: 1.55; opacity: 0.7; }
        .fp-tpls { display: flex; gap: 0.45rem; overflow-x: auto; padding: 0.15rem 0.1rem 0.5rem; margin: 0 -0.2rem; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .fp-tpls::-webkit-scrollbar { display: none; }
        .fp-tpl { flex: none; display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.5rem 0.85rem; border-radius: 999px; border: 1px solid rgba(128,128,128,0.35); background: transparent; color: inherit; font-size: 0.82rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .fp-tpl i { width: 0.7rem; height: 0.7rem; border-radius: 50%; display: inline-block; }
        .fp-tpl.on { border-color: #D4AF37; background: rgba(212,175,55,0.16); font-weight: 800; }

        /* Feuille : toujours claire, comme le PDF */
        .fp-doc { background: var(--paper); color: var(--text); font-family: var(--b-font); border-radius: 20px; overflow: hidden; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 22px 50px -26px rgba(0,0,0,0.6); max-width: 100%; }
        .fp[dir="rtl"] .fp-doc { text-align: right; }

        .fp-cover { position: relative; background: var(--cover-bg); color: var(--cover-ink); padding: 2.6rem 1.4rem 2.4rem; overflow: hidden; }
        .fp-cover::before { content: ""; position: absolute; inset: 0.7rem; border: 1px solid var(--accent); opacity: 0.35; border-radius: 12px; pointer-events: none; }
        .fp-cover-inner { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.9rem; min-width: 0; }
        .fp[data-cover="left"] .fp-cover-inner { align-items: flex-start; text-align: left; }
        .fp[data-cover="left"][dir="rtl"] .fp-cover-inner { text-align: right; }
        .fp-brand { font-size: 0.72rem; letter-spacing: 0.3em; font-weight: 700; color: var(--cover-sub); }
        .fp-editions { display: flex; align-items: center; gap: 0.7rem; width: 100%; justify-content: center; color: var(--cover-sub); }
        .fp[data-cover="left"] .fp-editions { justify-content: flex-start; }
        .fp-editions span { height: 1px; width: 2.2rem; background: var(--accent); opacity: 0.8; }
        .fp[data-cover="left"] .fp-editions span:first-child { display: none; }
        .fp-editions em { font-style: normal; font-size: 0.68rem; letter-spacing: 0.34em; font-weight: 600; }
        .fp-cover-title { margin: 0.4rem 0 0; font-family: var(--h-font); font-weight: 800; line-height: 1.12; font-size: clamp(1.45rem, 7vw, 2.3rem); overflow-wrap: anywhere; hyphens: auto; max-width: 100%; background: var(--title-bg); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; }
        .fp[data-upper="1"] .fp-cover-title { text-transform: uppercase; letter-spacing: 0.01em; }
        .fp-cover-sub { font-size: 0.72rem; letter-spacing: 0.5em; font-weight: 600; color: var(--cover-sub); }
        .fp-divider { display: flex; align-items: center; gap: 0.6rem; width: 100%; justify-content: center; }
        .fp[data-cover="left"] .fp-divider { justify-content: flex-start; }
        .fp-divider span { height: 1px; width: 2.6rem; background: var(--accent); }
        .fp[data-cover="left"] .fp-divider span:first-child { display: none; }
        .fp-divider i { width: 0.55rem; height: 0.55rem; background: var(--accent); transform: rotate(45deg); display: inline-block; }
        .fp-cover-desc { margin: 0; font-size: 0.92rem; line-height: 1.65; color: var(--cover-ink); opacity: 0.85; max-width: 30rem; overflow-wrap: anywhere; }
        .fp-cover-slogan { font-size: 0.84rem; font-style: italic; color: var(--cover-sub); }
        .fp-cover-author { margin-top: 0.4rem; font-size: 0.78rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--cover-sub); font-weight: 700; }

        .fp-block { padding: 1.8rem 1.3rem; border-top: 1px solid rgba(128,128,128,0.18); min-width: 0; }
        .fp-label { font-size: 0.72rem; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 800; color: var(--accent); margin-bottom: 0.9rem; }
        .fp-toc ol { list-style: none; margin: 0; padding: 0; display: grid; }
        .fp-toc li { display: flex; align-items: center; gap: 0.8rem; padding: 0.75rem 0; border-bottom: 1px solid rgba(128,128,128,0.2); min-width: 0; }
        .fp-toc li:last-child { border-bottom: 0; }
        .fp-toc-t { font-weight: 600; color: var(--ink); line-height: 1.35; min-width: 0; overflow-wrap: anywhere; }
        .fp-n { flex: none; width: 1.8rem; height: 1.8rem; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--accent); color: var(--on-accent); font-size: 0.8rem; font-weight: 800; font-family: var(--h-font); }
        .fp-n-lg { width: 2.4rem; height: 2.4rem; font-size: 1rem; }

        .fp-mod { position: relative; }
        .fp-mod.is-active { box-shadow: inset 4px 0 0 var(--accent); }
        .fp[dir="rtl"] .fp-mod.is-active { box-shadow: inset -4px 0 0 var(--accent); }
        .fp-mod-head { display: flex; align-items: center; gap: 0.7rem; }
        .fp-mod-kicker { font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 800; color: var(--accent); }
        .fp-mod-title { margin: 0.8rem 0 1rem; font-family: var(--h-font); font-size: clamp(1.25rem, 5.4vw, 1.7rem); line-height: 1.22; font-weight: 800; color: var(--ink); overflow-wrap: anywhere; }
        .fp[data-upper="1"] .fp-mod-title { text-transform: uppercase; letter-spacing: 0.01em; }

        .fp-lesson { color: var(--text); font-size: 1rem; line-height: 1.75; min-width: 0; overflow-wrap: anywhere; }
        .fp-lesson p { margin: 0.8rem 0; }
        .fp-lesson h2, .fp-lesson h3 { font-family: var(--h-font); color: var(--ink); line-height: 1.25; margin: 1.5rem 0 0.5rem; }
        .fp-lesson h2 { font-size: 1.3rem; }
        .fp-lesson h3 { font-size: 1.1rem; padding-left: 0.7rem; border-left: 3px solid var(--accent); }
        .fp[dir="rtl"] .fp-lesson h3 { padding-left: 0; padding-right: 0.7rem; border-left: 0; border-right: 3px solid var(--accent); }
        .fp-lesson ul, .fp-lesson ol { margin: 0.8rem 0; }
        .fp-lesson strong { color: var(--ink); }
        .fp-lesson .md-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%; border-radius: 8px; }
        .fp-lesson table { min-width: 100%; }
        .fp-lesson .md-callout { overflow-wrap: anywhere; color: var(--ink); }
        .fp[dir="rtl"] .fp-lesson .md-callout { border-left: 0 !important; border-right: 4px solid var(--accent); border-radius: 8px 0 0 8px !important; }

        .fp-media { margin-top: 1.4rem; display: grid; gap: 1.1rem; }
        .fp-media figure { margin: 0; }
        .fp-media img { display: block; width: 100%; height: auto; border-radius: 12px; }
        .fp-media figcaption { text-align: center; font-size: 0.82rem; opacity: 0.7; margin-top: 0.45rem; }
        .fp-vtitle { font-weight: 700; margin-bottom: 0.45rem; color: var(--ink); }
        .fp-media .fm-video { position: relative; padding-top: 56.25%; border-radius: 12px; overflow: hidden; background: #000; }
        .fp-media .fm-video iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
        .fp-media a { color: var(--accent); font-weight: 600; overflow-wrap: anywhere; }
        .fp-links { margin: 0; padding-left: 1.2rem; display: grid; gap: 0.4rem; }

        .fp-edit { margin-top: 1.4rem; width: 100%; min-height: 2.9rem; padding: 0.7rem 1rem; border-radius: 12px; border: 1px solid var(--accent); background: var(--accent-soft); color: var(--ink); font-weight: 700; font-size: 0.9rem; cursor: pointer; font-family: var(--b-font); }
        .fp-empty { display: grid; gap: 0.7rem; padding: 1rem; border: 1px dashed rgba(128,128,128,0.5); border-radius: 12px; font-size: 0.9rem; color: var(--text); }
        .fp-empty button { justify-self: start; padding: 0.55rem 1rem; border-radius: 10px; border: 1px solid var(--accent); background: transparent; color: var(--ink); font-weight: 700; cursor: pointer; }

        .fp-end { text-align: center; background: var(--cover-bg); color: var(--cover-ink); border-top: 0; padding: 2.4rem 1.3rem; }
        .fp-end-mark { color: var(--accent); font-size: 1rem; }
        .fp-end-t { font-family: var(--h-font); font-weight: 800; font-size: 1.3rem; margin: 0.5rem 0; color: var(--cover-ink); }
        .fp-end p { margin: 0; font-size: 0.9rem; opacity: 0.85; color: var(--cover-sub); }

        @media (min-width: 640px) {
          .fp-cover { padding: 3.6rem 3rem 3.2rem; }
          .fp-block { padding: 2.4rem 2.6rem; }
        }
      `}</style>
    </div>
  );
  }
  
