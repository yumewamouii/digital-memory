import { BrowserRouter, Route, Routes } from "react-router-dom";
import AuthCallbackPage from "./components/AuthCallbackPage";
import Layout from "./components/Layout";
import { AuthProvider } from "./context/AuthContext";
import AboutPage from "./pages/AboutPage";
import CabinetPage from "./pages/CabinetPage";
import ContactsPage from "./pages/ContactsPage";
import CreateCardPage from "./pages/CreateCardPage";
import CreateTreePage from "./pages/CreateTreePage";
import EditTreePage from "./pages/EditTreePage";
import FamilyTreePage from "./pages/FamilyTreePage";
import ViewTreePage from "./pages/ViewTreePage";
import TreeInvitePage from "./pages/TreeInvitePage";
import FaqPage from "./pages/FaqPage";
import HomePage from "./pages/HomePage";
import MemoryExamplePage from "./pages/MemoryExamplePage";
import MemoryMuseumPage from "./pages/MemoryMuseumPage";
import MemoryPage from "./pages/MemoryPage";
import PlacesPage from "./pages/PlacesPage";
import PricingPage from "./pages/PricingPage";
import ServicesPage from "./pages/ServicesPage";
import SiteMapPage from "./pages/SiteMapPage";

export default function App() {
  const rawBase = import.meta.env.BASE_URL || "/";
  const basename = rawBase === "/" ? undefined : rawBase.replace(/\/$/, "");

  return (
    <AuthProvider>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="memory" element={<MemoryPage />} />
            <Route path="memory/example" element={<MemoryExamplePage />} />
            <Route path="memory/example/:type" element={<MemoryExamplePage />} />
            <Route path="memory/museum" element={<MemoryMuseumPage />} />
            <Route path="memory/create" element={<CreateCardPage />} />
            <Route path="places" element={<PlacesPage />} />
            <Route path="family-tree" element={<FamilyTreePage />} />
            <Route path="family-tree/create" element={<CreateTreePage />} />
            <Route path="family-tree/demo" element={<ViewTreePage mode="demo" />} />
            <Route path="family-tree/invite/:inviteToken" element={<TreeInvitePage />} />
            <Route path="family-tree/s/:shareSlug" element={<ViewTreePage mode="slug" />} />
            <Route path="family-tree/:treeId/edit" element={<EditTreePage />} />
            <Route path="family-tree/:treeId" element={<ViewTreePage mode="id" />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="cabinet" element={<CabinetPage />} />
            <Route path="auth/callback" element={<AuthCallbackPage />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="sitemap" element={<SiteMapPage />} />
            <Route path="pricing" element={<PricingPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
