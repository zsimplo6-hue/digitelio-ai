import { useEffect } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle.jsx";
import Logo from "./Logo.jsx";
import Footer from "./Footer.jsx";
import PageHero from "./ui/PageHero.jsx";

/* Coque commune des pages publiques d'information (FAQ, aide, conditions, confidentialité) */
export default function PublicShell({ kicker, title, subtitle, children, wide = false }) {
  useEffect(() => {
    document.title = `${title} · Digitelio AI`;
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <div className="min-h-screen bg-white dark:bg-digi-navy">
      <header className="sticky top-0 z-50 border-b border-digi-navy/5 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-digi-navy/80">
        <nav className="sp-nav mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" aria-label="Digitelio AI">
            <Logo height={34} />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/aide" className="sp-nav__link hidden sm:inline">Aide</Link>
            <Link to="/faq" className="sp-nav__link hidden sm:inline">FAQ</Link>
            <ThemeToggle />
            <Link to="/login" className="sp-nav__link">Connexion</Link>
          </div>
        </nav>
      </header>

      <main className={`sp-wrap ${wide ? "sp-wrap--wide" : ""}`}>
        <PageHero kicker={kicker} title={title} subtitle={subtitle} />
        {children}
      </main>

      <Footer />
    </div>
  );
              }
