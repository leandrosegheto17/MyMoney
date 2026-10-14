// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/formas.spec.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: 'celular', width: 390, height: 844 },
  { nome: 'pc', width: 1440, height: 900 },
];
const RESPOSTAS = join(process.cwd(), '..', '..', '.md', 'mockup', 'respostas');
const ler = (arquivo: string) => readFileSync(join(RESPOSTAS, arquivo), 'utf8');

type Cenario = { status: number; corpo: string } | 'pendente';

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number], cenario: Cenario) {
  await page.route('**/rest/v1/rpc/contexto', (rota) =>
    rota.fulfill({ status: 200, contentType: 'application/json', body: ler('contexto.json') }),
  );
  await page.route('**/rest/v1/formas_pagamento*', (rota) =>
    cenario === 'pendente'
      ? new Promise(() => {})
      : rota.fulfill({ status: cenario.status, contentType: 'application/json', body: cenario.corpo }),
  );
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto('/ajustes/formas');
  await expect(page.getByRole('heading', { level: 1, name: 'Formas de pagamento' })).toBeVisible();
}

async function alvosGrandes(page: Page) {
  for (const alvo of await page.locator('main a, main button').all()) {
    expect((await alvo.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
}

for (const tamanho of TAMANHOS) {
  test.describe(`formas ${tamanho.nome}`, () => {
    test('sucesso: grupos, preferida, totais do cartão, alvos de 44 px e sem violações graves', async ({ page }) => {
      await abrir(page, tamanho, { status: 200, corpo: ler('formas-pagamento.json') });

      await expect(page.getByRole('link', { name: /Pix Nubank/ })).toContainText('Preferida');
      await expect(page.getByRole('link', { name: /Cartão de crédito XP/ })).toContainText('Neste mês R$ 1.284,60');
      await expect(page.getByRole('link', { name: 'Nova', exact: true })).toBeVisible();
      await alvosGrandes(page);
      await semViolacoesGraves(page);
    });

    test('vazio: chamada para criar e sem violações graves', async ({ page }) => {
      await abrir(page, tamanho, { status: 200, corpo: ler('formas-vazio.json') });

      await expect(page.getByRole('heading', { name: 'Nenhuma forma de pagamento' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Nova forma' })).toBeVisible();
      await alvosGrandes(page);
      await semViolacoesGraves(page);
    });

    test('carregando: esqueleto anunciado e sem violações graves', async ({ page }) => {
      await abrir(page, tamanho, 'pendente');

      await expect(page.getByText('Carregando…')).toBeVisible();
      await semViolacoesGraves(page);
    });

    test('erro: tentar de novo e sem violações graves', async ({ page }) => {
      test.setTimeout(40_000);
      await abrir(page, tamanho, { status: 503, corpo: ler('erro-servico.json') });

      await expect(page.getByRole('button', { name: /Tentar de novo/ })).toBeVisible({ timeout: 20_000 });
      await alvosGrandes(page);
      await semViolacoesGraves(page);
    });
  });
}
