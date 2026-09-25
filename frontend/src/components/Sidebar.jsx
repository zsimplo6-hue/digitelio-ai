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
    <nav className="space-y-1">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            `dg-nav-item${isActive ? " is-active" : ""}`
          }
        >
          <span aria-hidden="true">{link.icon}</span>
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
