import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const porta = Number(process.env.PORTA ?? 5173);

export default defineConfig({
  plugins: [react()],
  build: { target: ['es2022', 'safari18'] },
  server: { port: porta, strictPort: true },
  test: {
    projects: [
      {
        extends: true,
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
        test: { name: 'arquivos', environment: 'node', include: ['test/**/*.test.ts'] },
      },
    ],
  },
});
