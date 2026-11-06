import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle.jsx";
import Sidebar from "./Sidebar.jsx";
import Logo from "./Logo.jsx";
import AffiliateCelebration from "./AffiliateCelebration.jsx";

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
        <header className="dl-header">
          <div className="dl-left">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Ouvrir le menu"
              className="dl-burger md:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <Logo height={32} />
          </div>
          <div className="dl-right">
            {user?.fullName && (
              <span className="dl-user" title={user.fullName}>
                <i>{String(user.fullName).trim().charAt(0).toUpperCase()}</i>
                <span>{user.fullName}</span>
              </span>
            )}
            <ThemeToggle />
            <button onClick={handleLogout} className="dl-logout" aria-label="Se déconnecter" title="Se déconnecter">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              <span>Se déconnecter</span>
            </button>
          </div>
        </header>

        <main className="dl-main mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
          {title && <h1 className="mb-6 text-2xl font-bold">{title}</h1>}
          {children}
        </main>
      </div>

      {/* Notification de félicitations quand une récompense d'affiliation vient d'être accordée */}
      <AffiliateCelebration />
    </div>
  );
}
