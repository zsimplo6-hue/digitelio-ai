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
import Subscriptions from "./pages/Subscriptions.jsx";
import Settings from "./pages/Settings.jsx";
import FormationPublic from "./pages/FormationPublic.jsx";
import Learn from "./pages/Learn.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import SubscriptionGate from "./components/SubscriptionGate.jsx";

/* Page du tableau de bord : connexion obligatoire + abonnement non expiré */
const guard = (page) => (
  <ProtectedRoute>
    <SubscriptionGate>{page}</SubscriptionGate>
  </ProtectedRoute>
);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Pages publiques (sans connexion) */}
      <Route path="/formation/:id" element={<FormationPublic />} />
      <Route path="/learn/:token" element={<Learn />} />

      <Route path="/dashboard" element={guard(<Dashboard />)} />
      <Route path="/dashboard/ebooks" element={guard(<EbooksList />)} />
      <Route path="/dashboard/ebooks/create" element={guard(<CreateEbook />)} />
      <Route path="/dashboard/ebooks/:id" element={guard(<EbookPreview />)} />
      <Route path="/dashboard/formations" element={guard(<Formations />)} />
      <Route path="/dashboard/pages-vente" element={guard(<PagesVente />)} />
      <Route path="/dashboard/marketing" element={guard(<Marketing />)} />
      <Route path="/dashboard/analytics" element={guard(<Analytics />)} />
      <Route path="/dashboard/parametres" element={guard(<Settings />)} />

      {/* Toujours accessible, même expiré : c'est ici qu'on renouvelle */}
      <Route
        path="/dashboard/abonnements"
        element={
          <ProtectedRoute>
            <Subscriptions />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
