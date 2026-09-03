import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router/router";
import { registerServiceWorker } from "./pwa/registerServiceWorker";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

// DIR-10: registro do Service Worker (Workbox). Roda fora da árvore React para não
// atrasar a primeira renderização.
registerServiceWorker();
