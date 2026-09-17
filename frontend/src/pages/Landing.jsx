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

