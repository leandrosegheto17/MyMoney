// DIR-10 (TASK.md Seção 1.3): Service Worker via Workbox; app instalável (manifest.json),
// cache offline do shell. `virtual:pwa-register` é o registrador oficial do
// `vite-plugin-pwa`, que embrulha o `workbox-window` gerado a partir do build Workbox.
export function registerServiceWorker(): void {
  // Em ambiente de teste (Vitest/jsdom) o módulo virtual não existe — no-op seguro.
  if (import.meta.env.MODE === "test") return;

  void import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      // Navegador sem suporte a Service Worker, ou módulo indisponível fora de build
      // do Vite (ex.: alguma ferramenta externa importando este módulo) — degrada
      // silenciosamente para "app funciona sem cache offline do shell", nunca quebra
      // a aplicação.
    });
}
