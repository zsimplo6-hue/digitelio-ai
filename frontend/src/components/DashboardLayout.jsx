import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle.jsx";
import Sidebar from "./Sidebar.jsx";

export default function DashboardLayout({ title, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Ferme le menu quand on change de page
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="dg-shell">
      {/* Fond sombre (mobile uniquement) */}
      {menuOpen && (
        <div className="dg-scrim lg:hidden" onClick={() => setMenuOpen(false)} />
      )}

      {/* Sidebar : tiroir sur mobile, fixe sur ordinateur */}
      <aside className={`dg-sidebar${menuOpen ? " is-open" : ""}`}>
        <Sidebar />
      </aside>

      <div className="dg-page min-w-0">
        <header className="dg-topbar">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Ouvrir le menu"
            className="dg-btn dg-btn--ghost dg-btn--sm !px-3 text-lg lg:hidden"
            style={{ color: "var(--dg-on-navy)" }}
          >
            ☰
          </button>
          <div className="flex items-center gap-2 text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-digi-gradient text-white">
              D
            </span>
            <span>
              Digitelio <span className="text-gradient">AI</span>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <span className="hidden text-sm opacity-70 sm:inline">
              {user?.fullName}
            </span>
            <ThemeToggle />
            <button onClick={handleLogout} className="dg-btn dg-btn--outline dg-btn--sm">
              Se déconnecter
            </button>
          </div>
        </header>

        <main className="dg-main">
          {title && <h1 className="dg-h1 mb-6">{title}</h1>}
          {children}
        </main>
      </div>
    </div>
  );
}
