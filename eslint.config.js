import path from 'node:path';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { regrasFronteira } from './frontend/web/eslint.fronteiras.js';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/coverage/',
      '.md/',
      '.claude/',
      'backend/supabase/',
      '**/src/banco.ts',
      'frontend/web/test/lint/arvore/',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      'no-irregular-whitespace': ['error', { skipRegExps: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  ...regrasFronteira(path.resolve('frontend/web/src'), process.cwd()),
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  prettier,
);
