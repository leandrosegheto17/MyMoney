import { defineConfig, devices } from '@playwright/test';

const porta = Number(process.env.PORTA ?? 5173);

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.ts',
  use: { baseURL: `http://127.0.0.1:${porta}` },
  projects: [
    { name: 'chromium', grepInvert: /@integracao/, use: { ...devices['Desktop Chrome'] } },
    // Banco compartilhado: um spec por vez, na ordem escrita (use também --workers=1).
    { name: 'integracao', grep: /@integracao/, fullyParallel: false, use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `pnpm exec vite --host 127.0.0.1 --port ${porta} --strictPort`,
    url: `http://127.0.0.1:${porta}`,
    reuseExistingServer: !process.env.CI,
  },
});
