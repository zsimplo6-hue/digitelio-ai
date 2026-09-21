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
    <div className="flex min-h-screen bg-white dark:bg-digi-navy">
      {/* Fond sombre (mobile uniquement) */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar : tiroir sur mobile, fixe sur ordinateur */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto bg-white transition-transform duration-300 dark:bg-digi-navy md:static md:z-auto md:translate-x-0 md:overflow-visible ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />
      </div>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-2 border-b border-digi-navy/5 px-4 py-4 dark:border-white/10 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Ouvrir le menu"
              className="btn-secondary !px-3 !py-2 text-xl md:hidden"
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
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden text-sm text-digi-navy/60 dark:text-white/60 sm:inline">
              {user?.fullName}
            </span>
            <ThemeToggle />
            <button onClick={handleLogout} className="btn-secondary text-sm">
              Se déconnecter
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
          {title && <h1 className="mb-6 text-2xl font-bold">{title}</h1>}
          {children}
        </main>
      </div>
    </div>
  );
      }
