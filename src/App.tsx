import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { RegisterPage } from "./pages/register";
// import WelcomePage from "./pages/welcome";
import LoginPage from "./pages/login";
import MenuExplorer from "./pages/explore";
import OrderTrackingWithErrorBoundary from "./components/my-components/orderTracking";
import OrdersPage from "./pages/orders";
import ProfileManagement from "./pages/profile";
import ForgotPassword from "./pages/forgot-password";
import ResetPassword from "./pages/reset-password";
// import { Maintenance } from "./pages/maintenance";
import "./App.css";
import { TooltipProvider } from "./components/ui/tooltip"; // Ensure correct import
import { listenForForegroundMessages } from './push-notifications'
import { setupPushNotifications } from "./services/push-notifications";
import { analytics, logEvent } from "./firebase";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/cartContext";
import { AuthRedirect } from "./pages/AuthRedirects";
import VendorPage from "./pages/vendor";


function App() {
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
    window.removeEventListener("beforeunload", handleBeforeUnload); // ✅ correct
  };
}, []);


  useEffect(() => {
    setupPushNotifications();
    listenForForegroundMessages();
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <TooltipProvider>
            <Routes>
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<AuthRedirect />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/explore" element={<MenuExplorer />} />
              <Route path="/order-tracking/:orderId" element={<OrderTrackingWithErrorBoundary />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/profile" element={<ProfileManagement />} />
              <Route path="/vendor" element={<VendorPage vendorId={1} />} />
            </Routes>
          </TooltipProvider>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;