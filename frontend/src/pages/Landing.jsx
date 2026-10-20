import { useState } from "react";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import heroPoster from "../utils/heroPoster.js";

const categories = [
  { icon: "📚", title: "eBooks", desc: "Rédigez des eBooks professionnels, chapitre par chapitre" },
  { icon: "🎓", title: "Formations", desc: "Concevez des formations complètes avec leçons et quiz" },
  { icon: "🎨", title: "Modèles premium", desc: "12 mises en page prêtes à l'emploi pour vos PDF" },
  { icon: "💡", title: "Idées de produits", desc: "Trouvez des niches adaptées à votre pays" },
  { icon: "📣", title: "Marketing digital", desc: "Posts, scripts et emails de lancement générés" },
];

const pillars = [
  "eBooks & guides",
  "Formations en ligne",
  "Modèles premium",
  "Idées de produits",
  "7 langues",
  "Marketing digital",
];

/* Réseaux officiels de Digitelio AI */
const socials = [
  {
    name: "YouTube",
    label: "Notre chaîne YouTube",
    href: "https://youtube.com/@digitelioai",
    color: "#FF0000",
    path: "M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z",
  },
  {
    name: "Telegram",
    label: "Notre canal Telegram",
    href: "https://t.me/DigitelioIA",
    color: "#229ED9",
    path: "M9.8 15.6l-.4 4.1c.6 0 .8-.3 1.1-.6l2.6-2.5 5.4 4c1 .5 1.7.3 2-.9L23.9 4c.3-1.4-.5-2-1.5-1.6L1.6 10.4c-1.4.6-1.4 1.4-.2 1.7l5.3 1.7L19 6.1c.6-.4 1.1-.2.7.2L9.8 15.6z",
  },
  {
    name: "WhatsApp",
    label: "Notre chaîne WhatsApp",
    href: "https://whatsapp.com/channel/0029VbDkaeAHrDZj4TGFj92V",
    color: "#25D366",
    path: "M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-1 1.2-.4.2-.7.1a8.2 8.2 0 0 1-4-3.5c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4S5 8.2 5 9.9s1.2 3.3 1.4 3.5 2.4 3.7 5.8 5.1c2.1.9 2.9.9 4 .8.6-.1 1.8-.7 2-1.4s.3-1.3.2-1.4-.3-.2-.6-.3zM12 21.8a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.700 1 1-3.600-.2-.4A9.800 9.800 0 1 1 12 21.800zM12 0a12 12 0 0 0-10.300 18L0 24l6.200-1.600A12 12 0 1 0 12 0z",
  },
];

/* Témoignages : photos à placer dans frontend/public/avatars/ (initiales affichées si le fichier manque).
   N'ajoutez que de vrais retours, avec l'accord de la personne. */
const testimonials = [
  {
    name: "Aïcha K.",
    photo: "/avatars/aicha.jpg",
    text: "J'ai publié mon premier eBook en une soirée. Incroyable gain de temps.",
  },
  {
    name: "Marc D.",
    photo: "/avatars/marc.jpg",
    text: "Les modèles premium donnent à mes eBooks un rendu vraiment professionnel.",
  },
  {
    name: "Fatou S.",
    photo: "/avatars/fatou.jpg",
    text: "Simple, rapide, efficace. Exactement ce qu'il me fallait pour lancer ma formation.",
  },
];

function Avatar({ src, name }) {
  const [bad, setBad] = useState(false);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (bad || !src) {
    return (
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-digi-gradient text-sm font-bold text-white">
        {initials}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setBad(true)}
      className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white/70 dark:ring-white/20"
    />
  );
}

/* Fonctionnalités des plans payants (tout est inclus) */
const PAID_EXTRAS = [
  { t: "Génération en 7 langues", on: true },
  { t: "6 modèles d'eBooks et 6 modèles de formations", on: true },
  { t: "Idées de produits par pays", on: true },
  { t: "Mockup 3D de couverture", on: true },
  { t: "Certificats de réussite", on: true },
  { t: "Export PDF premium", on: true },
];

