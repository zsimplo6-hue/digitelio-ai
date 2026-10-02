const CERT_TXT = {
  fr: { editions: "ÉDITIONS", title: "CERTIFICAT", sub: "DE RÉUSSITE", lead1: "Ce certificat est décerné à", lead2: "pour avoir suivi avec succès la formation", date: "Date de délivrance", teacher: "Formateur", no: "Certificat n°", name: "Nom de l'apprenant", locale: "fr-FR" },
  en: { editions: "EDITIONS", title: "CERTIFICATE", sub: "OF COMPLETION", lead1: "This certificate is awarded to", lead2: "for successfully completing the course", date: "Date of issue", teacher: "Instructor", no: "Certificate no.", name: "Learner name", locale: "en-GB" },
  es: { editions: "EDICIONES", title: "CERTIFICADO", sub: "DE FINALIZACIÓN", lead1: "Este certificado se otorga a", lead2: "por haber completado con éxito el curso", date: "Fecha de emisión", teacher: "Formador", no: "Certificado n.º", name: "Nombre del alumno", locale: "es-ES" },
  pt: { editions: "EDIÇÕES", title: "CERTIFICADO", sub: "DE CONCLUSÃO", lead1: "Este certificado é concedido a", lead2: "por ter concluído com sucesso o curso", date: "Data de emissão", teacher: "Formador", no: "Certificado n.º", name: "Nome do aluno", locale: "pt-PT" },
  de: { editions: "AUSGABEN", title: "ZERTIFIKAT", sub: "ÜBER DEN ABSCHLUSS", lead1: "Dieses Zertifikat wird verliehen an", lead2: "für den erfolgreichen Abschluss des Kurses", date: "Ausstellungsdatum", teacher: "Dozent", no: "Zertifikat Nr.", name: "Name des Teilnehmers", locale: "de-DE" },
  it: { editions: "EDIZIONI", title: "CERTIFICATO", sub: "DI COMPLETAMENTO", lead1: "Questo certificato è conferito a", lead2: "per aver completato con successo il corso", date: "Data di rilascio", teacher: "Formatore", no: "Certificato n.", name: "Nome dello studente", locale: "it-IT" },
  ar: { editions: "إصدارات", title: "شهادة", sub: "إتمام الدورة", lead1: "تُمنح هذه الشهادة إلى", lead2: "لإتمامه بنجاح دورة", date: "تاريخ الإصدار", teacher: "المدرّب", no: "شهادة رقم", name: "اسم المتعلّم", locale: "ar-u-nu-latn" },
};

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
  loads.push(document.fonts.load("700 1em 'Noto Naskh Arabic'", "شهادة"));
  loads.push(document.fonts.load("400 1em 'Noto Naskh Arabic'", "شهادة"));
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

export default function CertificateDoc({ formation, name, instructor, language = "fr" }) {
  const T = CERT_TXT[language] || CERT_TXT.fr;
  const rtl = language === "ar";

  const now = new Date();
  const dateLabel = now.toLocaleDateString(T.locale, {
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
    <div className={`cert-doc${rtl ? " cert-rtl" : ""}`} dir={rtl ? "rtl" : "ltr"}>
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
            <em>{T.editions}</em>
            <span />
          </div>

          <h1 className="cert-title">{T.title}</h1>
          <div className="cert-sub">{T.sub}</div>

          <div className="cert-divider">
            <span />
            <i />
            <span />
          </div>

          <div className="cert-lead">{T.lead1}</div>
          <div className="cert-name" style={{ fontSize: nameSize }}>
            {cleanName || T.name}
          </div>
          <div className="cert-lead">{T.lead2}</div>
          <div className="cert-course" style={{ fontSize: titleSize }}>
            {title}
          </div>

          <div className="cert-foot">
            <div className="cert-col">
              <div className="cert-line" />
              <div className="cert-small">{dateLabel}</div>
              <div className="cert-tiny">{T.date}</div>
            </div>
            <div className="cert-seal">
              <span>◆</span>
            </div>
            <div className="cert-col">
              <div className="cert-line" />
              <div className="cert-small">{instructor || "Digitelio AI"}</div>
              <div className="cert-tiny">{T.teacher}</div>
            </div>
          </div>

          <div className="cert-num">
            {T.no} {number}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Manrope:wght@300;400;600&family=Inter:wght@400&family=Noto+Naskh+Arabic:wght@400;700&display=swap');

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

          /* Arabe : police adaptée, pas d'espacement entre les lettres */
          .cert-rtl .cert-page,
          .cert-rtl .cert-title,
          .cert-rtl .cert-sub,
          .cert-rtl .cert-name,
          .cert-rtl .cert-course { font-family: 'Noto Naskh Arabic', serif; }
          .cert-rtl .cert-brand,
          .cert-rtl .cert-ed,
          .cert-rtl .cert-title,
          .cert-rtl .cert-sub,
          .cert-rtl .cert-tiny,
          .cert-rtl .cert-num { letter-spacing: 0; }
          .cert-rtl .cert-ed em,
          .cert-rtl .cert-sub { margin-right: 0; }
          .cert-rtl .cert-tiny { text-transform: none; }
        }
      `}</style>
    </div>
  );
}
