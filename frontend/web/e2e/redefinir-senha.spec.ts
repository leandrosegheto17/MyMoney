// Roda com o Vite apontando para um Supabase falso e SEM modo de comparação:
//   VITE_SUPABASE_URL=https://comparacao.invalid VITE_SUPABASE_ANON_KEY=chave-de-comparacao \
//     pnpm exec playwright test e2e/redefinir-senha.spec.ts
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: 'celular', width: 390, height: 844 },
  { nome: 'pc', width: 1440, height: 900 },
];
const DATA = new Date().toISOString().slice(0, 10);
const PASTA_PRINTS = join(process.cwd(), '..', '..', '.md', '.visual', DATA, 'redefinir-senha');
const LINK_EXPIRADO = '/redefinir-senha#error=access_denied&error_code=otp_expired';

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number], caminho = '/redefinir-senha') {
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto(caminho);
  await expect(page.getByRole('heading', { level: 1, name: 'Nova senha' })).toBeVisible();
}

mkdirSync(PASTA_PRINTS, { recursive: true });

for (const tamanho of TAMANHOS) {
  test.describe(`redefinir senha ${tamanho.nome}`, () => {
    test('normal: regra visível e sem violações graves', async ({ page }) => {
      await abrir(page, tamanho);

      await expect(page.getByText('Pelo menos 12 caracteres.')).toBeVisible();
      await page.screenshot({
        path: join(PASTA_PRINTS, `redefinir-senha--sucesso-${tamanho.nome}--app.png`),
        fullPage: true,
      });
      await semViolacoesGraves(page);
    });

    test('redefinir-senha--erro: 8 e 9 caracteres mostram os dois erros nos campos', async ({ page }) => {
      await abrir(page, tamanho);
      await page.getByLabel('Nova senha', { exact: true }).fill('12345678');
      await page.getByLabel('Repita a nova senha').fill('123456789');
      await page.getByRole('button', { name: 'Salvar senha' }).click();

      await expect(page.getByText('Use pelo menos 12 caracteres.')).toBeVisible();
      await expect(page.getByText('As senhas não conferem.')).toBeVisible();
      await expect(page.getByText('Pelo menos 12 caracteres.', { exact: true })).toHaveCount(0);
      await expect(page.getByLabel('Nova senha', { exact: true })).toBeFocused();
      await page.screenshot({
        path: join(PASTA_PRINTS, `redefinir-senha--erro-${tamanho.nome}--app.png`),
        fullPage: true,
      });
      await semViolacoesGraves(page);
    });

    test('link expirado na URL: aviso no topo e formulário visível', async ({ page }) => {
      await abrir(page, tamanho, LINK_EXPIRADO);

      await expect(page.locator('p[role=alert]')).toContainText('Este link expirou');
      await expect(page.getByRole('link', { name: 'Voltar para Entrar' })).toHaveAttribute('href', '/entrar');
      await page.screenshot({
        path: join(PASTA_PRINTS, `redefinir-senha--expirado-${tamanho.nome}--app.png`),
        fullPage: true,
      });
      await semViolacoesGraves(page);
    });
  });
}
