import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import { lerToken } from './scripts/lerToken.mjs';

const versaoApp = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string })
  .version;
const porta = Number(process.env.PORTA ?? 5173);
const corFundo = lerToken(readFileSync(new URL('./src/estilo/tokens.css', import.meta.url), 'utf8'), '--cor-fundo');

// No ambiente jsdom (consumidor "client") o Vite reescreve `new URL('x', import.meta.url)`
// para uma URL http de servidor; nos testes queremos o `file:` real do arquivo.
const manterImportMetaUrlDosTestes = {
  name: 'manter-import-meta-url-dos-testes',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!/\.test\.tsx?$/.test(id) || !code.includes('import.meta.url')) return null;
    return { code: code.replaceAll('import.meta.url', "import.meta['url']"), map: null };
  },
};

// O modo de comparação visual é só do script `visual` (servidor de desenvolvimento): qualquer `vite build`, em qualquer mode, recusa a variável.
const travaDoModoDeComparacao = {
  name: 'trava-do-modo-de-comparacao',
  config(_: unknown, { command, mode }: { command: string; mode: string }) {
    if (command !== 'build') return;
    if (loadEnv(mode, new URL('.', import.meta.url).pathname, 'VITE_').VITE_MODO_COMPARACAO !== undefined) {
      throw new Error('VITE_MODO_COMPARACAO não pode estar definida em nenhum build (é só para o script visual)');
    }
  },
};

export default defineConfig({
  define: { __VERSAO_APP__: JSON.stringify(versaoApp) },
  plugins: [
    travaDoModoDeComparacao,
    react(),
    {
      name: 'cor-do-tema',
      transformIndexHtml: () => [{ tag: 'meta', attrs: { name: 'theme-color', content: corFundo }, injectTo: 'head' }],
    },
    // Sem runtimeCaching: dado financeiro não vai para o Cache Storage (o cache de dados é do TanStack/IndexedDB).
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'MyMoney',
        short_name: 'MyMoney',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: corFundo,
        background_color: corFundo,
        icons: [
          { src: '/icones/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icones/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,webmanifest}'],
        navigateFallback: '/index.html',
      },
      devOptions: { enabled: false },
    }),
  ],
  build: { target: ['es2022', 'safari18'] },
  server: { port: porta, strictPort: true },
  test: {
    projects: [
      {
        extends: true,
        plugins: [manterImportMetaUrlDosTestes],
        test: {
          name: 'componentes',
          environment: 'jsdom',
          setupFiles: ['./test/setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
      {
        // jsdom troca a classe URL global e quebra `readFileSync(new URL(...))`.
        extends: true,
        test: { name: 'arquivos', environment: 'node', include: ['test/**/*.test.ts', 'e2e/**/*.test.ts', 'scripts/**/*.test.mjs'] },
      },
    ],
  },
});
