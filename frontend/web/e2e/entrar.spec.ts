// Roda com o Vite apontando para um Supabase falso e SEM modo de comparação:
//   VITE_SUPABASE_URL=https://comparacao.invalid VITE_SUPABASE_ANON_KEY=chave-de-comparacao \
//     pnpm exec playwright test e2e/entrar.spec.ts
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: 'celular', width: 390, height: 844 },
  { nome: 'pc', width: 1440, height: 900 },
];
const DATA = new Date().toISOString().slice(0, 10);
const PASTA_PRINTS = join(process.cwd(), '..', '..', '.md', '.visual', DATA, 'entrar');
const URL_TOKEN = '**/auth/v1/token*';

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number]) {
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto('/entrar');
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
}

async function preencherEEnviar(page: Page) {
  await page.getByLabel('E-mail', { exact: true }).fill('leandro@exemplo.com');
  await page.getByLabel('Senha', { exact: true }).fill('senha-errada-123');
  await page.getByRole('button', { name: 'Entrar' }).click();
}

async function alvosGrandes(page: Page) {
  const alvos = page.locator('form input, form button, form a');
  for (const alvo of await alvos.all()) {
    expect((await alvo.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
}

mkdirSync(PASTA_PRINTS, { recursive: true });

for (const tamanho of TAMANHOS) {
  test.describe(`entrar ${tamanho.nome}`, () => {
    test('entrar--carregando: "Entrando…" enquanto a resposta não chega', async ({ page }) => {
      await page.route(URL_TOKEN, () => new Promise(() => {}));
      await abrir(page, tamanho);
      await preencherEEnviar(page);

      await expect(page.getByRole('button', { name: 'Entrando…' })).toHaveAttribute('aria-disabled', 'true');
      await expect(page.getByRole('form', { name: 'Entrar' })).toHaveAttribute('aria-busy', 'true');
      await page.screenshot({
        path: join(PASTA_PRINTS, `entrar--carregando-${tamanho.nome}--app.png`),
        fullPage: true,
      });
      await semViolacoesGraves(page);
      await alvosGrandes(page);
    });

    test('entrar--erro: credenciais inválidas mostram o alerta genérico, senha vazia e e-mail mantido', async ({
      page,
    }) => {
      await page.route(URL_TOKEN, (rota) =>
        rota.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }),
        }),
      );
      await abrir(page, tamanho);
      await preencherEEnviar(page);

      await expect(page.locator('p[role=alert]')).toHaveText('E-mail ou senha incorretos.');
      await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('');
      await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue('leandro@exemplo.com');
      await page.screenshot({ path: join(PASTA_PRINTS, `entrar--erro-${tamanho.nome}--app.png`), fullPage: true });
      await semViolacoesGraves(page);
      await alvosGrandes(page);
    });

    test('sem conexão: "Sem conexão."', async ({ page }) => {
      await page.route(URL_TOKEN, (rota) => rota.abort());
      await abrir(page, tamanho);
      await preencherEEnviar(page);

      await expect(page.locator('p[role=alert]')).toHaveText('Sem conexão.');
      await semViolacoesGraves(page);
    });
  });
}
