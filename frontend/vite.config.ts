import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

// DIR-10 (TASK.md Seção 1.3): Service Worker via Workbox, app instalável (manifest.json),
// cache offline do shell. `vite-plugin-pwa` gera o Service Worker com `workbox-build`
// (estratégia `generateSW`) — é a camada Workbox exigida pela diretriz, não uma
// implementação manual de Service Worker.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        id: "/",
        lang: "pt-BR",
        name: "MyMoney",
        short_name: "MyMoney",
        description: "Organização financeira pessoal — contas, lançamentos, orçamento e mais.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#2563EB",
        orientation: "portrait-primary",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Cache offline do shell (DIR-10): precache dos artefatos de build + fallback
        // de navegação para o app shell quando a rede estiver indisponível.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            // Chamadas de API (Supabase) nunca são servidas do cache do shell — a
            // fila offline de lançamentos (DIR-11, FE-M-03) é responsabilidade do
            // Dexie/IndexedDB, não do Service Worker.
            urlPattern: ({ url }) => url.pathname.startsWith("/rest/") || url.pathname.startsWith("/auth/"),
            handler: "NetworkOnly",
          },
        ],
      },
      devOptions: {
        // Permite validar o SW durante `npm run dev` sem exigir build de produção.
        enabled: true,
        type: "module",
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
});
