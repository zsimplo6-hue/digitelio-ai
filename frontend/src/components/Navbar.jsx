import { useState } from "react";
import ThemeToggle from "./ThemeToggle.jsx";

const links = [
  { label: "Accueil", href: "#accueil" },
  { label: "Fonctionnalités", href: "#fonctionnalites" },
  { label: "Tarifs", href: "#tarifs" },
  { label: "Témoignages", href: "#temoignages" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-digi-navy/5 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-digi-navy/80">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#accueil" className="flex items-center gap-3 text-lg font-bold">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-purple-500/30">
            <span className="text-xl font-extrabold leading-none">D</span>
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-digi-navy dark:text-white">Digitelio</span>
            <span className="text-gradient">AI</span>
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-digi-navy/70 transition-colors hover:text-digi-navy dark:text-white/70 dark:hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <a href="/login" className="text-sm font-semibold hover:text-digi-blue">
            Se connecter
          </a>
          <a href="/signup" className="btn-primary text-sm">
            Commencer gratuitement
          </a>
        </div>

        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setOpen(!open)}
            aria-label="Ouvrir le menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-digi-navy/10 dark:border-white/15"
          >
            <span className="text-xl">{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </nav>

      {open && (
        <div className="flex flex-col gap-4 border-t border-digi-navy/5 px-6 py-6 md:hidden dark:border-white/10">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-digi-navy/70 dark:text-white/70"
            >
              {link.label}
            </a>
          ))}
          <a href="/login" className="text-sm font-semibold">
            Se connecter
          </a>
          <a href="/signup" className="btn-primary text-sm">
            Commencer gratuitement
          </a>
        </div>
      )}
    </header>
  );
}
