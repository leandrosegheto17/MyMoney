import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'casos/**/*.test.ts'],
    // Os casos usam o mesmo banco local: um arquivo por vez.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
