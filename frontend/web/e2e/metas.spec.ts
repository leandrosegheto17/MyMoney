// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/metas.spec.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: 'celular', width: 390, height: 844 },
  { nome: 'pc', width: 1440, height: 900 },
];
const MOCKUP = join(process.cwd(), '..', '..', '.md', 'mockup');
const lerJson = (arquivo: string) => JSON.parse(readFileSync(join(MOCKUP, 'respostas', arquivo), 'utf8'));
const json = (corpo: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(corpo) });

async function abrir(
  page: Page,
  tamanho: (typeof TAMANHOS)[number],
  { metas = 'metas.json', status = 200, pendente = false } = {},
) {
  await page.route('**/rest/v1/rpc/contexto*', (r) => r.fulfill(json(lerJson('contexto.json'))));
  await page.route('**/rest/v1/metas*', (r) => (pendente ? undefined : r.fulfill(json(lerJson(metas), status))));
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto('/metas');
}

for (const tamanho of TAMANHOS) {
  test.describe(`metas ${tamanho.nome}`, () => {
    test('sucesso: seções, cartões e axe', async ({ page }) => {
      await abrir(page, tamanho);

      await expect(page.getByRole('heading', { level: 1, name: 'Metas' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Da casa' }).getByRole('link')).toHaveCount(2);
      await expect(page.getByRole('region', { name: 'Minhas' }).getByRole('link')).toHaveCount(2);
      await expect(page.getByRole('progressbar', { name: 'Viagem Nordeste' })).toHaveAttribute('aria-valuenow', '52');
      await semViolacoesGraves(page);
    });

    test('alvos de toque com pelo menos 44 px', async ({ page }) => {
      await abrir(page, tamanho);

      const nova = page.getByRole('main').getByRole('link').first();
      await expect(nova).toBeVisible();
      for (const alvo of [page.getByRole('link', { name: 'Nova meta' }), nova]) {
        const caixa = await alvo.boundingBox();
        expect(caixa?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
    });

    test('teclado: Tab percorre os cartões e Enter abre a meta', async ({ page }) => {
      await abrir(page, tamanho);

      const reserva = page.getByRole('link', { name: /Reserva de emergência/ });
      await reserva.focus();
      await expect(reserva).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: /Viagem Nordeste/ })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/metas\/00000000-0000-4000-8000-000000000902$/);
    });

    test('vazio: estado em cada seção e axe', async ({ page }) => {
      await abrir(page, tamanho, { metas: 'metas-vazio.json' });

      await expect(page.getByRole('link', { name: 'Nova meta da casa' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Nova meta minha' })).toBeVisible();
      await semViolacoesGraves(page);
    });

    test('carregando: aviso para leitor de tela e axe', async ({ page }) => {
      await abrir(page, tamanho, { pendente: true });

      await expect(page.getByText('Carregando as metas…')).toHaveAttribute('role', 'status');
      await expect(page.getByRole('link', { name: 'Nova meta' })).toBeVisible();
      await semViolacoesGraves(page);
    });

    test('erro: estado de erro, sem seções, e axe', async ({ page }) => {
      test.setTimeout(40_000);
      await abrir(page, tamanho, { metas: 'erro-servico.json', status: 503 });

      await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível carregar' })).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByRole('region', { name: 'Da casa' })).toHaveCount(0);
      await semViolacoesGraves(page);
    });
  });
}
