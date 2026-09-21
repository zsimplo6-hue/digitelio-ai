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
    name: "Free",
    price: "0€",
    period: "pour toujours",
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
    name: "Pro",
    price: "19€",
    period: "pour 30 jours",
    features: [
      "10 eBooks par mois",
      "10 formations par mois",
      "200 leçons IA par mois",
      "100 contenus marketing par mois",
      "100 apprenants par formation",
    ],
    cta: "Essayer Pro",
    featured: true,
  },
  {
    name: "Business",
    price: "49€",
    period: "pour 30 jours",
    features: [
      "50 eBooks par mois",
      "30 formations par mois",
      "600 leçons IA par mois",
      "300 contenus marketing par mois",
      "300 apprenants par formation",
    ],
    cta: "Essayer Business",
    featured: false,
  },
];

const commonFeatures = [
  "Pages de vente et espace apprenant",
  "Certificats de réussite",
  "Export PDF premium",
  "Analytics de vos pages",
];

export default function Landing() {
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
              <a href="#demo" className="btn-secondary">
                Voir la démo
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="card relative overflow-hidden shadow-digi-glow">
              <div className="flex items-center justify-between text-xs text-digi-navy/50 dark:text-white/50">
                <span>Digitelio AI — Aperçu</span>
                <span>●●●</span>
              </div>
              <div className="mt-6 h-56 rounded-xl bg-digi-gradient-radial" />
            </div>
            <div className="absolute -bottom-6 -left-6 rounded-xl bg-digi-gradient px-5 py-3 text-sm font-semibold text-white shadow-digi-glow">
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
      <section id="tarifs" className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold">
          Des <span className="text-gradient">tarifs</span> simples et transparents
        </h2>
        <p className="mt-2 text-center text-digi-navy/70 dark:text-white/70">
          Commencez gratuitement, évoluez quand vous êtes prêt.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`card text-center ${p.featured ? "border-2 border-digi-blue" : ""}`}
            >
              {p.featured && (
                <span className="mb-3 inline-block rounded-full bg-digi-gradient px-3 py-1 text-xs font-semibold text-white">
                  Populaire
                </span>
              )}
              <h3 className="text-xl font-semibold">{p.name}</h3>
              <p className="mt-2 text-3xl font-bold">{p.price}</p>
              <p className="mt-1 text-sm text-digi-navy/60 dark:text-white/60">{p.period}</p>

              <ul className="mt-6 space-y-2 text-left text-sm text-digi-navy/80 dark:text-white/80">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-digi-blue">✔</span>
                    <span>{f}</span>
                  </li>
                ))}
                {commonFeatures.map((f) => (
                  <li key={f} className="flex gap-2 text-digi-navy/60 dark:text-white/60">
                    <span className="text-digi-blue">✔</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href="/signup"
                className={`${p.featured ? "btn-primary" : "btn-secondary"} mt-6 inline-flex`}
              >
                {p.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-digi-navy/60 dark:text-white/60">
          Chaque abonnement payant dure 30 jours à partir de votre paiement. Il ne se renouvelle pas
          automatiquement : vous le renouvelez quand vous le souhaitez.
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