/* À garder identique aux limites de src/routes/billing.js (Worker) */
const plans = [
  {
    tone: "free",
    name: "Gratuit",
    price: "Gratuit",
    unit: "pour toujours",
    features: [
      "1 eBook par mois",
      "1 formation par mois",
      "15 leçons IA par mois",
      "10 contenus marketing par mois",
      "5 apprenants par formation",
    ],
    extras: [
      { t: "Génération en 1 langue (français)", on: true },
      { t: "1 modèle d'eBook et 1 modèle de formation", on: true },
      { t: "Idées de produits par pays", on: false },
      { t: "Mockup 3D de couverture", on: false },
      { t: "Certificats de réussite", on: false },
      { t: "Export PDF premium", on: true },
    ],
    cta: "Commencer",
    featured: false,
  },
  {
    tone: "pro",
    name: "Pro",
    price: "5 000",
    unit: "FCFA / mois",
    features: [
      "10 eBooks par mois",
      "10 formations par mois",
      "200 leçons IA par mois",
      "100 contenus marketing par mois",
      "100 apprenants par formation",
    ],
    extras: PAID_EXTRAS,
    cta: "Passer au plan Pro",
    featured: true,
  },
  {
    tone: "biz",
    name: "Business",
    price: "13 000",
    unit: "FCFA / mois",
    features: [
      "50 eBooks par mois",
      "30 formations par mois",
      "600 leçons IA par mois",
      "300 contenus marketing par mois",
      "300 apprenants par formation",
    ],
    extras: PAID_EXTRAS,
    cta: "Passer au plan Business",
    featured: false,
  },
];

