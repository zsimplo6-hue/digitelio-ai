import { Link } from "react-router-dom";
import { SUPPORT_EMAIL, mailTo } from "../data/support.js";

export default function Footer() {
  return (
    <footer className="border-t border-digi-navy/5 bg-white dark:border-white/10 dark:bg-digi-navy">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-3 text-lg font-bold">
              <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-purple-500/30">
                <span className="text-xl font-extrabold leading-none">D</span>
              </span>
              <span className="text-digi-navy dark:text-white">Digitelio AI</span>
            </div>
            <p className="mt-3 text-sm text-digi-navy/60 dark:text-white/60">
              Créez. Publiez. Vendez. avec l'IA.
            </p>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">Produit</h4>
            <ul className="space-y-2 text-sm text-digi-navy/60 dark:text-white/60">
              <li><a href="/#fonctionnalites" className="hover:text-digi-blue">Fonctionnalités</a></li>
              <li><a href="/#tarifs" className="hover:text-digi-blue">Tarifs</a></li>
              <li><Link to="/faq" className="hover:text-digi-blue">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">Aide et support</h4>
            <ul className="space-y-2 text-sm text-digi-navy/60 dark:text-white/60">
              <li><Link to="/aide" className="hover:text-digi-blue">Centre d'aide</Link></li>
              <li><Link to="/faq" className="hover:text-digi-blue">Questions fréquentes</Link></li>
              <li>
                <a href={mailTo("Support Digitelio AI")} className="break-all hover:text-digi-blue">
                  {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">Légal</h4>
            <ul className="space-y-2 text-sm text-digi-navy/60 dark:text-white/60">
              <li><Link to="/conditions" className="hover:text-digi-blue">Conditions d'utilisation</Link></li>
              <li><Link to="/confidentialite" className="hover:text-digi-blue">Politique de confidentialité</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-digi-navy/5 pt-6 text-center text-xs text-digi-navy/50 dark:border-white/10 dark:text-white/50">
          © {new Date().getFullYear()} Digitelio AI. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
