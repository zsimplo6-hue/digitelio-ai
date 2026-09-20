import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { renderMarkdown } from "../utils/markdown.js";
import CertificateDoc, { printCertificate } from "../components/CertificateExport.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

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
        if (!res.ok) throw new Error(json.error || "Lien d'accès invalide.");
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
        <p className="lr-center">Chargement...</p>
        <LrStyle />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="lr-root">
        <div className="lr-center">
          <div className="lr-brand">DIGITELIO AI</div>
          <h1 className="lr-title" style={{ fontSize: "1.3rem" }}>Accès indisponible</h1>
          <p className="lr-muted">{error || "Ce lien d'accès n'est pas valide."}</p>
        </div>
        <LrStyle />
      </div>
    );
  }

  const f = data.formation;
  const modules = data.modules || [];
  const done = new Set(data.completed || []);
  const doneCount = modules.filter((m) => done.has(m.id)).length;
  const total = modules.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const finished = total > 0 && doneCount >= total;
  const nextTodo = modules.find((m) => !done.has(m.id));
  const active = modules.find((m) => m.id === activeId);

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
      if (!res.ok) throw new Error(json.error || "Enregistrement impossible.");
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
    <div className="lr-root">
      <div className="lr-screen">
        <div className="lr-wrap">
          <div className="lr-brand">DIGITELIO AI</div>
          <div className="lr-ed">
            <span />
            <em>ESPACE APPRENANT</em>
            <span />
          </div>

          {!active ? (
            <>
              <div className="lr-hello">Bonjour {data.learner}</div>
              <h1 className="lr-title">{f.title}</h1>
              {f.instructor && <div className="lr-by">Par {f.instructor}</div>}

              <div className="lr-progress-top">
                <span>Votre progression</span>
                <span>
                  {doneCount}/{total} · {pct}%
                </span>
              </div>
              <div className="lr-progress">
                <div className="lr-progress-bar" style={{ width: `${Math.max(pct, 3)}%` }} />
              </div>

              {finished && (
                <div className="lr-done">
                  <div className="lr-done-title">🎉 Félicitations, formation terminée !</div>
                  {f.certificate ? (
                    <button className="lr-cta" onClick={printCertificate}>
                      🎓 Télécharger mon certificat
                    </button>
                  ) : (
                    <div className="lr-muted">Vous avez suivi tous les modules.</div>
                  )}
                </div>
              )}

              {nextTodo && (
                <button className="lr-cta" style={{ marginTop: "1.2rem" }} onClick={() => open(nextTodo.id)}>
                  {doneCount === 0 ? "▶ Commencer la formation" : "▶ Continuer"}
                </button>
              )}

              <h2 className="lr-h2">Programme</h2>
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
                ← Programme
              </button>
              <div className="lr-step">
                Module {modules.findIndex((m) => m.id === active.id) + 1} sur {total}
              </div>
              <h1 className="lr-title lr-mtitle-big">{active.title}</h1>

              {embed && (
                <div className="lr-video">
                  <iframe src={embed} title="Vidéo du module" allowFullScreen />
                </div>
              )}
              {active.video_url && !embed && (
                <a className="lr-link" href={active.video_url} target="_blank" rel="noopener noreferrer">
                  ▶ Regarder la vidéo ↗
                </a>
              )}

              <div className="lr-lesson" dangerouslySetInnerHTML={{ __html: renderMarkdown(active.content) }} />

              {resources.length > 0 && (
                <>
                  <h2 className="lr-h2">Ressources</h2>
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
                <div className="lr-donebadge">✓ Module terminé</div>
              ) : (
                <button className="lr-cta" style={{ marginTop: "1.6rem" }} onClick={() => complete(active.id)} disabled={busy}>
                  {busy ? "Enregistrement..." : "✓ Terminer ce module"}
                </button>
              )}

              <div className="lr-nav">
                {modules.findIndex((m) => m.id === active.id) > 0 && (
                  <button
                    className="lr-ghost"
                    onClick={() => open(modules[modules.findIndex((m) => m.id === active.id) - 1].id)}
                  >
                    ← Précédent
                  </button>
                )}
                {modules.findIndex((m) => m.id === active.id) < total - 1 && (
                  <button
                    className="lr-ghost"
                    onClick={() => open(modules[modules.findIndex((m) => m.id === active.id) + 1].id)}
                  >
                    Suivant →
                  </button>
                )}
              </div>
            </>
          )}

          <div className="lr-foot">
            Propulsé par <strong>Digitelio AI</strong>
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
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Manrope:wght@300;400;600;700&display=swap');

      .lr-root {
        min-height: 100vh;
        background: #0B0B0B;
        color: #F5F0E1;
        font-family: 'Manrope', sans-serif;
        display: flex;
        justify-content: center;
        padding: 1.5rem 1.1rem 3rem;
        box-sizing: border-box;
      }
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
        width: 100%; display: flex; gap: 0.9rem; align-items: flex-start; text-align: left;
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
