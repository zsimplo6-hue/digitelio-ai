import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { formatPrice } from "../utils/currency.js";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

export default function FormationPublic() {
  const { id } = useParams();
  const [f, setF] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`${API}/api/public/formations/${id}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Formation introuvable.");
        if (alive) {
          setF(data.formation);
          document.title = `${data.formation.title} | Digitelio AI`;
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
  }, [id]);

  if (loading) {
    return (
      <div className="fp-root">
        <p className="fp-center">Chargement...</p>
        <FpStyle />
      </div>
    );
  }

  if (error || !f) {
    return (
      <div className="fp-root">
        <div className="fp-center">
          <div className="fp-brand">DIGITELIO AI</div>
          <h1 className="fp-title" style={{ fontSize: "1.4rem" }}>Formation indisponible</h1>
          <p className="fp-muted">{error || "Cette formation n'existe pas ou n'est plus en vente."}</p>
        </div>
        <FpStyle />
      </div>
    );
  }

  const isFree = f.price === 0;
  const priceStr = formatPrice(f.price, f.currency);
  const cta = isFree ? "S'inscrire gratuitement" : `Acheter la formation · ${priceStr}`;
  const modules = f.modules || [];

  const Cta = ({ className = "" }) =>
    f.payment_url ? (
      <a className={`fp-cta ${className}`} href={f.payment_url} target="_blank" rel="noopener noreferrer">
        {cta}
      </a>
    ) : (
      <button className={`fp-cta fp-cta-off ${className}`} disabled>
        Bientôt disponible
      </button>
    );

  return (
    <div className="fp-root">
      <div className="fp-wrap">
        <div className="fp-brand">DIGITELIO AI</div>
        <div className="fp-ed">
          <span />
          <em>FORMATION</em>
          <span />
        </div>

        {f.cover_url ? (
          <div className="fp-cover">
            <img src={f.cover_url} alt={f.title} />
          </div>
        ) : (
          <div className="fp-cover fp-cover-empty">
            <span>◆</span>
          </div>
        )}

        <h1 className="fp-title">{f.title}</h1>
        {f.description && <p className="fp-desc">{f.description}</p>}
        {f.instructor && <div className="fp-by">Par {f.instructor}</div>}

        <div className="fp-pricebox">
          <div className="fp-price">{priceStr}</div>
          <Cta />
          {!f.payment_url && (
            <div className="fp-muted fp-small">Le lien de paiement n'est pas encore disponible.</div>
          )}
        </div>

        <h2 className="fp-h2">Au programme</h2>
        <ol className="fp-modules">
          {modules.map((m, i) => (
            <li key={i}>
              <span className="fp-num">{i + 1}</span>
              <div>
                <div className="fp-mtitle">{m.title}</div>
                {m.summary && <div className="fp-msum">{m.summary}</div>}
              </div>
            </li>
          ))}
        </ol>

        <h2 className="fp-h2">Ce qui est inclus</h2>
        <ul className="fp-incl">
          <li>◆ {modules.length} modules de formation</li>
          <li>◆ Leçons détaillées avec exercices et résumés</li>
          <li>◆ Vidéos, ressources et supports PDF téléchargeables</li>
          {f.certificate && <li>◆ Certificat de réussite</li>}
        </ul>

        <div className="fp-bottom">
          <Cta />
        </div>

        <div className="fp-foot">
          Propulsé par <strong>Digitelio AI</strong>
        </div>
      </div>
      <FpStyle />
    </div>
  );
}

function FpStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Manrope:wght@300;400;600;700&display=swap');

      .fp-root {
        min-height: 100vh;
        background: #0B0B0B;
        color: #F5F0E1;
        font-family: 'Manrope', sans-serif;
        display: flex;
        justify-content: center;
        padding: 1.5rem 1.1rem 3rem;
        box-sizing: border-box;
      }
      .fp-wrap { width: 100%; max-width: 34rem; text-align: center; }
      .fp-center { text-align: center; margin: 30vh auto 0; }
      .fp-brand {
        font-weight: 600; font-size: 1.1rem; letter-spacing: 0.22em; color: #D4AF37;
      }
      .fp-ed {
        display: flex; align-items: center; justify-content: center; gap: 12px;
        margin: 0.4rem 0 1.4rem; color: #D4AF37; font-size: 0.62rem; letter-spacing: 0.5em;
      }
      .fp-ed em { font-style: normal; margin-right: -0.5em; }
      .fp-ed span { display: block; width: 50px; height: 1px; background: #D4AF37; }

      .fp-cover {
        width: 100%; aspect-ratio: 16 / 9; border-radius: 14px; overflow: hidden;
        border: 1px solid rgba(212,175,55,0.5);
        box-shadow: 0 0 30px rgba(212,175,55,0.15);
      }
      .fp-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .fp-cover-empty {
        display: flex; align-items: center; justify-content: center;
        background: linear-gradient(135deg, #151515, #0B0B0B);
        color: #D4AF37; font-size: 2rem;
      }

      .fp-title {
        font-family: 'Cinzel', serif; font-weight: 700; font-size: 1.7rem; line-height: 1.25;
        margin: 1.4rem 0 0.7rem; color: #E0BC4A; text-transform: uppercase;
      }
      .fp-desc { font-weight: 300; line-height: 1.7; margin: 0 0 0.8rem; color: #e8e2d0; }
      .fp-by { font-size: 0.85rem; color: #D4AF37; letter-spacing: 0.05em; }
      .fp-muted { opacity: 0.7; }
      .fp-small { font-size: 0.8rem; margin-top: 0.6rem; }

      .fp-pricebox {
        margin: 1.6rem 0 0.5rem; padding: 1.3rem 1.1rem; border-radius: 14px;
        border: 1px solid rgba(212,175,55,0.6); background: rgba(212,175,55,0.06);
      }
      .fp-price { font-family: 'Cinzel', serif; font-weight: 700; font-size: 2.2rem; color: #fff; margin-bottom: 0.9rem; }
      .fp-cta {
        display: block; width: 100%; box-sizing: border-box; padding: 0.95rem 1rem; border-radius: 10px;
        background: #D4AF37; color: #0B0B0B !important; font-weight: 700; font-size: 1rem;
        text-decoration: none; border: 0; cursor: pointer; font-family: inherit;
      }
      .fp-cta-off { background: rgba(255,255,255,0.12); color: #bbb !important; cursor: not-allowed; }

      .fp-h2 {
        font-family: 'Cinzel', serif; font-size: 1.1rem; letter-spacing: 0.15em; text-transform: uppercase;
        color: #D4AF37; margin: 2.2rem 0 1rem;
      }
      .fp-modules { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.9rem; text-align: left; }
      .fp-modules li { display: flex; gap: 0.9rem; align-items: flex-start; }
      .fp-num {
        flex: none; width: 2rem; height: 2rem; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; background: #D4AF37; color: #0B0B0B;
      }
      .fp-mtitle { font-weight: 600; }
      .fp-msum { font-size: 0.85rem; font-weight: 300; opacity: 0.8; margin-top: 0.15rem; line-height: 1.5; }

      .fp-incl { list-style: none; padding: 0; margin: 0; text-align: left; display: grid; gap: 0.6rem; font-weight: 300; }
      .fp-bottom { margin-top: 2rem; }
      .fp-foot { margin-top: 2.2rem; font-size: 0.75rem; color: #9c9682; letter-spacing: 0.08em; }
      .fp-foot strong { color: #D4AF37; font-weight: 600; }
    `}</style>
  );
            }
