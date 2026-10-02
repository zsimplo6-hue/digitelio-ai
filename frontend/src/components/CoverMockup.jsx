import { useEffect, useRef, useState } from "react";
import { Card } from "./ui/Card.jsx";
import { Button } from "./ui/Button.jsx";

const THEMES = {
  sombre: { label: "Sombre & or", bg: ["#262626", "#040404"], glow: "rgba(212,175,55,0.35)" },
  clair: { label: "Clair", bg: ["#ffffff", "#d5d8e2"], glow: "rgba(124,58,237,0.15)" },
  violet: { label: "Violet", bg: ["#4a22a8", "#0c0520"], glow: "rgba(193,59,245,0.45)" },
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image illisible."));
    img.src = src;
  });
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("Impossible de lire l'image."));
    r.readAsDataURL(file);
  });
}

function averageColor(img) {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0, 1, 1);
    const [r, g, b] = x.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
  } catch {
    return [40, 40, 40];
  }
}

function drawMockup(canvas, img, themeKey) {
  const S = 1600;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  const th = THEMES[themeKey];

  // Fond
  const bg = ctx.createRadialGradient(S / 2, S * 0.4, 100, S / 2, S / 2, S * 0.85);
  bg.addColorStop(0, th.bg[0]);
  bg.addColorStop(1, th.bg[1]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);
  const glow = ctx.createRadialGradient(S / 2, S * 0.45, 0, S / 2, S * 0.45, S * 0.5);
  glow.addColorStop(0, th.glow);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  // Géométrie du livre
  const ratio = img.height / img.width;
  let W = 720;
  let H = W * ratio;
  if (H > 980) {
    H = 980;
    W = H / ratio;
  }
  const T = Math.max(60, W * 0.11);
  const phi = 0.5;
  const d = 2600;
  const cx = S / 2 + 30;
  const cy = S / 2 - 30;

  const proj = (x, z) => {
    const X = x * Math.cos(phi) - z * Math.sin(phi);
    const Z = x * Math.sin(phi) + z * Math.cos(phi);
    const s = d / (d + Z);
    return { x: cx + X * s, s };
  };

  // Ombre au sol
  ctx.save();
  ctx.translate(cx, cy + H / 2 + 50);
  ctx.scale(1, 0.1);
  const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.9);
  sh.addColorStop(0, "rgba(0,0,0,0.65)");
  sh.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.arc(0, 0, W * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Tranche
  const [r, g, b] = averageColor(img);
  const fl = proj(-W / 2, -T / 2);
  const bl = proj(-W / 2, T / 2);
  const sp = ctx.createLinearGradient(bl.x, 0, fl.x, 0);
  sp.addColorStop(0, `rgb(${r * 0.3},${g * 0.3},${b * 0.3})`);
  sp.addColorStop(1, `rgb(${r * 0.6},${g * 0.6},${b * 0.6})`);
  ctx.fillStyle = sp;
  ctx.beginPath();
  ctx.moveTo(bl.x, cy - (H / 2) * bl.s);
  ctx.lineTo(fl.x, cy - (H / 2) * fl.s);
  ctx.lineTo(fl.x, cy + (H / 2) * fl.s);
  ctx.lineTo(bl.x, cy + (H / 2) * bl.s);
  ctx.closePath();
  ctx.fill();

  // Face avant (tranches verticales pour la perspective)
  const N = 500;
  const sw = img.width / N;
  for (let i = 0; i < N; i++) {
    const p0 = proj(-W / 2 + (i / N) * W, -T / 2);
    const p1 = proj(-W / 2 + ((i + 1) / N) * W, -T / 2);
    ctx.drawImage(img, i * sw, 0, sw, img.height, p0.x, cy - (H / 2) * p0.s, p1.x - p0.x + 1, H * p0.s);
  }

  // Reflets et pli près de la tranche
  const fr = proj(W / 2, -T / 2);
  const gl = ctx.createLinearGradient(fl.x, 0, fr.x, 0);
  gl.addColorStop(0, "rgba(0,0,0,0.38)");
  gl.addColorStop(0.04, "rgba(255,255,255,0.14)");
  gl.addColorStop(0.08, "rgba(0,0,0,0.10)");
  gl.addColorStop(0.45, "rgba(255,255,255,0.07)");
  gl.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.moveTo(fl.x, cy - (H / 2) * fl.s);
  ctx.lineTo(fr.x, cy - (H / 2) * fr.s);
  ctx.lineTo(fr.x, cy + (H / 2) * fr.s);
  ctx.lineTo(fl.x, cy + (H / 2) * fl.s);
  ctx.closePath();
  ctx.fill();
}

export default function CoverMockup({ initialSrc = "", title = "ebook" }) {
  const canvasRef = useRef(null);
  const [src, setSrc] = useState(initialSrc || "");
  const [theme, setTheme] = useState("sombre");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!src || !canvasRef.current) return;
    let alive = true;
    loadImage(src)
      .then((img) => alive && drawMockup(canvasRef.current, img, theme))
      .catch((e) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, [src, theme]);

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    if (!file.type.startsWith("image/")) return setErr("Choisissez une image (JPG, PNG ou WebP).");
    try {
      setSrc(await readFile(file));
    } catch (e2) {
      setErr(e2.message);
    }
  }

  function download() {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `mockup-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, "image/png");
  }

  return (
    <Card className="no-print" title="Mockup 3D de la couverture">
      <p className="dg-helper-text" style={{ marginTop: 0 }}>
        Envoyez l'image de la couverture de votre e-book : elle est transformée en mockup 3D à télécharger
        pour vos publications.
      </p>

      <div className="dg-cover-actions">
        <label className="dg-chip">
          {src ? "Changer la couverture" : "+ Envoyer ma couverture"}
          <input type="file" accept="image/*" onChange={onFile} hidden />
        </label>
        {Object.entries(THEMES).map(([k, t]) => (
          <button
            key={k}
            type="button"
            className="dg-chip"
            style={theme === k ? { borderColor: "#7C3AED", fontWeight: 700 } : undefined}
            onClick={() => setTheme(k)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {err && <div className="dg-alert dg-alert--error">{err}</div>}

      {src && (
        <>
          <canvas ref={canvasRef} style={{ width: "100%", height: "auto", borderRadius: 12, marginTop: 12 }} />
          <Button variant="primary" size="lg" onClick={download} style={{ width: "100%" }}>
            ⬇️ Télécharger mon mockup
          </Button>
        </>
      )}
    </Card>
  );
                     }
