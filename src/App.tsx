import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import RegisterPage from "./pages/register";
import WelcomePage from "./pages/welcome";
import LoginPage from "./pages/login";
import MenuExplorer from "./pages/explore";
import OrderTracking from "./components/my-components/orderTracking";
import OrdersPage from "./pages/orders";
import ProfileManagement from "./pages/profile";
import "./App.css";
import { requestNotificationPermission, setupMessageListener } from './push-notifications'

function App() {

  useEffect(() => {
      requestNotificationPermission();

    setupMessageListener();
  }, []);


  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/explore" element={<MenuExplorer />} />
        <Route path="/order-tracking/:orderId" element={<OrderTracking />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/profile" element={<ProfileManagement />} />
      </Routes>
    </Router>
  );
}

export default App;
