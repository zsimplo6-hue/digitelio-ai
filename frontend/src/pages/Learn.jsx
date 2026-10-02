import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { renderMarkdown } from "../utils/markdown.js";
import CertificateDoc, { printCertificate } from "../components/CertificateExport.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

const TXT = {
  fr: {
    loading: "Chargement...", unavailable: "Accès indisponible", invalid: "Ce lien d'accès n'est pas valide.",
    space: "ESPACE APPRENANT", hello: "Bonjour", by: "Par", progress: "Votre progression",
    congrats: "🎉 Félicitations, formation terminée !", cert: "🎓 Télécharger mon certificat",
    allDone: "Vous avez suivi tous les modules.", start: "▶ Commencer la formation", cont: "▶ Continuer",
    program: "Programme", back: "← Programme", module: (n, t) => `Module ${n} sur ${t}`,
    watch: "▶ Regarder la vidéo ↗", videoTitle: "Vidéo du module", resources: "Ressources",
    moduleDone: "✓ Module terminé", saving: "Enregistrement...", finish: "✓ Terminer ce module",
    prev: "← Précédent", next: "Suivant →", powered: "Propulsé par",
  },
  en: {
    loading: "Loading...", unavailable: "Access unavailable", invalid: "This access link is not valid.",
    space: "LEARNER AREA", hello: "Hello", by: "By", progress: "Your progress",
    congrats: "🎉 Congratulations, course completed!", cert: "🎓 Download my certificate",
    allDone: "You have completed all the modules.", start: "▶ Start the course", cont: "▶ Continue",
    program: "Curriculum", back: "← Curriculum", module: (n, t) => `Module ${n} of ${t}`,
    watch: "▶ Watch the video ↗", videoTitle: "Module video", resources: "Resources",
    moduleDone: "✓ Module completed", saving: "Saving...", finish: "✓ Complete this module",
    prev: "← Previous", next: "Next →", powered: "Powered by",
  },
  es: {
    loading: "Cargando...", unavailable: "Acceso no disponible", invalid: "Este enlace de acceso no es válido.",
    space: "ESPACIO DEL ALUMNO", hello: "Hola", by: "Por", progress: "Tu progreso",
    congrats: "🎉 ¡Felicidades, curso terminado!", cert: "🎓 Descargar mi certificado",
    allDone: "Has completado todos los módulos.", start: "▶ Empezar el curso", cont: "▶ Continuar",
    program: "Programa", back: "← Programa", module: (n, t) => `Módulo ${n} de ${t}`,
    watch: "▶ Ver el vídeo ↗", videoTitle: "Vídeo del módulo", resources: "Recursos",
    moduleDone: "✓ Módulo completado", saving: "Guardando...", finish: "✓ Terminar este módulo",
    prev: "← Anterior", next: "Siguiente →", powered: "Impulsado por",
  },
  pt: {
    loading: "Carregando...", unavailable: "Acesso indisponível", invalid: "Este link de acesso não é válido.",
    space: "ÁREA DO ALUNO", hello: "Olá", by: "Por", progress: "O seu progresso",
    congrats: "🎉 Parabéns, curso concluído!", cert: "🎓 Baixar o meu certificado",
    allDone: "Você concluiu todos os módulos.", start: "▶ Começar o curso", cont: "▶ Continuar",
    program: "Programa", back: "← Programa", module: (n, t) => `Módulo ${n} de ${t}`,
    watch: "▶ Assistir ao vídeo ↗", videoTitle: "Vídeo do módulo", resources: "Recursos",
    moduleDone: "✓ Módulo concluído", saving: "Salvando...", finish: "✓ Concluir este módulo",
    prev: "← Anterior", next: "Seguinte →", powered: "Desenvolvido por",
  },
  de: {
    loading: "Wird geladen...", unavailable: "Zugang nicht verfügbar", invalid: "Dieser Zugangslink ist ungültig.",
    space: "LERNBEREICH", hello: "Hallo", by: "Von", progress: "Ihr Fortschritt",
    congrats: "🎉 Glückwunsch, Kurs abgeschlossen!", cert: "🎓 Mein Zertifikat herunterladen",
    allDone: "Sie haben alle Module abgeschlossen.", start: "▶ Kurs starten", cont: "▶ Weiter",
    program: "Programm", back: "← Programm", module: (n, t) => `Modul ${n} von ${t}`,
    watch: "▶ Video ansehen ↗", videoTitle: "Modulvideo", resources: "Ressourcen",
    moduleDone: "✓ Modul abgeschlossen", saving: "Wird gespeichert...", finish: "✓ Modul abschließen",
    prev: "← Zurück", next: "Weiter →", powered: "Bereitgestellt von",
  },
  it: {
    loading: "Caricamento...", unavailable: "Accesso non disponibile", invalid: "Questo link di accesso non è valido.",
    space: "AREA STUDENTE", hello: "Ciao", by: "Di", progress: "I tuoi progressi",
    congrats: "🎉 Complimenti, corso completato!", cert: "🎓 Scarica il mio certificato",
    allDone: "Hai completato tutti i moduli.", start: "▶ Inizia il corso", cont: "▶ Continua",
    program: "Programma", back: "← Programma", module: (n, t) => `Modulo ${n} di ${t}`,
    watch: "▶ Guarda il video ↗", videoTitle: "Video del modulo", resources: "Risorse",
    moduleDone: "✓ Modulo completato", saving: "Salvataggio...", finish: "✓ Completa questo modulo",
    prev: "← Precedente", next: "Successivo →", powered: "Offerto da",
  },
  ar: {
    loading: "جارٍ التحميل...", unavailable: "الوصول غير متاح", invalid: "رابط الوصول هذا غير صالح.",
    space: "فضاء المتعلّم", hello: "مرحبًا", by: "بقلم", progress: "تقدمك",
    congrats: "🎉 تهانينا، لقد أنهيت الدورة!", cert: "🎓 تنزيل شهادتي",
    allDone: "لقد أنهيت جميع الوحدات.", start: "▶ ابدأ الدورة", cont: "▶ متابعة",
    program: "البرنامج", back: "→ البرنامج", module: (n, t) => `الوحدة ${n} من ${t}`,
    watch: "▶ شاهد الفيديو ↗", videoTitle: "فيديو الوحدة", resources: "الموارد",
    moduleDone: "✓ تم إنهاء الوحدة", saving: "جارٍ الحفظ...", finish: "✓ إنهاء هذه الوحدة",
    prev: "→ السابق", next: "التالي ←", powered: "مدعوم من",
  },
};

function embedUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export default function Learn() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saveErr, setSaveErr] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`${API}/api/learn/${token}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || TXT.fr.invalid);
        if (alive) {
          setData(json);
          document.title = `${json.formation.title} | Digitelio AI`;
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
      <div className="lr-root">
        <p className="lr-center">{TXT.fr.loading}</p>
        <LrStyle />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="lr-root">
        <div className="lr-center">
          <div className="lr-brand">DIGITELIO AI</div>
          <h1 className="lr-title" style={{ fontSize: "1.3rem" }}>{TXT.fr.unavailable}</h1>
          <p className="lr-muted">{error || TXT.fr.invalid}</p>
        </div>
        <LrStyle />
      </div>
    );
  }

  const f = data.formation;
  const lang = TXT[f.language] ? f.language : "fr";
  const t = TXT[lang];
  const rtl = lang === "ar";
  const modules = data.modules || [];
  const done = new Set(data.completed || []);
  const doneCount = modules.filter((m) => done.has(m.id)).length;
  const total = modules.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const finished = total > 0 && doneCount >= total;
  const nextTodo = modules.find((m) => !done.has(m.id));
  const active = modules.find((m) => m.id === activeId);
  const activeIdx = active ? modules.findIndex((m) => m.id === active.id) : -1;

  function open(id) {
    setSaveErr("");
    setActiveId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function complete(mid) {
    setBusy(true);
    setSaveErr("");
    try {
      const res = await fetch(`${API}/api/learn/${token}/modules/${mid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Error");
      setData((d) => ({ ...d, completed: json.completed, completed_at: json.completed_at }));
      const idx = modules.findIndex((m) => m.id === mid);
      const next = modules[idx + 1];
      setActiveId(next ? next.id : null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setSaveErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const embed = active ? embedUrl(active.video_url) : null;
  const resources = active ? (active.resources || []).filter((r) => r.label && r.url) : [];

  return (
    <div className="lr-root" dir={rtl ? "rtl" : "ltr"}>
      <div className="lr-screen">
        <div className="lr-wrap">
          <div className="lr-brand">DIGITELIO AI</div>
          <div className="lr-ed">
            <span />
            <em>{t.space}</em>
            <span />
          </div>

          {!active ? (
            <>
              <div className="lr-hello">{t.hello} {data.learner}</div>
              <h1 className="lr-title">{f.title}</h1>
              {f.instructor && <div className="lr-by">{t.by} {f.instructor}</div>}

              <div className="lr-progress-top">
                <span>{t.progress}</span>
                <span>
                  {doneCount}/{total} · {pct}%
                </span>
              </div>
              <div className="lr-progress">
                <div className="lr-progress-bar" style={{ width: `${Math.max(pct, 3)}%` }} />
              </div>

              {finished && (
                <div className="lr-done">
                  <div className="lr-done-title">{t.congrats}</div>
                  {f.certificate ? (
                    <button className="lr-cta" onClick={printCertificate}>
                      {t.cert}
                    </button>
                  ) : (
                    <div className="lr-muted">{t.allDone}</div>
                  )}
                </div>
              )}

              {nextTodo && (
                <button className="lr-cta" style={{ marginTop: "1.2rem" }} onClick={() => open(nextTodo.id)}>
                  {doneCount === 0 ? t.start : t.cont}
                </button>
              )}

              <h2 className="lr-h2">{t.program}</h2>
              <ol className="lr-modules">
                {modules.map((m, i) => (
                  <li key={m.id}>
                    <button className="lr-mod" onClick={() => open(m.id)}>
                      <span className={done.has(m.id) ? "lr-num ok" : "lr-num"}>
                        {done.has(m.id) ? "✓" : i + 1}
                      </span>
                      <div className="lr-mod-text">
                        <div className="lr-mtitle">{m.title}</div>
                        {m.summary && <div className="lr-msum">{m.summary}</div>}
                      </div>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <>
              <button className="lr-back" onClick={() => setActiveId(null)}>
                {t.back}
              </button>
              <div className="lr-step">{t.module(activeIdx + 1, total)}</div>
              <h1 className="lr-title lr-mtitle-big">{active.title}</h1>

              {embed && (
                <div className="lr-video">
                  <iframe src={embed} title={t.videoTitle} allowFullScreen />
                </div>
              )}
              {active.video_url && !embed && (
                <a className="lr-link" href={active.video_url} target="_blank" rel="noopener noreferrer">
                  {t.watch}
                </a>
              )}

              <div className="lr-lesson" dangerouslySetInnerHTML={{ __html: renderMarkdown(active.content) }} />

              {resources.length > 0 && (
                <>
                  <h2 className="lr-h2">{t.resources}</h2>
                  <ul className="lr-res">
                    {resources.map((r, i) => (
                      <li key={i}>
                        <a href={r.url} target="_blank" rel="noopener noreferrer">
                          {r.label} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {saveErr && <div className="lr-err">{saveErr}</div>}

              {done.has(active.id) ? (
                <div className="lr-donebadge">{t.moduleDone}</div>
              ) : (
                <button className="lr-cta" style={{ marginTop: "1.6rem" }} onClick={() => complete(active.id)} disabled={busy}>
                  {busy ? t.saving : t.finish}
                </button>
              )}

              <div className="lr-nav">
                {activeIdx > 0 && (
                  <button className="lr-ghost" onClick={() => open(modules[activeIdx - 1].id)}>
                    {t.prev}
                  </button>
                )}
                {activeIdx < total - 1 && (
                  <button className="lr-ghost" onClick={() => open(modules[activeIdx + 1].id)}>
                    {t.next}
                  </button>
                )}
              </div>
            </>
          )}

          <div className="lr-foot">
            {t.powered} <strong>Digitelio AI</strong>
          </div>
        </div>
      </div>

      {/* Certificat imprimé (invisible à l'écran) */}
      <CertificateDoc
        formation={{ id: data.ref, title: f.title }}
        name={data.learner}
        instructor={f.instructor}
      />
      <LrStyle />
    </div>
  );
}

function LrStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Manrope:wght@300;400;600;700&family=Noto+Naskh+Arabic:wght@400;700&display=swap');

      .lr-root {
        min-height: 100vh;
        background: #0B0B0B;
        color: #F5F0E1;
        font-family: 'Manrope', 'Noto Naskh Arabic', sans-serif;
        display: flex;
        justify-content: center;
        padding: 1.5rem 1.1rem 3rem;
        box-sizing: border-box;
      }
      .lr-root[dir="rtl"] { font-family: 'Noto Naskh Arabic', 'Manrope', sans-serif; }
      .lr-root[dir="rtl"] .lr-title,
      .lr-root[dir="rtl"] .lr-h2 { font-family: 'Noto Naskh Arabic', serif; letter-spacing: 0; text-transform: none; }
      .lr-root[dir="rtl"] .lr-ed,
      .lr-root[dir="rtl"] .lr-step,
      .lr-root[dir="rtl"] .lr-brand { letter-spacing: 0; }
      .lr-root[dir="rtl"] .lr-ed em { margin-right: 0; }
      .lr-root[dir="rtl"] .lr-lesson ul,
      .lr-root[dir="rtl"] .lr-lesson ol { padding-left: 0; padding-right: 1.3rem; }
      .lr-screen { width: 100%; display: flex; justify-content: center; }
      .lr-wrap { width: 100%; max-width: 36rem; }
      .lr-center { text-align: center; margin: 30vh auto 0; }
      .lr-muted { opacity: 0.7; }
      .lr-brand {
        text-align: center; font-weight: 600; font-size: 1.05rem; letter-spacing: 0.22em; color: #D4AF37;
      }
      .lr-ed {
        display: flex; align-items: center; justify-content: center; gap: 12px;
        margin: 0.4rem 0 1.4rem; color: #D4AF37; font-size: 0.58rem; letter-spacing: 0.4em;
      }
      .lr-ed em { font-style: normal; margin-right: -0.4em; }
      .lr-ed span { display: block; width: 40px; height: 1px; background: #D4AF37; }

      .lr-hello { color: #D4AF37; font-weight: 600; margin-bottom: 0.4rem; }
      .lr-title {
        font-family: 'Cinzel', serif; font-weight: 700; font-size: 1.5rem; line-height: 1.3;
        margin: 0 0 0.5rem; color: #E0BC4A; text-transform: uppercase;
      }
      .lr-mtitle-big { font-size: 1.3rem; }
      .lr-by { font-size: 0.85rem; opacity: 0.75; margin-bottom: 1.2rem; }

      .lr-progress-top { display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600; margin: 1.2rem 0 0.4rem; }
      .lr-progress { height: 10px; border-radius: 999px; background: rgba(255,255,255,0.12); overflow: hidden; }
      .lr-progress-bar { height: 100%; border-radius: 999px; background: #D4AF37; transition: width 0.5s ease; }

      .lr-done {
        margin-top: 1.2rem; padding: 1.1rem; border-radius: 14px; text-align: center;
        border: 1px solid rgba(212,175,55,0.7); background: rgba(212,175,55,0.08);
      }
      .lr-done-title { font-weight: 700; margin-bottom: 0.8rem; }

      .lr-cta {
        display: block; width: 100%; box-sizing: border-box; padding: 0.95rem 1rem; border-radius: 10px;
        background: #D4AF37; color: #0B0B0B; font-weight: 700; font-size: 1rem; border: 0;
        cursor: pointer; font-family: inherit;
      }
      .lr-cta:disabled { opacity: 0.6; }
      .lr-ghost {
        flex: 1; padding: 0.8rem; border-radius: 10px; background: transparent; color: #F5F0E1;
        border: 1px solid rgba(255,255,255,0.25); font-family: inherit; font-weight: 600; cursor: pointer;
      }

      .lr-h2 {
        font-family: 'Cinzel', serif; font-size: 1rem; letter-spacing: 0.15em; text-transform: uppercase;
        color: #D4AF37; margin: 2rem 0 0.9rem;
      }
      .lr-modules { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.6rem; }
      .lr-mod {
        width: 100%; display: flex; gap: 0.9rem; align-items: flex-start; text-align: start;
        padding: 0.8rem; border-radius: 12px; cursor: pointer; font-family: inherit; color: inherit;
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12);
      }
      .lr-num {
        flex: none; width: 2rem; height: 2rem; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; background: #D4AF37; color: #0B0B0B;
      }
      .lr-num.ok { background: #16a34a; color: #fff; }
      .lr-mod-text { flex: 1; }
      .lr-mtitle { font-weight: 600; }
      .lr-msum { font-size: 0.82rem; font-weight: 300; opacity: 0.8; margin-top: 0.15rem; line-height: 1.5; }

      .lr-back {
        background: transparent; border: 0; color: #D4AF37; font-family: inherit;
        font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 0.8rem;
      }
      .lr-step { font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: #D4AF37; margin-bottom: 0.4rem; }

      .lr-video { position: relative; padding-top: 56.25%; margin: 1rem 0; }
      .lr-video iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; border-radius: 12px; }
      .lr-link { display: inline-block; margin: 0.8rem 0; color: #D4AF37; font-weight: 600; }

      .lr-lesson h2 { font-size: 1.15rem; font-weight: 700; margin: 1.4rem 0 0.5rem; color: #fff; }
      .lr-lesson h3 { font-size: 1.05rem; font-weight: 700; margin: 1.3rem 0 0.4rem; color: #E0BC4A; }
      .lr-lesson p { line-height: 1.75; margin: 0.8rem 0; font-weight: 300; color: #ece6d4; }
      .lr-lesson ul { padding-left: 1.3rem; margin: 0.6rem 0; }
      .lr-lesson li { margin: 0.35rem 0; line-height: 1.6; font-weight: 300; }

      .lr-res { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
      .lr-res a { color: #E0BC4A; text-decoration: underline; }
      .lr-err { margin-top: 1rem; color: #f87171; font-size: 0.9rem; }
      .lr-donebadge {
        margin-top: 1.6rem; padding: 0.9rem; border-radius: 10px; text-align: center;
        font-weight: 700; color: #16a34a; border: 1px solid #16a34a;
      }
      .lr-nav { display: flex; gap: 0.6rem; margin-top: 1rem; }
      .lr-foot { margin-top: 2.4rem; text-align: center; font-size: 0.75rem; color: #9c9682; letter-spacing: 0.08em; }
      .lr-foot strong { color: #D4AF37; font-weight: 600; }

      @media print {
        .printing-certificate .lr-screen { display: none !important; }
      }
    `}</style>
  );
}