const pricingCss = `
.dg-pricing{--dg-blue:#3B82F6;--dg-violet:#8B5CF6;--dg-gold:#D4AF37;--dg-ink:#0F1029;--dg-muted:#8A8DA3;--dg-off:#D5D7E0}
.dg-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;max-width:1040px;margin:48px auto 0;align-items:start}
.dg-card{position:relative;border-radius:22px;padding:26px 22px 24px;border:1.5px solid;color:var(--dg-ink);
  background:linear-gradient(160deg,rgba(255,255,255,.95),rgba(244,242,252,.9));box-shadow:0 18px 40px -22px rgba(60,50,120,.35)}
.dg-free{border-color:rgba(34,197,94,.55)}
.dg-pro{border-color:var(--dg-violet);background:linear-gradient(160deg,#fff,#EFEAFE);box-shadow:0 26px 54px -20px rgba(139,92,246,.5);transform:translateY(-10px)}
.dg-biz{border-color:rgba(212,175,55,.6);background:linear-gradient(160deg,#fff,#FBF5E0)}
.dg-badge{position:absolute;top:-14px;left:50%;transform:translateX(-50%);padding:6px 16px;border-radius:999px;font-size:.75rem;font-weight:700;color:#fff;white-space:nowrap;background:linear-gradient(90deg,var(--dg-blue),var(--dg-violet))}
.dg-name{font-size:1.15rem;font-weight:700;margin:0 0 6px}
.dg-price{font-size:2.7rem;font-weight:800;line-height:1.1;margin:0}
.dg-pro .dg-price{background:linear-gradient(90deg,var(--dg-blue),var(--dg-violet));-webkit-background-clip:text;background-clip:text;color:transparent}
.dg-biz .dg-price{background:linear-gradient(90deg,#C9A227,#F0D97A);-webkit-background-clip:text;background-clip:text;color:transparent}
.dg-unit{display:block;font-size:.85rem;font-weight:500;color:var(--dg-muted);margin:2px 0 20px}
.dg-list{list-style:none;margin:0 0 24px;padding:0;display:grid;gap:11px;text-align:left}
.dg-list li{position:relative;padding-left:30px;font-size:.9rem;line-height:1.35}
.dg-list li::before{content:"✓";position:absolute;left:0;top:0;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:.7rem;font-weight:800;color:#fff;background:linear-gradient(135deg,var(--dg-blue),var(--dg-violet))}
.dg-list li.off{color:var(--dg-muted)}
.dg-list li.off::before{content:"";background:transparent;border:1.5px solid var(--dg-off)}
.dg-btn{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;gap:.6rem;width:100%;text-align:center;text-decoration:none;font-weight:800;font-size:.95rem;padding:15px 18px;border-radius:16px;background-size:220% 220%;transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .3s ease,filter .3s ease,border-color .3s ease}
.dg-btn:hover{transform:translateY(-3px) scale(1.02)}
.dg-btn:active{transform:scale(.97)}
.dg-btn:focus-visible{outline:3px solid var(--dg-violet);outline-offset:3px}
.dg-arrow{display:inline-block;transition:transform .3s ease}
.dg-btn:hover .dg-arrow{transform:translateX(6px)}
.dg-btn-free{color:var(--dg-ink);background:#fff;border:1.5px solid #D9DBE6}
.dg-btn-free:hover{border-color:var(--dg-violet);box-shadow:0 10px 22px -12px rgba(139,92,246,.6)}
.dg-btn-pro,.dg-btn-biz{animation:dg-gradient 5s ease infinite}
.dg-btn-pro{color:#fff;background-image:linear-gradient(120deg,#3B82F6,#8B5CF6,#3B82F6);box-shadow:0 12px 28px -10px rgba(99,102,241,.8)}
.dg-btn-biz{color:#2B2308;background-image:linear-gradient(120deg,#D4AF37,#F3DE8C,#D4AF37);box-shadow:0 12px 28px -10px rgba(212,175,55,.8)}
.dg-btn-pro:hover{filter:brightness(1.08);box-shadow:0 18px 36px -10px rgba(99,102,241,.95)}
.dg-btn-biz:hover{filter:brightness(1.06);box-shadow:0 18px 36px -10px rgba(212,175,55,.95)}
.dg-btn-pro::after,.dg-btn-biz::after{content:"";position:absolute;top:0;left:0;width:35%;height:100%;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:dg-shine 3.4s ease-in-out infinite}
@keyframes dg-gradient{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes dg-shine{0%{transform:translateX(-160%) skewX(-20deg)}55%,100%{transform:translateX(380%) skewX(-20deg)}}
.dark .dg-card{color:#fff;background:rgba(255,255,255,.05);box-shadow:none}
.dark .dg-pro{background:linear-gradient(160deg,rgba(139,92,246,.18),rgba(59,130,246,.08));box-shadow:0 26px 54px -20px rgba(139,92,246,.55)}
.dark .dg-biz{background:linear-gradient(160deg,rgba(212,175,55,.14),rgba(255,255,255,.04))}
.dark .dg-unit,.dark .dg-list li.off{color:rgba(255,255,255,.55)}
.dark .dg-list li.off::before{background:transparent;border-color:rgba(255,255,255,.28)}
.dark .dg-btn-free{color:#fff;background:transparent;border-color:rgba(255,255,255,.25)}
@media (max-width:860px){.dg-grid{grid-template-columns:1fr;max-width:420px;gap:30px}.dg-pro{transform:none;order:-1}}
@media (prefers-reduced-motion:reduce){.dg-btn,.dg-btn::after{animation:none!important;transition:none!important}.dg-btn:hover{transform:none}}

.dg-social{display:flex;flex-wrap:wrap;justify-content:center;gap:14px}
.dg-soc{display:flex;align-items:center;gap:12px;padding:12px 20px 12px 14px;border-radius:16px;text-decoration:none;
  border:1.5px solid rgba(15,16,41,.1);background:#fff;color:#0F1029;font-weight:700;font-size:.9rem;
  box-shadow:0 10px 24px -16px rgba(60,50,120,.4);transition:transform .25s cubic-bezier(.2,.8,.2,1),box-shadow .3s ease,border-color .3s ease}
.dg-soc:hover{transform:translateY(-4px) scale(1.03);box-shadow:0 18px 32px -16px rgba(60,50,120,.55)}
.dg-soc:focus-visible{outline:3px solid #8B5CF6;outline-offset:3px}
.dg-soc-ico{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;color:#fff;flex:none}
.dg-soc-ico svg{width:24px;height:24px;fill:currentColor}
.dg-soc small{display:block;font-weight:500;font-size:.72rem;opacity:.65;margin-top:1px}
.dark .dg-soc{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.14);color:#fff;box-shadow:none}
@media (prefers-reduced-motion:reduce){.dg-soc{transition:none!important}.dg-soc:hover{transform:none}}
`;

