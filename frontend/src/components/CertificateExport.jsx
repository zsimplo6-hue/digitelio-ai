/* Charge les polices AVANT l'impression (le document est caché à l'écran) */
async function ensureFonts() {
  if (!document.fonts || !document.fonts.load) return;
  const sample = "AaÉéèêàçÔô0123456789";
  const loads = [
    "700 1em Cinzel",
    "400 1em Cinzel",
    "300 1em Manrope",
    "600 1em Manrope",
    "400 1em Inter",
  ].map((f) => document.fonts.load(f, sample));
  await Promise.race([
    Promise.allSettled(loads),
    new Promise((resolve) => setTimeout(resolve, 4000)),
  ]);
}

/* Lance l'impression du certificat en paysage */
export async function printCertificate() {
  await ensureFonts();

  const style = document.createElement("style");
  style.textContent = "@page { size: A4 landscape; margin: 0; }";
  document.body.appendChild(style);
  document.body.classList.add("printing-certificate");

  const cleanup = () => {
    document.body.classList.remove("printing-certificate");
    style.remove();
    window.removeEventListener("afterprint", cleanup);
    document.removeEventListener("pointerdown", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  document.addEventListener("pointerdown", cleanup);

  setTimeout(() => window.print(), 300);
}

export default function CertificateDoc({ formation, name, instructor }) {
  const now = new Date();
  const dateLabel = now.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const number = `DIG-${String(formation.id || "").slice(0, 6).toUpperCase()}-${ymd}`;

  const cleanName = (name || "").trim();
  const nameSize = cleanName.length > 32 ? "1.6rem" : cleanName.length > 22 ? "2rem" : "2.6rem";
  const title = formation.title || "";
  const titleSize = title.length > 60 ? "1.1rem" : title.length > 40 ? "1.3rem" : "1.6rem";

  return (
    <div className="cert-doc">
      <div className="cert-page">
        <div className="cert-ribbon cert-tl" />
        <div className="cert-ribbon cert-tl2" />
        <div className="cert-ribbon cert-br" />
        <div className="cert-ribbon cert-br2" />
        <div className="cert-frame" />
        <div className="cert-frame cert-frame2" />

        <div className="cert-inner">
          <div className="cert-brand">DIGITELIO AI</div>
          <div className="cert-ed">
            <span />
            <em>ÉDITIONS</em>
            <span />
          </div>

          <h1 className="cert-title">CERTIFICAT</h1>
          <div className="cert-sub">DE RÉUSSITE</div>

          <div className="cert-divider">
            <span />
            <i />
            <span />
          </div>

          <div className="cert-lead">Ce certificat est décerné à</div>
          <div className="cert-name" style={{ fontSize: nameSize }}>
            {cleanName || "Nom de l'apprenant"}
          </div>
          <div className="cert-lead">pour avoir suivi avec succès la formation</div>
          <div className="cert-course" style={{ fontSize: titleSize }}>
            {title}
          </div>

          <div className="cert-foot">
            <div className="cert-col">
              <div className="cert-line" />
              <div className="cert-small">{dateLabel}</div>
              <div className="cert-tiny">Date de délivrance</div>
            </div>
            <div className="cert-seal">
              <span>◆</span>
            </div>
            <div className="cert-col">
              <div className="cert-line" />
              <div className="cert-small">{instructor || "Digitelio AI"}</div>
              <div className="cert-tiny">Formateur</div>
            </div>
          </div>

          <div className="cert-num">Certificat n° {number}</div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Manrope:wght@300;400;600&family=Inter:wght@400&display=swap');

        .cert-doc { display: none; }

        @media print {
          .printing-certificate .fm-sheet,
          .printing-certificate .fx-doc { display: none !important; }
          .printing-certificate .cert-doc { display: block !important; }

          .printing-certificate html,
          .printing-certificate body {
            background: #0B0B0B !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          .printing-certificate *:has(.cert-doc) {
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

          .cert-doc, .cert-doc * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .cert-page {
            position: relative;
            overflow: hidden;
            width: 100%;
            height: 208mm;
            background: #0B0B0B;
            color: #F5F0E1;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-family: 'Manrope', sans-serif;
            break-inside: avoid;
          }
          .cert-page::before {
            content: "";
            position: absolute;
            inset: 0;
            opacity: 0.14;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          }
          .cert-ribbon {
            position: absolute;
            width: 55%;
            height: 2px;
            background: linear-gradient(90deg, transparent, #D4AF37, transparent);
            box-shadow: 0 0 14px rgba(212,175,55,0.8);
          }
          .cert-tl  { top: 12%; left: -14%; transform: rotate(-38deg); }
          .cert-tl2 { top: 17%; left: -17%; transform: rotate(-38deg); opacity: 0.45; }
          .cert-br  { bottom: 12%; right: -14%; transform: rotate(-38deg); }
          .cert-br2 { bottom: 17%; right: -17%; transform: rotate(-38deg); opacity: 0.45; }

          .cert-frame {
            position: absolute;
            inset: 8mm;
            border: 1.2px solid #D4AF37;
          }
          .cert-frame2 {
            inset: 11mm;
            border-width: 0.5px;
            opacity: 0.6;
          }

          .cert-inner {
            position: relative;
            z-index: 1;
            width: 78%;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .cert-brand {
            font-weight: 600;
            font-size: 1.05rem;
            letter-spacing: 0.22em;
            color: #D4AF37;
          }
          .cert-ed {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 1.5mm;
            color: #D4AF37;
            font-size: 0.6rem;
            letter-spacing: 0.5em;
          }
          .cert-ed em { font-style: normal; margin-right: -0.5em; }
          .cert-ed span, .cert-divider span {
            display: block;
            width: 50px;
            height: 1px;
            background: #D4AF37;
          }
          .cert-title {
            font-family: 'Cinzel', serif;
            font-weight: 700;
            font-size: 2.7rem;
            letter-spacing: 0.12em;
            margin: 7mm 0 0;
            line-height: 1.1;
            color: #E0BC4A;
            text-shadow: 0 0 16px rgba(212,175,55,0.25);
          }
          .cert-sub {
            font-family: 'Cinzel', serif;
            font-size: 1.1rem;
            letter-spacing: 0.55em;
            margin-right: -0.55em;
            margin-top: 1.5mm;
            color: #fff;
          }
          .cert-divider { display: flex; align-items: center; gap: 10px; margin: 5mm 0; }
          .cert-divider i {
            width: 8px; height: 8px; background: #D4AF37; transform: rotate(45deg);
          }
          .cert-lead {
            font-weight: 300;
            font-size: 0.85rem;
            color: #e8e2d0;
          }
          .cert-name {
            font-family: 'Cinzel', serif;
            font-weight: 400;
            color: #fff;
            margin: 3mm 0 4mm;
            padding: 0 8mm 2mm;
            border-bottom: 1px solid #D4AF37;
            line-height: 1.2;
            max-width: 100%;
          }
          .cert-course {
            font-family: 'Cinzel', serif;
            font-weight: 700;
            color: #E0BC4A;
            margin-top: 2.5mm;
            line-height: 1.3;
            max-width: 90%;
          }

          .cert-foot {
            width: 100%;
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            margin-top: 9mm;
          }
          .cert-col { width: 34%; text-align: center; }
          .cert-line { height: 1px; background: #D4AF37; margin-bottom: 2mm; }
          .cert-small { font-size: 0.85rem; color: #fff; font-weight: 600; }
          .cert-tiny { font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase; color: #D4AF37; margin-top: 1mm; }
          .cert-seal {
            width: 17mm; height: 17mm; border-radius: 50%;
            border: 1.5px solid #D4AF37;
            display: flex; align-items: center; justify-content: center;
            color: #D4AF37; font-size: 1.2rem;
            box-shadow: 0 0 14px rgba(212,175,55,0.35);
          }
          .cert-num {
            margin-top: 6mm;
            font-size: 0.6rem;
            letter-spacing: 0.15em;
            color: #9c9682;
          }
        }
      `}</style>
    </div>
  );
                                   }
