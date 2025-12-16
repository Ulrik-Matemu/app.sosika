import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import { MapProvider } from "./services/map-provider";
import { useEffect } from "react";
import { RegisterPage } from "./pages/register";
import LoginPage from "./pages/login";
import MenuExplorer from "./pages/explore";
import OrderTrackingWithErrorBoundary from "./components/my-components/orderTracking";
import OrdersPage from "./pages/orders";
import ProfileManagement from "./pages/profile";
import ForgotPassword from "./pages/forgot-password";
import ResetPassword from "./pages/reset-password";
import "./App.css";
import { TooltipProvider } from "./components/ui/tooltip";
import { listenForForegroundMessages } from "./push-notifications";
import { setupPushNotifications } from "./services/push-notifications";
import { analytics, logEvent } from "./firebase";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/cartContext";
// import { AuthRedirect } from "./pages/AuthRedirects";
import VendorPage from "./pages/vendor";
import PageWrapper from "./services/page-transition";
import Waitlist from "./pages/waitlist";
import Browser from "./pages/browse";
import VendorRegistration from "./pages/vendorRegistration";
import VendorProfile from "./pages/vendor/profile";
import VendorCatalogPage from "./pages/vendor/menuItems";
import VendorOrders from "./pages/vendor/orders";
import MenuItemScreen from "./pages/menuItemScreen";
// import { LocationSetup } from "./pages/LocationSetup";
// import { SavedLocation } from "./hooks/useLocationStorage";
// import { SavedLocationsModal } from "./components/my-components/SavedLocationsModal";
// import { Maintenance } from "./pages/maintenance";
import MoodSelection from "./pages/mood/MoodSelection";
import LocationSelection from "./pages/mood/LocationSelection";
import ResultsPage from "./pages/mood/ResultsPage";

function App() {
  // const [selectedLocation, setSelectedLocation] = useState<SavedLocation | null>(null);

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

  useEffect(() => {
    setupPushNotifications();
    listenForForegroundMessages();
  }, []);

  /**
   * PrivateRoutes wrapper
   * Wraps all protected routes with AuthProvider
   */
  const PrivateRoutes = () => {
    return (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    );
  };

  // if (!selectedLocation) {
  //   return (
  //     <>
  //       <SavedLocationsModal
  //         locations={[]} // Replace with your actual locations array
  //         onSelect={(location) => setSelectedLocation(location)}
  //         onNew={() => { /* handle new location logic here */ }}
  //       />
  //     </>
  //   );
  // }

  return (
    <MapProvider>
      <CartProvider>
        <Router>
          <TooltipProvider>
            <PageWrapper>
              <Routes>
                {/* Public Routes */}
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/waitlist" element={<Waitlist />} />
                <Route path="/" element={<MoodSelection />} />
                <Route path="/vendor/:vendorId" element={<VendorPage />} />
                <Route path="/menu-item/:id" element={<MenuItemScreen />} />
                <Route path="/explore" element={<MenuExplorer />} />
                <Route path="/mood" element={<MoodSelection />} />
                <Route path="/mood/location" element={<LocationSelection />} />
                <Route path="/mood/results" element={<ResultsPage />} />
                <Route path="/browse" element={<Browser />} />
                {/* Private Routes */}
                <Route element={<PrivateRoutes />}>

                  <Route path="/order-tracking/:orderId" element={<OrderTrackingWithErrorBoundary />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/profile" element={<ProfileManagement />} />
                  <Route path="/vendor-registration" element={<VendorRegistration />} />
                  <Route path="/vendor-profile" element={<VendorProfile />} />
                  <Route path="/vendor-catalog" element={<VendorCatalogPage />} />
                  <Route path="/vendor-orders" element={<VendorOrders />} />
                </Route>
              </Routes>
            </PageWrapper>
          </TooltipProvider>
        </Router>
      </CartProvider>
    </MapProvider>
  );
}

export default App;
