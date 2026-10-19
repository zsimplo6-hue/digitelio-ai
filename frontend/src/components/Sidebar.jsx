import { NavLink } from "react-router-dom";
import {
  IconGrid,
  IconBook,
  IconGraduationCap,
  IconCart,
  IconMegaphone,
  IconTrendingUp,
  IconShop,
  IconCreditCard,
  IconSettings,
} from "./ui/Icons.jsx";

/* Icône cadeau (affiliation) */
function IconGift(props) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

// Passer à true pour réafficher les menus liés à la vente en ligne
const SALES_ENABLED = false;

const allLinks = [
  { to: "/dashboard", label: "Tableau de bord", Icon: IconGrid, end: true },
  { to: "/dashboard/ebooks", label: "eBooks", Icon: IconBook },
  { to: "/dashboard/formations", label: "Formations", Icon: IconGraduationCap },
  { to: "/dashboard/templates", label: "Modèles", Icon: IconGrid },
  { to: "/dashboard/ideas", label: "Idées de produits", Icon: IconTrendingUp },
  { to: "/dashboard/brand", label: "Mon style", Icon: IconSettings },
  { to: "/dashboard/pages-vente", label: "Pages de vente", Icon: IconCart, sales: true },
  { to: "/dashboard/marketing", label: "Marketing digital", Icon: IconMegaphone },
  { to: "/dashboard/analytics", label: "Analytics", Icon: IconTrendingUp, sales: true },
  { to: "/dashboard/boutique", label: "Ma boutique", Icon: IconShop, sales: true },
  { to: "/dashboard/wallet", label: "Wallet", Icon: IconCreditCard, sales: true },
  { to: "/dashboard/abonnements", label: "Abonnements", Icon: IconCreditCard },
  { to: "/dashboard/affiliation", label: "Affiliation", Icon: IconGift, badge: "NEW" },
  { to: "/dashboard/parametres", label: "Paramètres", Icon: IconSettings },
];

const links = allLinks.filter((l) => SALES_ENABLED || !l.sales);

export default function Sidebar() {
  return (
    <aside className="h-full w-64 shrink-0 border-r border-digi-navy/5 bg-white px-4 py-6 dark:border-white/10 dark:bg-digi-navy">
      <nav className="space-y-1.5">
        {links.map(({ to, label, Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-digi-gradient text-white shadow-digi-glow"
                  : "text-digi-navy/70 hover:translate-x-0.5 hover:bg-digi-navy/5 dark:text-white/70 dark:hover:bg-white/5"
              }`
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            <span>{label}</span>
            {badge && (
              <span className="sb-new-badge ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-extrabold uppercase leading-none tracking-wide text-white shadow-[0_0_12px_rgba(239,68,68,0.65)]">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <style>{`
        @keyframes sb-new-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0.55); }
          50% { transform: scale(1.08); box-shadow: 0 0 0 6px rgba(239,68,68,0); }
        }
        .sb-new-badge { animation: sb-new-pulse 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .sb-new-badge { animation: none; } }
      `}</style>
    </aside>
  );
            }
