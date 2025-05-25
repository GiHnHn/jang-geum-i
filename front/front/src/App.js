// src/App.js
import React, { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { CharacterProvider, useCharacter } from "./contexts/CharacterContext";
import SelectRolePage from "./pages/SelectRolePage"; // ✅ 추가
import ChatPage from "./pages/ChatPage";             // ✅ 추가
import CharacterSelectionPage from "./pages/CharacterSelectionPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PurchasePage from "./pages/PurchasePage";
import MainApp from "./components/MainApp";
// 경로를 pages로 수정!
import CookingPage from "./pages/CookingPage";
import Header from "./components/Header";

function App({ user, setUser }) {
  const { character } = useCharacter();
  const { pathname } = useLocation();
  const showHeader = character && pathname !== "/";

  return (
    <>
      {showHeader && <Header />}
      <Routes>
        <Route path="/" element={<CharacterSelectionPage />} />
        <Route path="/select-role" element={<SelectRolePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/login" element={<LoginPage setUser={setUser} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/purchase" element={<PurchasePage />} />
        <Route path="/recipe-search" element={<MainApp user={user} setUser={setUser} />} />
        <Route path="/cooking" element={<CookingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function WrappedApp() {
  const [user, setUser] = useState(null);

  return (
    <CharacterProvider>
      <BrowserRouter>
        <App user={user} setUser={setUser} />
      </BrowserRouter>
    </CharacterProvider>
  );
}
