import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Tableau de bord", icon: "📊", end: true },
  { to: "/dashboard/ebooks", label: "eBooks", icon: "📘" },
  { to: "/dashboard/formations", label: "Formations", icon: "🎓" },
  { to: "/dashboard/pages-vente", label: "Pages de vente", icon: "🛒" },
  { to: "/dashboard/marketing", label: "Marketing digital", icon: "📣" },
  { to: "/dashboard/analytics", label: "Analytics", icon: "📈" },
  { to: "/dashboard/abonnements", label: "Abonnements", icon: "💳" },
  { to: "/dashboard/parametres", label: "Paramètres", icon: "⚙️" },
];

export default function Sidebar() {
  return (
    <aside className="h-full w-64 shrink-0 border-r border-digi-navy/5 bg-white px-4 py-6 dark:border-white/10 dark:bg-digi-navy">
      <nav className="space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-digi-gradient text-white"
                  : "text-digi-navy/70 hover:bg-digi-navy/5 dark:text-white/70 dark:hover:bg-white/5"
              }`
            }
          >
            <span>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
