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

// Passer à true pour réafficher les menus liés à la vente en ligne
const SALES_ENABLED = false;

const allLinks = [
  { to: "/dashboard", label: "Tableau de bord", Icon: IconGrid, end: true },
  { to: "/dashboard/ebooks", label: "eBooks", Icon: IconBook },
  { to: "/dashboard/formations", label: "Formations", Icon: IconGraduationCap },
  { to: "/dashboard/pages-vente", label: "Pages de vente", Icon: IconCart, sales: true },
  { to: "/dashboard/marketing", label: "Marketing digital", Icon: IconMegaphone },
  { to: "/dashboard/analytics", label: "Analytics", Icon: IconTrendingUp, sales: true },
  { to: "/dashboard/boutique", label: "Ma boutique", Icon: IconShop, sales: true },
  { to: "/dashboard/wallet", label: "Wallet", Icon: IconCreditCard, sales: true },
  { to: "/dashboard/abonnements", label: "Abonnements", Icon: IconCreditCard },
  { to: "/dashboard/parametres", label: "Paramètres", Icon: IconSettings },
];

const links = allLinks.filter((l) => SALES_ENABLED || !l.sales);

export default function Sidebar() {
  return (
    <aside className="h-full w-64 shrink-0 border-r border-digi-navy/5 bg-white px-4 py-6 dark:border-white/10 dark:bg-digi-navy">
      <nav className="space-y-1.5">
        {links.map(({ to, label, Icon, end }) => (
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
          </NavLink>
        ))}
      </nav>
    </aside>
  );
        }
