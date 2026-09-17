export default function Footer() {
  return (
    <footer className="border-t border-digi-navy/5 bg-white dark:border-white/10 dark:bg-digi-navy">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-digi-gradient text-white">
                D
              </span>
              Digitelio AI
            </div>
            <p className="mt-3 text-sm text-digi-navy/60 dark:text-white/60">
              Créez. Publiez. Vendez. avec l'IA.
            </p>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">Produit</h4>
            <ul className="space-y-2 text-sm text-digi-navy/60 dark:text-white/60">
              <li><a href="#fonctionnalites" className="hover:text-digi-blue">Fonctionnalités</a></li>
              <li><a href="#tarifs" className="hover:text-digi-blue">Tarifs</a></li>
              <li><a href="#faq" className="hover:text-digi-blue">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">Entreprise</h4>
            <ul className="space-y-2 text-sm text-digi-navy/60 dark:text-white/60">
              <li><a href="#" className="hover:text-digi-blue">À propos</a></li>
              <li><a href="#" className="hover:text-digi-blue">Contact</a></li>
              <li><a href="#" className="hover:text-digi-blue">Blog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold">Légal</h4>
            <ul className="space-y-2 text-sm text-digi-navy/60 dark:text-white/60">
              <li><a href="#" className="hover:text-digi-blue">Conditions d'utilisation</a></li>
              <li><a href="#" className="hover:text-digi-blue">Confidentialité</a></li>
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

