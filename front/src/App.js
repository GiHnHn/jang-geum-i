import React, { useState, useEffect, useRef, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainApp from "./components/MainApp";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PurchasePage from "./pages/PurchasePage";
import CookingPage from "./pages/CookingPage";


function App() {
  const [user, setUser] = useState(null);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp user={user} setUser={setUser} />} />
        <Route path="/login" element={<LoginPage setUser={setUser} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/purchase" element={<PurchasePage />} />
        <Route path="/cooking" element={<CookingPage />} />
      </Routes>
    </Router>
  );
}

export default App;