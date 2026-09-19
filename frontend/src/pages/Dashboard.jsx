import { useAuth } from "../context/AuthContext.jsx";
import DashboardLayout from "../components/DashboardLayout.jsx";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">
        Bonjour, <span className="text-gradient">{user?.fullName || "..."}</span> 👋
      </h1>
      <p className="mt-2 text-digi-navy/60 dark:text-white/60">
        Voici un aperçu de votre activité sur Digitelio AI.
      </p>

      <div className="card mt-6 text-left text-sm text-digi-navy/70 dark:text-white/70">
        <p><strong>Email :</strong> {user?.email}</p>
        <p className="mt-1"><strong>Plan :</strong> {user?.plan}</p>
      </div>

      <div className="mt-8 flex gap-3">
        <Link to="/dashboard/ebooks/create" className="btn-primary">
          Créer un eBook
        </Link>
      </div>
    </DashboardLayout>
  );
}
