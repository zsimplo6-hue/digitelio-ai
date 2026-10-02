import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { formatPrice } from "../utils/currency.js";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8787";

const TXT = {
  fr: {
    loading: "Chargement...", unavailable: "Formation indisponible",
    notFound: "Cette formation n'existe pas ou n'est plus en vente.", label: "FORMATION", by: "Par",
    free: "S'inscrire gratuitement", buy: "Acheter la formation", soon: "Bientôt disponible",
    noPay: "Le paiement n'est pas encore disponible.", program: "Au programme", included: "Ce qui est inclus",
    modules: (n) => `${n} modules de formation`, lessons: "Leçons détaillées avec exercices et résumés",
    media: "Vidéos, ressources et supports PDF téléchargeables", cert: "Certificat de réussite", powered: "Propulsé par",
  },
  en: {
    loading: "Loading...", unavailable: "Course unavailable",
    notFound: "This course does not exist or is no longer on sale.", label: "COURSE", by: "By",
    free: "Enroll for free", buy: "Buy the course", soon: "Coming soon",
    noPay: "Payment is not available yet.", program: "Curriculum", included: "What's included",
    modules: (n) => `${n} course modules`, lessons: "Detailed lessons with exercises and summaries",
    media: "Videos, resources and downloadable PDF materials", cert: "Certificate of completion", powered: "Powered by",
  },
  es: {
    loading: "Cargando...", unavailable: "Curso no disponible",
    notFound: "Este curso no existe o ya no está a la venta.", label: "CURSO", by: "Por",
    free: "Inscribirse gratis", buy: "Comprar el curso", soon: "Próximamente",
    noPay: "El pago aún no está disponible.", program: "Programa", included: "Qué incluye",
    modules: (n) => `${n} módulos de formación`, lessons: "Lecciones detalladas con ejercicios y resúmenes",
    media: "Vídeos, recursos y materiales PDF descargables", cert: "Certificado de finalización", powered: "Impulsado por",
  },
  pt: {
    loading: "Carregando...", unavailable: "Curso indisponível",
    notFound: "Este curso não existe ou já não está à venda.", label: "CURSO", by: "Por",
    free: "Inscrever-se gratuitamente", buy: "Comprar o curso", soon: "Em breve",
    noPay: "O pagamento ainda não está disponível.", program: "Programa", included: "O que está incluído",
    modules: (n) => `${n} módulos de formação`, lessons: "Aulas detalhadas com exercícios e resumos",
    media: "Vídeos, recursos e materiais PDF para baixar", cert: "Certificado de conclusão", powered: "Desenvolvido por",
  },
  de: {
    loading: "Wird geladen...", unavailable: "Kurs nicht verfügbar",
    notFound: "Dieser Kurs existiert nicht oder ist nicht mehr im Verkauf.", label: "KURS", by: "Von",
    free: "Kostenlos anmelden", buy: "Kurs kaufen", soon: "Demnächst verfügbar",
    noPay: "Die Zahlung ist noch nicht verfügbar.", program: "Programm", included: "Das ist enthalten",
    modules: (n) => `${n} Kursmodule`, lessons: "Ausführliche Lektionen mit Übungen und Zusammenfassungen",
    media: "Videos, Ressourcen und herunterladbare PDF-Unterlagen", cert: "Abschlusszertifikat", powered: "Bereitgestellt von",
  },
  it: {
    loading: "Caricamento...", unavailable: "Corso non disponibile",
    notFound: "Questo corso non esiste o non è più in vendita.", label: "CORSO", by: "Di",
    free: "Iscriviti gratis", buy: "Acquista il corso", soon: "Prossimamente",
    noPay: "Il pagamento non è ancora disponibile.", program: "Programma", included: "Cosa è incluso",
    modules: (n) => `${n} moduli del corso`, lessons: "Lezioni dettagliate con esercizi e riepiloghi",
    media: "Video, risorse e materiali PDF scaricabili", cert: "Certificato di completamento", powered: "Offerto da",
  },
  ar: {
    loading: "جارٍ التحميل...", unavailable: "الدورة غير متاحة",
    notFound: "هذه الدورة غير موجودة أو لم تعد معروضة للبيع.", label: "دورة", by: "بقلم",
    free: "التسجيل مجانًا", buy: "شراء الدورة", soon: "قريبًا",
    noPay: "الدفع غير متاح بعد.", program: "البرنامج", included: "ما الذي تشمله الدورة",
    modules: (n) => `${n} وحدات تدريبية`, lessons: "دروس مفصلة مع تمارين وملخصات",
    media: "فيديوهات وموارد وملفات PDF قابلة للتنزيل", cert: "شهادة إتمام", powered: "مدعوم من",
  },
};

