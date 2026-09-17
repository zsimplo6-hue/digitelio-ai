import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle.jsx";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-white dark:bg-digi-navy">
      <header className="flex items-center justify-between border-b border-digi-navy/5 px-6 py-4 dark:border-white/10">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-digi-gradient text-white">
            D
          </span>
          Digitelio <span className="text-gradient">AI</span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button onClick={handleLogout} className="btn-secondary text-sm">
            Se déconnecter
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">
          Bonjour, <span className="text-gradient">{user?.fullName || "..."}</span> 👋
        </h1>
        <p className="mt-3 text-digi-navy/60 dark:text-white/60">
          Votre tableau de bord complet arrive au prochain sprint : générateur d'eBooks,
          formations, pages de vente et bien plus.
        </p>
        <div className="card mt-8 text-left text-sm text-digi-navy/70 dark:text-white/70">
          <p><strong>Email :</strong> {user?.email}</p>
          <p className="mt-1"><strong>Plan :</strong> {user?.plan}</p>
        </div>
      </main>
    </div>
  );
}

