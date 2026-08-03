import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { MapProvider } from "./services/map-provider";
import { useEffect } from "react";
import "./App.css";
import { TooltipProvider } from "./components/ui/tooltip";
import { analytics, logEvent } from "./firebase";
import { CartProvider } from "./context/cartContext";
import { OrdersProvider } from "./context/OrdersContext";
import { WalletProvider } from "./context/WalletContext";
import { HelmetProvider } from "react-helmet-async";
import PageWrapper from "./services/page-transition";
// import { AuthRedirect } from "./pages/AuthRedirects";
// import VendorPage from "./pages/vendor";
// import Waitlist from "./pages/waitlist";
// import Browser from "./pages/browse";
// import VendorRegistration from "./pages/vendorRegistration";
// import VendorProfile from "./pages/vendor/profile";
// import VendorCatalogPage from "./pages/vendor/menuItems";
// import VendorOrders from "./pages/vendor/orders";
// import MenuItemScreen from "./pages/menuItemScreen";
// import { LocationSetup } from "./pages/LocationSetup";
// import { SavedLocation } from "./hooks/useLocationStorage";
// import { SavedLocationsModal } from "./components/my-components/SavedLocationsModal";
// import { Maintenance } from "./pages/maintenance";
import MoodSelection from "./pages/mood/MoodSelection";
import LocationSelection from "./pages/mood/LocationSelection";
import ResultsPage from "./pages/mood/ResultsPage";
import AdminDashboard from "./pages/admin/Dashboard";
import VendorMenuPage from "./pages/vendor/MenuPage";
import AppEntryTracker from "./components/my-components/AppEntryTracker";
import VendorOnboarding from "./pages/vendor-portal/vendor-onboarding";
import VendorAuthPortal from "./pages/vendor-portal/auth";
import VendorDashboard from "./pages/vendor-portal/dashboard";
import VendorAuthGuard from "./components/my-components/VendorAuthGuard";
import OrdersPage from "./pages/orders/OrdersPage";
import TrackOrderPage from "./pages/orders/TrackOrderPage";
import BiryaniPage from "./pages/biryani/BiryaniPage";
import SosikaCashPage from "./pages/wallet/SosikaCashPage";
import RecipesHub from "./pages/recipes/RecipesHub";
import RecipeCountryPage from "./pages/recipes/RecipeCountryPage";
import RecipeSubcategoryPage from "./pages/recipes/RecipeSubcategoryPage";
import RecipeDetailPage from "./pages/recipes/RecipeDetailPage";
import RecipeSubmitPage from "./pages/recipes/RecipeSubmitPage";
import AdminRecipesQueue from "./pages/admin/AdminRecipesQueue";
import NotificationHandler from "./components/my-components/notification-handler";
import { useNotifications } from "./hooks/useNotifications";
import ScrollToTop from "./components/my-components/ScrollToTop";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <PageWrapper key={location.pathname}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<MoodSelection />} />
          <Route path="/mood" element={<MoodSelection />} />
          <Route path="/mood/location" element={<LocationSelection />} />
          <Route path="/mood/results" element={<ResultsPage />} />
          <Route path="/vendor/:vendorId/menu" element={<VendorMenuPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/recipes" element={<AdminRecipesQueue />} />
          <Route path="/vendor-onboarding" element={<VendorOnboarding />} />
          <Route path="/vendor-auth" element={<VendorAuthPortal />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/track/:orderId" element={<TrackOrderPage />} />
          <Route path="/biryani" element={<BiryaniPage />} />
          <Route path="/sosika-cash" element={<SosikaCashPage />} />

          {/* Recipes Module Routes */}
          <Route path="/recipes" element={<RecipesHub />} />
          <Route path="/recipes/submit" element={<RecipeSubmitPage />} />
          <Route path="/recipes/:country" element={<RecipeCountryPage />} />
          <Route path="/recipes/:country/:subcategory" element={<RecipeSubcategoryPage />} />
          <Route path="/recipes/:country/:subcategory/:slug" element={<RecipeDetailPage />} />

          {/* Protected Vendor Routes */}
          <Route element={<VendorAuthGuard />}>
            <Route path="/vendor-dashboard" element={<VendorDashboard />} />
          </Route>
        </Routes>
      </PageWrapper>
    </AnimatePresence>
  );
}

function App() {
  useNotifications();

  useEffect(() => {
    const sessionStart = Date.now();

    const handleBeforeUnload = () => {
      const sessionEnd = Date.now();
      const durationMs = sessionEnd - sessionStart;

      logEvent(analytics, "session_duration", {
        duration_seconds: Math.floor(durationMs / 1000),
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <>
      <AppEntryTracker />
      <NotificationHandler />
      <HelmetProvider>
        <MapProvider>
          <CartProvider>
            <OrdersProvider>
              <WalletProvider>
                <Router>
                  <ScrollToTop />
                  <TooltipProvider>
                    <AnimatedRoutes />
                  </TooltipProvider>
                </Router>
              </WalletProvider>
            </OrdersProvider>
          </CartProvider>
        </MapProvider>
      </HelmetProvider>
    </>
  );
}

export default App;
