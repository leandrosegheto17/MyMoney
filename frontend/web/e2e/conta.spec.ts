// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/conta.spec.ts
// PASTA_PRINTS=<pasta> grava o app e o mockup do estado de erro.
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: 'celular', width: 390, height: 844 },
  { nome: 'pc', width: 1440, height: 900 },
];
const MOCKUP = join(process.cwd(), '..', '..', '.md', 'mockup');
const PASTA_PRINTS = process.env.PASTA_PRINTS;
const ID = '00000000-0000-4000-8000-000000000201';
const ler = (arquivo: string) => readFileSync(join(MOCKUP, 'respostas', arquivo), 'utf8');
const json = (corpo: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(corpo) });
const conta = () => ({ ...(JSON.parse(ler('conta-nubank.json')) as object[])[0], pode_excluir: true });

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number], rota = `/ajustes/contas/${ID}?saldo_real=320255`) {
  await page.route('**/rest/v1/rpc/contexto', (r) => r.fulfill(json(JSON.parse(ler('contexto.json')))));
  await page.route('**/rest/v1/contas*', (r) => r.fulfill(json([conta()])));
  await page.route('**/rest/v1/rpc/ajustar_saldo*', (r) => r.fulfill(json(-1230)));
  await page.route('**/rest/v1/rpc/excluir_conta*', (r) => r.fulfill(json({ message: 'em_uso' }, 400)));
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto(rota);
}

async function alvosGrandes(page: Page) {
  for (const alvo of await page.locator('main a, main button, main input').all()) {
    expect((await alvo.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
}

for (const tamanho of TAMANHOS) {
  test.describe(`conta ${tamanho.nome}`, () => {
    test('sucesso e prévia: saldo, diferença do servidor, alvos e axe', async ({ page }) => {
      await abrir(page, tamanho);

      await expect(page.getByRole('heading', { name: 'Saldo atual' })).toBeVisible();
      await expect(page.getByLabel('Nome')).toHaveValue('Nubank');
      await expect(page.getByRole('status').filter({ hasText: 'Ajuste de' })).toContainText('Ajuste de − R$ 12,30');
      await alvosGrandes(page);
      await semViolacoesGraves(page);
    });

    test('títulos dos cartões têm cor, peso e tamanho do mockup', async ({ page }) => {
      await abrir(page, tamanho);
      const estiloApp = (nome: string) =>
        page.getByRole('heading', { name: nome }).evaluate((el) => {
          const c = getComputedStyle(el);
          return { cor: c.color, peso: c.fontWeight, tamanho: c.fontSize };
        });
      const app = { saldo: await estiloApp('Saldo atual'), ajuste: await estiloApp('Informar saldo real') };

      const mockup = await page.context().newPage();
      await mockup.setViewportSize({ width: tamanho.width, height: tamanho.height });
      await mockup.goto(pathToFileURL(join(MOCKUP, 'telas', 'conta--sucesso.html')).href);
      const estiloMockup = (nome: string) =>
        mockup.locator('h2', { hasText: nome }).evaluate((el) => {
          const c = getComputedStyle(el);
          return { cor: c.color, peso: c.fontWeight, tamanho: c.fontSize };
        });
      expect(app.saldo).toEqual(await estiloMockup('Saldo atual'));
      expect(app.ajuste).toEqual(await estiloMockup('Informar saldo real'));
      expect(app.saldo.cor).not.toEqual(app.ajuste.cor);
    });

    test('excluir: diálogo sem violações e, em uso, o estado de erro com Arquivar conta', async ({ page }) => {
      await abrir(page, tamanho);

      await page.getByRole('button', { name: 'Excluir' }).click();
      const dialogo = page.getByRole('alertdialog', { name: 'Excluir esta conta?' });
      await expect(dialogo).toBeVisible();
      await page.waitForTimeout(300);
      await semViolacoesGraves(page);

      await dialogo.getByRole('button', { name: 'Excluir' }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'Esta conta tem lançamentos' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Arquivar conta' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancelar' })).toBeVisible();
      await alvosGrandes(page);
      await semViolacoesGraves(page);

      if (PASTA_PRINTS) {
        mkdirSync(PASTA_PRINTS, { recursive: true });
        await page.screenshot({ path: join(PASTA_PRINTS, `conta--erro-${tamanho.nome}--app.png`), fullPage: true });
        await page.goto(pathToFileURL(join(MOCKUP, 'telas', 'conta--erro.html')).href);
        await page.screenshot({ path: join(PASTA_PRINTS, `conta--erro-${tamanho.nome}--mockup.png`), fullPage: true });
      }
    });

    test('conta nova: só o formulário e axe', async ({ page }) => {
      await abrir(page, tamanho, '/ajustes/contas/nova');

      await expect(page.getByRole('heading', { level: 1, name: 'Nova conta' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Saldo atual' })).toHaveCount(0);
      await alvosGrandes(page);
      await semViolacoesGraves(page);
    });
  });
}