export default function Landing() {
  const handleDemoClick = (e) => {
    e.preventDefault();
    document.querySelector("#apercu")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  return (
    <div id="accueil" className="min-h-screen bg-white dark:bg-digi-navy">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden bg-digi-gradient-radial">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-digi-navy/10 bg-digi-navy/5 px-4 py-1.5 text-xs font-medium text-digi-navy/80 dark:border-white/15 dark:bg-white/10 dark:text-white/80">
              ✨ La plateforme tout-en-un pour vos produits digitaux
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-tight md:text-5xl">
              Créez, personnalisez, lancez{" "}
              <span className="text-gradient">des eBooks, formations et produits digitaux</span>{" "}
              avec l'IA.
            </h1>

            <p className="mt-6 max-w-lg text-base text-digi-navy/70 dark:text-white/70">
              Digitelio AI transforme vos idées en eBooks et formations premium, en 7 langues,
              en quelques minutes, sans compétences techniques.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a href="/signup" className="btn-primary">
                Commencer gratuitement →
              </a>
              <a
                href="#apercu"
                onClick={handleDemoClick}
                className="btn-secondary inline-flex items-center gap-2 transition-all duration-300 ease-out
                           hover:-translate-y-1 hover:scale-[1.03] hover:shadow-digi-glow active:translate-y-0 active:scale-[0.98]"
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-digi-blue/20 text-[10px]">▶</span>
                Voir la démo
              </a>
            </div>
          </div>

          {/* AFFICHE — remplace l'ancien aperçu du tableau de bord */}
          <div id="apercu" className="relative mx-auto w-full max-w-md scroll-mt-24 md:max-w-none">
            {/* Halo glow derrière l'affiche */}
            <div
              aria-hidden="true"
              className="digi-mockup-glow absolute -inset-6 rounded-[2rem] bg-digi-gradient blur-3xl opacity-50 -z-10"
            />

            <div
              className="digi-mockup-card relative mx-auto max-w-md overflow-hidden rounded-3xl shadow-digi-glow
                         border border-white/60 dark:border-white/10"
            >
              <img
                src={heroPoster}
                alt="Digitelio AI : l'IA au service de votre croissance. Créez vos eBooks et formations avec l'IA."
                width="900"
                height="1127"
                fetchpriority="high"
                decoding="async"
                className="block h-auto w-full"
              />
            </div>

            {/* Badge flottant : placé en bas à droite pour ne pas cacher « Site officiel » de l'affiche */}
            <div className="digi-badge-pop absolute -bottom-5 right-2 rounded-xl bg-digi-gradient px-5 py-3 text-sm font-semibold text-white shadow-digi-glow md:-right-4">
              7 langues <br /> disponibles
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="fonctionnalites" className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {categories.map((cat) => (
            <div key={cat.title} className="card text-center">
              <div className="mb-3 text-3xl">{cat.icon}</div>
              <h3 className="font-semibold">{cat.title}</h3>
              <p className="mt-1 text-xs text-digi-navy/60 dark:text-white/60">{cat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TARIFS */}
      <section id="tarifs" className="dg-pricing mx-auto max-w-7xl px-6 py-16">
        <style>{pricingCss}</style>

        <h2 className="text-center text-2xl font-bold">
          Des <span className="text-gradient">tarifs</span> simples et transparents
        </h2>
        <p className="mt-2 text-center text-digi-navy/70 dark:text-white/70">
          Commencez gratuitement, évoluez quand vous êtes prêt.
        </p>

        <div className="dg-grid">
          {plans.map((p) => (
            <div key={p.name} className={`dg-card dg-${p.tone}`}>
              {p.featured && <span className="dg-badge">✦ Populaire</span>}
              <h3 className="dg-name">{p.name}</h3>
              <p className="dg-price">{p.price}</p>
              <span className="dg-unit">{p.unit}</span>

              <ul className="dg-list">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
                {p.extras.map((f) => (
                  <li key={f.t} className={f.on ? "" : "off"}>
                    {f.t}
                  </li>
                ))}
              </ul>

              <a href="/signup" className={`dg-btn dg-btn-${p.tone}`}>
                <span>{p.cta}</span>
                <span className="dg-arrow" aria-hidden="true">
                  →
                </span>
              </a>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs text-digi-navy/60 dark:text-white/60">
          🔒 Paiement sécurisé par SasPay (Mobile Money). Chaque abonnement payant dure 30 jours à
          partir de votre paiement. Il ne se renouvelle pas automatiquement : vous le renouvelez
          quand vous le souhaitez.
        </p>
      </section>

      {/* TEMOIGNAGES — défilement continu de gauche à droite */}
      <section id="temoignages" className="py-16">
        <h2 className="px-6 text-center text-2xl font-bold">
          Ils créent déjà avec <span className="text-gradient">Digitelio AI</span>
        </h2>

        <div className="marquee mt-10">
          <div className="marquee-track">
            {[0, 1, 2, 3].map((copy) =>
              testimonials.map((t) => (
                <div
                  key={`${copy}-${t.name}`}
                  aria-hidden={copy > 0 ? "true" : undefined}
                  className="card mr-6 w-80 shrink-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={t.photo} name={t.name} />
                    <p className="font-semibold">{t.name}</p>
                  </div>
                  <p className="mt-4 text-sm text-digi-navy/70 dark:text-white/70">"{t.text}"</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold">
          Questions <span className="text-gradient">fréquentes</span>
        </h2>
        <div className="mx-auto mt-10 grid max-w-3xl gap-4">
          <details className="card">
            <summary className="cursor-pointer font-semibold">
              Ai-je besoin de compétences techniques ?
            </summary>
            <p className="mt-2 text-sm text-digi-navy/70 dark:text-white/70">
              Non, Digitelio AI est conçu pour être utilisé sans aucune compétence technique.
            </p>
          </details>
          <details className="card">
            <summary className="cursor-pointer font-semibold">
              Comment fonctionne l'abonnement ?
            </summary>
            <p className="mt-2 text-sm text-digi-navy/70 dark:text-white/70">
              Votre abonnement démarre à l'instant de votre paiement et dure 30 jours, à la seconde
              près. À l'échéance, il expire : vous le renouvelez pour continuer, sans engagement. Vos
              contenus sont toujours conservés.
            </p>
          </details>
          <details className="card">
            <summary className="cursor-pointer font-semibold">
              Quels formats de produits puis-je créer ?
            </summary>
            <p className="mt-2 text-sm text-digi-navy/70 dark:text-white/70">
              eBooks et formations en ligne, exportés en PDF premium, plus des contenus marketing
              pour les présenter. Le plan Gratuit inclut 1 modèle d'eBook et 1 modèle de formation ;
              les plans Pro et Business débloquent les 12 modèles.
            </p>
          </details>
          <details className="card">
            <summary className="cursor-pointer font-semibold">
              Dans quelles langues puis-je créer mes produits ?
            </summary>
            <p className="mt-2 text-sm text-digi-navy/70 dark:text-white/70">
              Le plan Gratuit génère en français. Les plans Pro et Business ajoutent l'anglais,
              l'espagnol, le portugais, l'allemand, l'italien et l'arabe. La qualité est un peu moins
              régulière en arabe : relisez bien le texte avant de le diffuser.
            </p>
          </details>
        </div>
      </section>

      {/* BANDEAU "Une seule plateforme" + RÉSEAUX SOCIAUX */}
      <section className="dg-pricing mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-8 rounded-2xl bg-digi-navy p-10 text-white shadow-digi-glow md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">
              Une seule plateforme, <span className="text-gradient">des possibilités infinies.</span>
            </h2>
            <p className="mt-4 text-sm text-white/70">
              De l'idée au PDF premium, Digitelio AI vous accompagne à chaque étape pour créer des
              produits digitaux professionnels.
            </p>
            <a href="/signup" className="btn-primary mt-6 inline-flex">
              Commencer gratuitement →
            </a>
          </div>
          <ul className="grid grid-cols-2 gap-3 self-center">
            {pillars.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm text-white/90">
                <span className="text-digi-blue">✔</span> {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 text-center">
          <h3 className="text-lg font-bold">
            Rejoignez la <span className="text-gradient">communauté Digitelio AI</span>
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-digi-navy/70 dark:text-white/70">
            Astuces, nouveautés et idées de produits : suivez-nous sur YouTube, Telegram et WhatsApp.
          </p>

          <div className="dg-social mt-6">
            {socials.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="dg-soc"
                aria-label={`${s.label} (s'ouvre dans un nouvel onglet)`}
              >
                <span className="dg-soc-ico" style={{ background: s.color }}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d={s.path} />
                  </svg>
                </span>
                <span>
                  {s.name}
                  <small>Rejoindre</small>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
              }
                
