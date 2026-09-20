import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import EbooksList from "./pages/EbooksList.jsx";
import CreateEbook from "./pages/CreateEbook.jsx";
import EbookPreview from "./pages/EbookPreview.jsx";
import Formations from "./pages/Formations.jsx";
import PagesVente from "./pages/PagesVente.jsx";
import Marketing from "./pages/Marketing.jsx";
import Analytics from "./pages/Analytics.jsx";
import FormationPublic from "./pages/FormationPublic.jsx";
import Learn from "./pages/Learn.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Pages publiques (sans connexion) */}
      <Route path="/formation/:id" element={<FormationPublic />} />
      <Route path="/learn/:token" element={<Learn />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/ebooks"
        element={
          <ProtectedRoute>
            <EbooksList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/ebooks/create"
        element={
          <ProtectedRoute>
            <CreateEbook />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/ebooks/:id"
        element={
          <ProtectedRoute>
            <EbookPreview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/formations"
        element={
          <ProtectedRoute>
            <Formations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/pages-vente"
        element={
          <ProtectedRoute>
            <PagesVente />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/marketing"
        element={
          <ProtectedRoute>
            <Marketing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/abonnements"
        element={
          <ProtectedRoute>
            <ComingSoon
              title="Abonnements"
              icon="💳"
              text="Gérez bientôt votre plan Digitelio AI et vos options de facturation."
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/parametres"
        element={
          <ProtectedRoute>
            <ComingSoon
              title="Paramètres"
              icon="⚙️"
              text="Personnalisez bientôt votre profil, votre langue et votre monnaie par défaut."
            />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
            }
