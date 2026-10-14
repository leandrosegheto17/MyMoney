// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/pagamento-cartao.spec.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: 'celular', width: 390, height: 844 },
  { nome: 'pc', width: 1440, height: 900 },
];
const RAIZ = join(process.cwd(), '..', '..');
const lerJson = (arquivo: string) => JSON.parse(readFileSync(join(RAIZ, '.md', 'mockup', 'respostas', arquivo), 'utf8'));
const json = (corpo: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(corpo) });
const ID_XP = '00000000-0000-4000-8000-000000000303';

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number], contas: string, caminho = '?pagamento=1') {
  await page.route('**/rest/v1/rpc/contexto*', (r) => r.fulfill(json(lerJson('contexto.json'))));
  await page.route('**/rest/v1/formas_pagamento*', (r) => r.fulfill(json(lerJson('forma-xp.json'))));
  await page.route('**/rest/v1/contas*', (r) => r.fulfill(json(lerJson(contas))));
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto(`/ajustes/formas/${ID_XP}${caminho}`);
}

for (const tamanho of TAMANHOS) {
  test.describe(`pagamento do cartão ${tamanho.nome}`, () => {
    test('sucesso: axe, alvos de 44 px e Esc devolve o foco ao link', async ({ page }) => {
      await abrir(page, tamanho, 'contas.json', '');
      const link = page.getByRole('link', { name: 'Registrar pagamento do cartão' });
      await link.click();
      await expect(page.locator('#form-pagto')).toBeVisible();
      await semViolacoesGraves(page);

      const dialogo = page.getByRole('dialog');
      for (const alvo of [
        dialogo.getByRole('button', { name: 'Fechar' }),
        dialogo.getByLabel('Conta de origem'),
        page.getByRole('button', { name: 'Registrar pagamento' }),
      ]) {
        const caixa = await alvo.boundingBox();
        expect(caixa?.height ?? 0).toBeGreaterThanOrEqual(44);
      }

      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(link).toBeFocused();
      expect(page.url()).not.toContain('pagamento');
    });

    test('vazio: axe e atalho para cadastrar a conta', async ({ page }) => {
      await abrir(page, tamanho, 'contas-vazio.json');
      await expect(page.getByRole('heading', { name: 'Cadastre uma conta corrente' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Cadastrar conta' })).toHaveAttribute('href', '/ajustes/contas/nova');
      await semViolacoesGraves(page);
    });

    test('foco preso na folha', async ({ page }) => {
      await abrir(page, tamanho, 'contas.json');
      await expect(page.locator('#form-pagto')).toBeVisible();
      for (let i = 0; i < 12; i += 1) {
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);
      }
    });
  });
}