export default function FormationPublic() {
  const { id } = useParams();
  const [f, setF] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  /* Mesure d'audience : simples compteurs, sans cookie ni donnée personnelle */
  function track(type, unique = false) {
    fetch(`${API}/api/public/formations/${id}/track`, {
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
        const res = await fetch(`${API}/api/public/formations/${id}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || TXT.fr.unavailable);
        if (alive) {
          setF(data.formation);
          document.title = `${data.formation.title} | Digitelio AI`;

          let unique = false;
          try {
            const key = `dg_seen_${id}`;
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
      <div className="fp-root">
        <p className="fp-center">{TXT.fr.loading}</p>
        <FpStyle />
      </div>
    );
  }

  if (error || !f) {
    return (
      <div className="fp-root">
        <div className="fp-center">
          <div className="fp-brand">DIGITELIO AI</div>
          <h1 className="fp-title" style={{ fontSize: "1.4rem" }}>{TXT.fr.unavailable}</h1>
          <p className="fp-muted">{error || TXT.fr.notFound}</p>
        </div>
        <FpStyle />
      </div>
    );
  }

  const lang = TXT[f.language] ? f.language : "fr";
  const t = TXT[lang];
  const rtl = lang === "ar";
  const isFree = f.price === 0;
  const priceStr = formatPrice(f.price, f.currency);
  const cta = isFree ? t.free : `${t.buy} · ${priceStr}`;
  const modules = f.modules || [];

  // Paiement SasPay interne (/pay/:code). Ancien lien externe gardé en secours temporaire.
  const buyHref = f.pay_code ? `/pay/${f.pay_code}` : f.payment_url || "";
  const isInternal = Boolean(f.pay_code);

  const Cta = ({ className = "" }) =>
    buyHref ? (
      <a
        className={`fp-cta ${className}`}
        href={buyHref}
        {...(isInternal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
        onClick={() => track("click")}
      >
        {cta}
      </a>
    ) : (
      <button className={`fp-cta fp-cta-off ${className}`} disabled>
        {t.soon}
      </button>
    );

  return (
    <div className="fp-root" dir={rtl ? "rtl" : "ltr"}>
      <div className="fp-wrap">
        <div className="fp-brand">DIGITELIO AI</div>
        <div className="fp-ed">
          <span />
          <em>{t.label}</em>
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
        {f.instructor && <div className="fp-by">{t.by} {f.instructor}</div>}

        <div className="fp-pricebox">
          <div className="fp-price">{priceStr}</div>
          <Cta />
          {!buyHref && <div className="fp-muted fp-small">{t.noPay}</div>}
        </div>

        <h2 className="fp-h2">{t.program}</h2>
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

        <h2 className="fp-h2">{t.included}</h2>
        <ul className="fp-incl">
          <li>◆ {t.modules(modules.length)}</li>
          <li>◆ {t.lessons}</li>
          <li>◆ {t.media}</li>
          {f.certificate && <li>◆ {t.cert}</li>}
        </ul>

        <div className="fp-bottom">
          <Cta />
        </div>

        <div className="fp-foot">
          {t.powered} <strong>Digitelio AI</strong>
        </div>
      </div>
      <FpStyle />
    </div>
  );
}

function FpStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Manrope:wght@300;400;600;700&family=Noto+Naskh+Arabic:wght@400;700&display=swap');

      .fp-root {
        min-height: 100vh;
        background: #0B0B0B;
        color: #F5F0E1;
        font-family: 'Manrope', 'Noto Naskh Arabic', sans-serif;
        display: flex;
        justify-content: center;
        padding: 1.5rem 1.1rem 3rem;
        box-sizing: border-box;
      }
      .fp-root[dir="rtl"] { font-family: 'Noto Naskh Arabic', 'Manrope', sans-serif; }
      .fp-root[dir="rtl"] .fp-title,
      .fp-root[dir="rtl"] .fp-h2,
      .fp-root[dir="rtl"] .fp-price { font-family: 'Noto Naskh Arabic', serif; letter-spacing: 0; text-transform: none; }
      .fp-root[dir="rtl"] .fp-ed,
      .fp-root[dir="rtl"] .fp-brand,
      .fp-root[dir="rtl"] .fp-by { letter-spacing: 0; }
      .fp-root[dir="rtl"] .fp-ed em { margin-right: 0; }
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
      .fp-modules { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.9rem; text-align: start; }
      .fp-modules li { display: flex; gap: 0.9rem; align-items: flex-start; }
      .fp-num {
        flex: none; width: 2rem; height: 2rem; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; background: #D4AF37; color: #0B0B0B;
      }
      .fp-mtitle { font-weight: 600; }
      .fp-msum { font-size: 0.85rem; font-weight: 300; opacity: 0.8; margin-top: 0.15rem; line-height: 1.5; }

      .fp-incl { list-style: none; padding: 0; margin: 0; text-align: start; display: grid; gap: 0.6rem; font-weight: 300; }
      .fp-bottom { margin-top: 2rem; }
      .fp-foot { margin-top: 2.2rem; font-size: 0.75rem; color: #9c9682; letter-spacing: 0.08em; }
      .fp-foot strong { color: #D4AF37; font-weight: 600; }
    `}</style>
  );
      }
