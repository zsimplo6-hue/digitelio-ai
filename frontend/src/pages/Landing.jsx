import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

const categories = [
  { icon: "📚", title: "eBooks", desc: "Créez des eBooks professionnels et captivants" },
  { icon: "🎓", title: "Formations", desc: "Concevez des formations en ligne prêtes à vendre" },
  { icon: "🛒", title: "Pages de vente", desc: "Pages de vente premium sans code" },
  { icon: "📣", title: "Marketing digital", desc: "Contenus et visuels automatisés" },
  { icon: "🧩", title: "Produits digitaux", desc: "Tout un écosystème dans un seul outil" },
];

const pillars = [
  "eBooks & guides",
  "Formations en ligne",
  "Pages de vente",
  "Marketing digital",
  "Produits digitaux",
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
      "10 apprenants par formation",
    ],
    cta: "Commencer",
    featured: false,
  },
  {
    tone: "pro",
    name: "Pro",
    price: "9 900",
    unit: "FCFA / mois",
    features: [
      "10 eBooks par mois",
      "10 formations par mois",
      "200 leçons IA par mois",
      "100 contenus marketing par mois",
      "100 apprenants par formation",
    ],
    cta: "Passer au plan Pro",
    featured: true,
  },
  {
    tone: "biz",
    name: "Business",
    price: "24 900",
    unit: "FCFA / mois",
    features: [
      "50 eBooks par mois",
      "30 formations par mois",
      "600 leçons IA par mois",
      "300 contenus marketing par mois",
      "300 apprenants par formation",
    ],
    cta: "Passer au plan Business",
    featured: false,
  },
];

const commonFeatures = [
  "Pages de vente et espace apprenant",
  "Certificats de réussite",
  "Export PDF premium",
  "Analytics de vos pages",
];

