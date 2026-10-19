import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";
const CHECK_EVERY_MS = 45 * 1000;
let lastCheck = 0;

const COLORS = ["#3B82F6", "#8B5CF6", "#D4AF37", "#f3d77a", "#22c55e", "#ef4444", "#ec4899"];

/* Notification plein écran quand une récompense d'affiliation vient d'être accordée */
export default function AffiliateCelebration() {
  const navigate = useNavigate();
  const [reward, setReward] = useState(null);

  useEffect(() => {
    if (Date.now() - lastCheck < CHECK_EVERY_MS) return;
    lastCheck = Date.now();
    let alive = true;
    fetch(`${API}/api/affiliate/notice`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (alive && json?.reward) setReward(json.reward);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const confetti = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.6,
        duration: 3.2 + Math.random() * 2.6,
        size: 7 + Math.random() * 8,
        color: COLORS[i % COLORS.length],
        round: i % 3 === 0,
        drift: (Math.random() - 0.5) * 140,
      })),
    []
  );

  function markSeen(id) {
    fetch(`${API}/api/affiliate/seen`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  function close(goToPlan = false) {
    if (reward) markSeen(reward.id);
    setReward(null);
    if (goToPlan) navigate("/dashboard/abonnements");
  }

  useEffect(() => {
    if (!reward) return;
    const onKey = (e) => e.key === "Escape" && close(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reward]);

  if (!reward) return null;

  return (
    <div className="afc-overlay" role="dialog" aria-modal="true" aria-labelledby="afc-title">
      <div className="afc-confetti" aria-hidden="true">
        {confetti.map((c) => (
          <span
            key={c.id}
            className={c.round ? "afc-piece round" : "afc-piece"}
            style={{
              left: `${c.left}%`,
              width: c.size,
              height: c.round ? c.size : c.size * 1.7,
              background: c.color,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
              "--drift": `${c.drift}px`,
            }}
          />
        ))}
      </div>

      <div className="afc-card">
        <div className="afc-glow" aria-hidden="true" />
        <div className="afc-gift" aria-hidden="true">🎁</div>

        <p className="afc-kicker">Récompense débloquée</p>
        <h2 id="afc-title" className="afc-title">
          Félicitations ! 🎉
        </h2>
        <p className="afc-text">
          Vos <b>3 filleuls</b> se sont abonnés à Digitelio AI. Merci de faire grandir la communauté !
        </p>

        <div className="afc-prize">
          <span className="afc-prize-days">30 jours</span>
          <span className="afc-prize-plan">d'abonnement {reward.plan_name} offerts</span>
        </div>

        <p className="afc-note">Votre abonnement est déjà activé. Profitez-en dès maintenant !</p>

        <button type="button" className="afc-btn" onClick={() => close(true)}>
          Voir mon abonnement
        </button>
        <button type="button" className="afc-link" onClick={() => close(false)}>
          Continuer
        </button>
      </div>

      <style>{`
        .afc-overlay {
          position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center;
          padding: 1.2rem; overflow: hidden;
          background: radial-gradient(circle at 50% 30%, rgba(139,92,246,0.45), rgba(8,10,30,0.88) 70%);
          -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
          animation: afc-fade 0.4s ease both;
        }
        @keyframes afc-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes afc-pop {
          0% { opacity: 0; transform: translateY(40px) scale(0.86); }
          60% { opacity: 1; transform: translateY(-6px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes afc-fall {
          0% { transform: translate3d(0, -12vh, 0) rotate(0deg); opacity: 0; }
          8% { opacity: 1; }
          100% { transform: translate3d(var(--drift), 108vh, 0) rotate(720deg); opacity: 0.9; }
        }
        @keyframes afc-bounce { 0%, 100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-12px) rotate(4deg); } }
        @keyframes afc-shine { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        @keyframes afc-spin { to { transform: rotate(360deg); } }

        .afc-confetti { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .afc-piece {
          position: absolute; top: 0; border-radius: 2px; opacity: 0;
          animation-name: afc-fall; animation-timing-function: linear; animation-iteration-count: infinite;
        }
        .afc-piece.round { border-radius: 50%; }

        .afc-card {
          position: relative; width: 100%; max-width: 26rem; padding: 2.2rem 1.6rem 1.6rem; text-align: center;
          border-radius: 28px; color: #fff; isolation: isolate;
          background: linear-gradient(160deg, rgba(30,24,70,0.96), rgba(14,12,40,0.97));
          box-shadow: 0 40px 90px -20px rgba(139,92,246,0.7), 0 0 0 1px rgba(255,255,255,0.1);
          animation: afc-pop 0.7s cubic-bezier(.2,.9,.3,1.1) both;
        }
        .afc-card::before {
          content: ""; position: absolute; inset: 0; padding: 2px; border-radius: 28px; pointer-events: none; z-index: -1;
          background: linear-gradient(120deg,#3B82F6,#8B5CF6,#D4AF37,#3B82F6); background-size: 300% 300%;
          animation: afc-shine 5s linear infinite;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
        }
        .afc-glow {
          position: absolute; top: -70px; left: 50%; width: 220px; height: 220px; margin-left: -110px; z-index: -1;
          border-radius: 50%; filter: blur(46px); opacity: 0.8;
          background: conic-gradient(from 0deg, #3B82F6, #8B5CF6, #D4AF37, #3B82F6);
          animation: afc-spin 8s linear infinite;
        }
        .afc-gift { font-size: 4rem; line-height: 1; display: inline-block; animation: afc-bounce 1.6s ease-in-out infinite; filter: drop-shadow(0 10px 18px rgba(0,0,0,0.4)); }
        .afc-kicker { margin: 0.9rem 0 0; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: #f3d77a; }
        .afc-title { margin: 0.35rem 0 0.6rem; font-size: 1.9rem; font-weight: 900; letter-spacing: -0.02em; }
        .afc-text { margin: 0 auto; max-width: 21rem; font-size: 0.95rem; line-height: 1.6; opacity: 0.88; }

        .afc-prize {
          margin: 1.3rem auto 0.8rem; padding: 1rem 1.1rem; border-radius: 20px; display: grid; gap: 0.15rem;
          background: linear-gradient(120deg, rgba(212,175,55,0.22), rgba(243,215,122,0.1));
          border: 1px solid rgba(243,215,122,0.55);
        }
        .afc-prize-days {
          font-size: 2.3rem; font-weight: 900; line-height: 1.1; letter-spacing: -0.02em;
          background: linear-gradient(120deg,#D4AF37,#f3d77a,#D4AF37); background-size: 200% 100%;
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;
          animation: afc-shine 3s linear infinite;
        }
        .afc-prize-plan { font-size: 0.95rem; font-weight: 700; }
        .afc-note { margin: 0 0 1.3rem; font-size: 0.82rem; opacity: 0.7; }

        .afc-btn {
          width: 100%; padding: 0.95rem 1rem; border: 0; border-radius: 16px; cursor: pointer;
          font-family: inherit; font-size: 1rem; font-weight: 800; color: #fff;
          background: linear-gradient(120deg,#3B82F6,#8B5CF6,#3B82F6); background-size: 220% 100%;
          box-shadow: 0 14px 30px -10px rgba(99,102,241,0.9);
          animation: afc-shine 4s linear infinite;
          transition: transform 0.25s cubic-bezier(.2,.8,.2,1);
        }
        .afc-btn:hover { transform: translateY(-3px) scale(1.02); }
        .afc-btn:active { transform: scale(0.97); }
        .afc-link {
          margin-top: 0.7rem; padding: 0.5rem 1rem; border: 0; background: transparent; cursor: pointer;
          font-family: inherit; font-size: 0.88rem; font-weight: 600; color: rgba(255,255,255,0.7);
        }
        .afc-link:hover { color: #fff; }

        @media (prefers-reduced-motion: reduce) {
          .afc-piece, .afc-gift, .afc-glow, .afc-card::before, .afc-prize-days, .afc-btn { animation: none !important; }
          .afc-piece { display: none; }
        }
      `}</style>
    </div>
  );
      }
                 
