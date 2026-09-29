import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { formatPrice } from "../utils/currency.js";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

export default function EbookPublic() {
  const { id } = useParams();
  const [b, setB] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  /* Mesure d'audience : simples compteurs, sans cookie ni donnée personnelle */
  function track(type, unique = false) {
    fetch(`${API}/api/public/ebooks/${id}/track`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, unique }),
      keepalive: true,
    }).catch(() => {});
  }

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`${API}/api/public/ebooks/${id}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "eBook introuvable.");
        if (alive) {
          setB(data.ebook);
          document.title = `${data.ebook.title} | Digitelio AI`;

          let unique = false;
          try {
            const key = `dg_seen_ebook_${id}`;
            if (!localStorage.getItem(key)) {
              unique = true;
              localStorage.setItem(key, "1");
            }
          } catch {
            /* stockage indisponible : la visite est comptée sans marque d'unicité */
          }
          track("view", unique);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="ep-root">
        <p className="ep-center">Chargement...</p>
        <EpStyle />
      </div>
    );
  }

  if (error || !b) {
    return (
      <div className="ep-root">
        <div className="ep-center">
          <div className="ep-brand">DIGITELIO AI</div>
          <h1 className="ep-title" style={{ fontSize: "1.4rem" }}>eBook indisponible</h1>
          <p className="ep-muted">{error || "Cet eBook n'existe pas ou n'est plus en vente."}</p>
        </div>
        <EpStyle />
      </div>
    );
  }

  const priceStr = formatPrice(b.price, b.currency);
  const cta = `Acheter l'eBook · ${priceStr}`;
  const buyHref = b.pay_code ? `/pay/${b.pay_code}` : "";

  const Cta = ({ className = "" }) =>
    buyHref ? (
      <a
        className={`ep-cta ${className}`}
        href={buyHref}
        onClick={() => track("click")}
      >
        {cta}
      </a>
    ) : (
      <button className={`ep-cta ep-cta-off ${className}`} disabled>
        Bientôt disponible
      </button>
    );

  return (
    <div className="ep-root">
      <div className="ep-wrap">
        <div className="ep-brand">DIGITELIO AI</div>
        <div className="ep-ed">
          <span />
          <em>ÉDITIONS</em>
          <span />
        </div>

        {b.cover_url ? (
          <div className="ep-cover">
            <img src={b.cover_url} alt={b.title} />
          </div>
        ) : (
          <div className="ep-cover ep-cover-empty">
            <span>◆</span>
          </div>
        )}

        <h1 className="ep-title">{b.title}</h1>
        {b.description && <p className="ep-desc">{b.description}</p>}
        {b.author && <div className="ep-by">Par {b.author}</div>}

        <div className="ep-pricebox">
          <div className="ep-price">{priceStr}</div>
          <Cta />
          {!buyHref && (
            <div className="ep-muted ep-small">Le paiement n'est pas encore disponible.</div>
          )}
        </div>

        <h2 className="ep-h2">Ce qui est inclus</h2>
        <ul className="ep-incl">
          <li>◆ eBook complet en version numérique</li>
          <li>◆ Lecture immédiate depuis votre navigateur</li>
          <li>◆ Téléchargement en PDF, à tout moment</li>
        </ul>

        <div className="ep-bottom">
          <Cta />
        </div>

        <div className="ep-foot">
          Propulsé par <strong>Digitelio AI</strong>
        </div>
      </div>
      <EpStyle />
    </div>
  );
}

function EpStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Manrope:wght@300;400;600;700&display=swap');

      .ep-root {
        min-height: 100vh;
        background: #0B0B0B;
        color: #F5F0E1;
        font-family: 'Manrope', sans-serif;
        display: flex;
        justify-content: center;
        padding: 1.5rem 1.1rem 3rem;
        box-sizing: border-box;
      }
      .ep-wrap { width: 100%; max-width: 34rem; text-align: center; }
      .ep-center { text-align: center; margin: 30vh auto 0; }
      .ep-brand {
        font-weight: 600; font-size: 1.1rem; letter-spacing: 0.22em; color: #D4AF37;
      }
      .ep-ed {
        display: flex; align-items: center; justify-content: center; gap: 12px;
        margin: 0.4rem 0 1.4rem; color: #D4AF37; font-size: 0.62rem; letter-spacing: 0.5em;
      }
      .ep-ed em { font-style: normal; margin-right: -0.5em; }
      .ep-ed span { display: block; width: 50px; height: 1px; background: #D4AF37; }

      .ep-cover {
        width: 100%; aspect-ratio: 3 / 4; max-width: 18rem; margin: 0 auto;
        border-radius: 14px; overflow: hidden;
        border: 1px solid rgba(212,175,55,0.5);
        box-shadow: 0 0 30px rgba(212,175,55,0.15);
      }
      .ep-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .ep-cover-empty {
        display: flex; align-items: center; justify-content: center;
        background: linear-gradient(135deg, #151515, #0B0B0B);
        color: #D4AF37; font-size: 2rem;
      }

      .ep-title {
        font-family: 'Cinzel', serif; font-weight: 700; font-size: 1.7rem; line-height: 1.25;
        margin: 1.4rem 0 0.7rem; color: #E0BC4A; text-transform: uppercase;
      }
      .ep-desc { font-weight: 300; line-height: 1.7; margin: 0 0 0.8rem; color: #e8e2d0; }
      .ep-by { font-size: 0.85rem; color: #D4AF37; letter-spacing: 0.05em; }
      .ep-muted { opacity: 0.7; }
      .ep-small { font-size: 0.8rem; margin-top: 0.6rem; }

      .ep-pricebox {
        margin: 1.6rem 0 0.5rem; padding: 1.3rem 1.1rem; border-radius: 14px;
        border: 1px solid rgba(212,175,55,0.6); background: rgba(212,175,55,0.06);
      }
      .ep-price { font-family: 'Cinzel', serif; font-weight: 700; font-size: 2.2rem; color: #fff; margin-bottom: 0.9rem; }
      .ep-cta {
        display: block; width: 100%; box-sizing: border-box; padding: 0.95rem 1rem; border-radius: 10px;
        background: #D4AF37; color: #0B0B0B !important; font-weight: 700; font-size: 1rem;
        text-decoration: none; border: 0; cursor: pointer; font-family: inherit;
      }
      .ep-cta-off { background: rgba(255,255,255,0.12); color: #bbb !important; cursor: not-allowed; }

      .ep-h2 {
        font-family: 'Cinzel', serif; font-size: 1.1rem; letter-spacing: 0.15em; text-transform: uppercase;
        color: #D4AF37; margin: 2.2rem 0 1rem;
      }
      .ep-incl { list-style: none; padding: 0; margin: 0; text-align: left; display: grid; gap: 0.6rem; font-weight: 300; }
      .ep-bottom { margin-top: 2rem; }
      .ep-foot { margin-top: 2.2rem; font-size: 0.75rem; color: #9c9682; letter-spacing: 0.08em; }
      .ep-foot strong { color: #D4AF37; font-weight: 600; }
    `}</style>
  );
}
