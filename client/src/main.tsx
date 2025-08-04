import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./App.css";
import AppContent from "./page.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppContent />
  </StrictMode>,
);
