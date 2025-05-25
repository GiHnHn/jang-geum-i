// src/index.js
import React from "react";
import { createRoot } from "react-dom/client";  // react-dom→react-dom/client로 변경
import App from "./App";
import './styles.css';
import { CharacterProvider } from "./contexts/CharacterContext";

const container = document.getElementById("root");
const root = createRoot(container);  // createRoot로 루트 생성

root.render(
  <React.StrictMode>
    <CharacterProvider>
      <App />
    </CharacterProvider>
  </React.StrictMode>
);