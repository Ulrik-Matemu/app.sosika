import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { RegisterPage } from "./pages/register";
import WelcomePage from "./pages/welcome";
import LoginPage from "./pages/login";
import MenuExplorer from "./pages/explore";
import OrderTrackingWithErrorBoundary from "./components/my-components/orderTracking";
import OrdersPage from "./pages/orders";
import ProfileManagement from "./pages/profile";
import ForgotPassword from "./pages/forgot-password";
import ResetPassword from "./pages/reset-password";
import { Printing } from "./pages/printing";
import { Services } from "./pages/services";
import "./App.css";
import { TooltipProvider } from "./components/ui/tooltip"; // Ensure correct import
import { listenForForegroundMessages } from './push-notifications'
import { setupPushNotifications } from "./services/push-notifications";


function App() {

  useEffect(() => {
    setupPushNotifications();
    listenForForegroundMessages();
  }, []);

  return (
    <Router>
      <TooltipProvider>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/explore" element={<MenuExplorer />} />
          <Route path="/order-tracking/:orderId" element={<OrderTrackingWithErrorBoundary />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/profile" element={<ProfileManagement />} />
          <Route path="/services" element={<Services />} />
          <Route path="/printing" element={<Printing />} />
        </Routes>
      </TooltipProvider>
    </Router>
  );
}

export default App;