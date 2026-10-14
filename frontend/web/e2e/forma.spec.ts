// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/forma.spec.ts
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
const ID = '00000000-0000-4000-8000-000000000303';
const ler = (arquivo: string) => readFileSync(join(MOCKUP, 'respostas', arquivo), 'utf8');
const json = (corpo: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(corpo) });
const forma = () => ({ ...(JSON.parse(ler('forma-xp.json')) as object[])[0], pode_excluir: true });

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number], rota = `/ajustes/formas/${ID}`) {
  await page.route('**/rest/v1/rpc/contexto', (r) => r.fulfill(json(JSON.parse(ler('contexto.json')))));
  await page.route('**/rest/v1/formas_pagamento*', (r) => r.fulfill(json([forma()])));
  await page.route('**/rest/v1/contas*', (r) => r.fulfill(json(JSON.parse(ler('contas.json')))));
  await page.route('**/rest/v1/rpc/excluir_forma*', (r) => r.fulfill(json({ message: 'em_uso' }, 400)));
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto(rota);
}

async function alvosGrandes(page: Page) {
  for (const alvo of await page.locator('main a, main button, main input, main select').all()) {
    if (await alvo.evaluate((el) => el.matches('input[type="radio"], input[role="switch"]'))) continue;
    expect((await alvo.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
}

for (const tamanho of TAMANHOS) {
  test.describe(`forma ${tamanho.nome}`, () => {
    test('sucesso: quadro do cartão, tipo só leitura, alvos e axe', async ({ page }) => {
      await abrir(page, tamanho);

      await expect(page.getByRole('heading', { level: 2, name: 'Cartão de crédito XP' })).toBeVisible();
      await expect(page.getByText('Neste mês (parcelas com data em outubro)')).toBeVisible();
      await expect(page.getByLabel('Dia de vencimento')).toHaveValue('10');
      await expect(page.getByRole('radio')).toHaveCount(0);
      await alvosGrandes(page);
      await semViolacoesGraves(page);
    });

    test('nova: erro do dia no Crédito, setas no Segmentado e axe', async ({ page }) => {
      await abrir(page, tamanho, '/ajustes/formas/nova');

      await page.getByLabel('Nome').fill('Cartão Nubank');
      await page.getByRole('radio', { name: 'Pix' }).focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('radio', { name: 'Débito' })).toBeChecked();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('radio', { name: 'Crédito' })).toBeChecked();

      await page.getByRole('button', { name: 'Criar forma' }).click();
      await expect(page.getByLabel('Dia de vencimento')).toBeFocused();
      await expect(page.getByText('Informe o dia de vencimento do cartão (1 a 31).')).toBeVisible();
      await alvosGrandes(page);
      await semViolacoesGraves(page);

      if (PASTA_PRINTS) {
        mkdirSync(PASTA_PRINTS, { recursive: true });
        await page.screenshot({ path: join(PASTA_PRINTS, `forma--erro-${tamanho.nome}--app.png`), fullPage: true });
        await page.goto(pathToFileURL(join(MOCKUP, 'telas', 'forma--erro.html')).href);
        await page.screenshot({ path: join(PASTA_PRINTS, `forma--erro-${tamanho.nome}--mockup.png`), fullPage: true });
      }
    });

    test('excluir: diálogo sem violações e, em uso, o aviso com Arquivar forma', async ({ page }) => {
      await abrir(page, tamanho);

      await page.getByRole('button', { name: 'Excluir' }).click();
      const dialogo = page.getByRole('alertdialog', { name: 'Excluir esta forma?' });
      await expect(dialogo).toBeVisible();
      await page.waitForTimeout(300);
      await semViolacoesGraves(page);

      await dialogo.getByRole('button', { name: 'Excluir' }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'Esta forma tem lançamentos' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Arquivar forma' })).toBeVisible();
      await alvosGrandes(page);
      await semViolacoesGraves(page);
    });
  });
}
