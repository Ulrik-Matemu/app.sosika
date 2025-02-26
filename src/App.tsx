import { HashRouter as Router, Routes, Route } from "react-router-dom";
import RegisterPage from "./pages/register";
import WelcomePage from "./pages/welcome";
import LoginPage from "./pages/login";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </Router>
  );
}

export default App;