/* true = les 4 avantages communs sont en gris (comme dans l'app) ; false = coche colorée */
const COMMON_MUTED = true;

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
.dg-list li.off::before{background:var(--dg-off)}
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
.dark .dg-list li.off::before{background:rgba(255,255,255,.22)}
.dark .dg-btn-free{color:#fff;background:transparent;border-color:rgba(255,255,255,.25)}
@media (max-width:860px){.dg-grid{grid-template-columns:1fr;max-width:420px;gap:30px}.dg-pro{transform:none;order:-1}}
@media (prefers-reduced-motion:reduce){.dg-btn,.dg-btn::after{animation:none!important;transition:none!important}.dg-btn:hover{transform:none}}
`;

const sidebarItems = [
  { icon: "🏠", label: "Tableau de bord", active: true },
  { icon: "📘", label: "eBooks", active: false },
  { icon: "🎓", label: "Formations", active: false },
  { icon: "🛒", label: "Pages de vente", active: false },
  { icon: "📊", label: "Analytics", active: false },
];

const quickStats = [
  { icon: "📘", value: "3", label: "eBooks" },
  { icon: "🎓", value: "2", label: "Formations" },
  { icon: "👥", value: "1", label: "Apprenants" },
  { icon: "✅", value: "0", label: "Terminés" },
];

const previewStats = [
  { value: "2 547", label: "Produits créés" },
  { value: "98%", label: "Satisfaction" },
  { value: "12s", label: "Génération" },
];

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
              Créez, publiez, vendez{" "}
              <span className="text-gradient">des eBooks, formations et produits digitaux</span>{" "}
              avec l'IA.
            </h1>

            <p className="mt-6 max-w-lg text-base text-digi-navy/70 dark:text-white/70">
              Digitelio AI vous permet de transformer vos idées en produits digitaux rentables
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

          {/* DASHBOARD MOCKUP — animation premium à l'atterrissage */}
          <div id="apercu" className="relative scroll-mt-24">
            {/* Halo glow derrière la carte */}
            <div
              aria-hidden="true"
              className="digi-mockup-glow absolute -inset-6 rounded-[2rem] bg-digi-gradient blur-3xl opacity-50 -z-10"
            />

            <div
              className="digi-mockup-card card relative overflow-hidden shadow-digi-glow
                         bg-white/60 dark:bg-white/5 backdrop-blur-xl
                         border border-white/50 dark:border-white/10"
            >
              {/* Header */}
              <div className="flex items-center justify-between text-xs text-digi-navy/50 dark:text-white/50">
                <span className="font-semibold text-digi-navy dark:text-white">Digitelio AI — Aperçu</span>
                <span>●●●</span>
              </div>

              <p className="mt-3 text-sm font-semibold text-digi-navy dark:text-white">
                Bonjour, Leader 👋
              </p>

              <div className="mt-4 grid grid-cols-[70px_1fr] gap-3 sm:grid-cols-[90px_1fr]">
                {/* Sidebar */}
                <div className="flex flex-col gap-1.5">
                  {sidebarItems.map((item, i) => (
                    <div
                      key={item.label}
                      style={{ animationDelay: `${1.5 + i * 0.08}s` }}
                      className={`digi-row-in flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-2 text-center text-[9px] font-medium
                        ${
                          item.active
                            ? "bg-digi-gradient text-white shadow-digi-glow"
                            : "bg-digi-navy/5 text-digi-navy/70 dark:bg-white/10 dark:text-white/70"
                        }`}
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span className="hidden sm:block leading-tight">{item.label}</span>
                    </div>
                  ))}
                </div>

                {/* Contenu principal */}
                <div className="flex flex-col gap-2.5">
                  {/* Grille de stats 2x2 */}
                  <div className="grid grid-cols-2 gap-2">
                    {quickStats.map((s, i) => (
                      <div
                        key={s.label}
                        style={{ animationDelay: `${1.7 + i * 0.08}s` }}
                        className="digi-row-in rounded-lg bg-white/70 dark:bg-white/10 border border-white/40 dark:border-white/10 px-2.5 py-2"
                      >
                        <p className="text-sm font-bold text-digi-navy dark:text-white">
                          {s.icon} {s.value}
                        </p>
                        <p className="text-[9px] text-digi-navy/60 dark:text-white/60">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Bandeau revenu */}
                  <div
                    style={{ animationDelay: "2s" }}
                    className="digi-row-in rounded-lg bg-digi-gradient/10 border border-digi-blue/20 px-3 py-2"
                  >
                    <p className="text-[10px] font-semibold text-digi-navy dark:text-white">
                      💰 Revenu estimé
                    </p>
                    <p className="text-sm font-bold text-digi-blue">10 000 FCFA</p>
                  </div>

                  {/* Actions rapides */}
                  <div
                    style={{ animationDelay: "2.1s" }}
                    className="digi-row-in grid grid-cols-2 gap-2"
                  >
                    <button
                      type="button"
                      className="rounded-md bg-digi-gradient py-1.5 text-[10px] font-semibold text-white transition-transform hover:-translate-y-0.5"
                    >
                      📘 Créer eBook
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-digi-navy/10 dark:bg-white/10 py-1.5 text-[10px] font-semibold text-digi-navy dark:text-white transition-transform hover:-translate-y-0.5"
                    >
                      🎓 Créer formation
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats globales bas de carte */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {previewStats.map((s, i) => (
                  <div
                    key={s.label}
                    style={{ animationDelay: `${2.2 + i * 0.08}s` }}
                    className="digi-row-in rounded-lg bg-white/70 dark:bg-white/10 backdrop-blur-md py-2 text-center shadow-sm"
                  >
                    <p className="text-sm font-bold text-digi-navy dark:text-white">{s.value}</p>
                    <p className="text-[9px] text-digi-navy/60 dark:text-white/60">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Badge flottant */}
            <div className="digi-badge-pop absolute -bottom-6 -left-6 rounded-xl bg-digi-gradient px-5 py-3 text-sm font-semibold text-white shadow-digi-glow">
              +2,5k <br /> Produits créés
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
                {commonFeatures.map((f) => (
                  <li key={f} className={COMMON_MUTED ? "off" : ""}>
                    {f}
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

      {/* TEMOIGNAGES */}
      <section id="temoignages" className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold">
          Ils créent déjà avec <span className="text-gradient">Digitelio AI</span>
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="card">
            <p className="text-sm text-digi-navy/70 dark:text-white/70">
              "J'ai publié mon premier eBook en une soirée. Incroyable gain de temps."
            </p>
            <p className="mt-4 font-semibold">— Aïcha K.</p>
          </div>
          <div className="card">
            <p className="text-sm text-digi-navy/70 dark:text-white/70">
              "La génération de pages de vente m'a fait gagner des semaines de travail."
            </p>
            <p className="mt-4 font-semibold">— Marc D.</p>
          </div>
          <div className="card">
            <p className="text-sm text-digi-navy/70 dark:text-white/70">
              "Simple, rapide, efficace. Exactement ce qu'il me fallait pour lancer ma formation."
            </p>
            <p className="mt-4 font-semibold">— Fatou S.</p>
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
              eBooks, formations en ligne, pages de vente et contenus marketing digitaux.
            </p>
          </details>
        </div>
      </section>

      {/* BANDEAU "Une seule plateforme" */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-8 rounded-2xl bg-digi-navy p-10 text-white shadow-digi-glow md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">
              Une seule plateforme, <span className="text-gradient">des possibilités infinies.</span>
            </h2>
            <p className="mt-4 text-sm text-white/70">
              De l'idée à la vente, Digitelio AI vous accompagne à chaque étape pour créer des
              produits digitaux qui génèrent des revenus.
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
      </section>

      <Footer />
    </div>
  );
}
