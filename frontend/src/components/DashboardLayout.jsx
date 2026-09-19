import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle.jsx";
import Sidebar from "./Sidebar.jsx";

export default function DashboardLayout({ title, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-digi-navy">
      <Sidebar />

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-digi-navy/5 px-6 py-4 dark:border-white/10">
          <div className="flex items-center gap-2 text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-digi-gradient text-white">
              D
            </span>
            Digitelio <span className="text-gradient">AI</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-digi-navy/60 dark:text-white/60 sm:inline">
              {user?.fullName}
            </span>
            <ThemeToggle />
            <button onClick={handleLogout} className="btn-secondary text-sm">
              Se déconnecter
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-10">
          {title && <h1 className="mb-6 text-2xl font-bold">{title}</h1>}
          {children}
        </main>
      </div>
    </div>
  );
}
