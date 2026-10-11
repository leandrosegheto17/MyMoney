// Roda com o Vite em modo de sessão falsa e um Supabase falso (as respostas são interceptadas):
//   VITE_MODO_COMPARACAO=sessao-falsa VITE_SUPABASE_URL=https://comparacao.invalid \
//   VITE_SUPABASE_ANON_KEY=chave-de-comparacao pnpm exec playwright test e2e/fixas.spec.ts
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

interface Cenario {
  ocorrencias: { status: number; corpo: string } | 'pendente';
  modelos?: string;
}

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number], cenario: Cenario) {
  const json = (corpo: string, status = 200) => ({ status, contentType: 'application/json', body: corpo });
  await page.route('**/rest/v1/rpc/contexto', (rota) => rota.fulfill(json(ler('contexto.json'))));
  await page.route('**/rest/v1/rpc/ocorrencias_mes*', (rota) =>
    cenario.ocorrencias === 'pendente'
      ? new Promise(() => {})
      : rota.fulfill(json(cenario.ocorrencias.corpo, cenario.ocorrencias.status)),
  );
  await page.route('**/rest/v1/despesas_fixas*', (rota) => rota.fulfill(json(cenario.modelos ?? ler('despesas-fixas.json'))));
  await page.route('**/rest/v1/rpc/desfazer_pagamento*', (rota) => rota.fulfill(json('null')));
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto('/fixas?mes=2026-10');
  await expect(page.getByRole('heading', { level: 1, name: 'Despesas fixas' })).toBeVisible();
}

async function alvosGrandes(page: Page) {
  for (const alvo of await page.locator('main a, main button').all()) {
    expect((await alvo.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
}

for (const tamanho of TAMANHOS) {
  test.describe(`despesas fixas ${tamanho.nome}`, () => {
    test('sucesso: ocorrências, modelos, alvos de 44 px e sem violações graves', async ({ page }) => {
      await abrir(page, tamanho, { ocorrencias: { status: 200, corpo: ler('ocorrencias-mes.json') } });

      await expect(page.getByRole('heading', { name: /Pagas: 4 de 7/ })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Modelos' })).toBeVisible();
      await alvosGrandes(page);
      await semViolacoesGraves(page);
    });

    test('trocar o mês pelo seletor muda ?mes=', async ({ page }) => {
      await abrir(page, tamanho, { ocorrencias: { status: 200, corpo: ler('ocorrencias-mes.json') } });

      await page.getByRole('button', { name: 'Próximo mês: novembro de 2026' }).click();
      await expect(page).toHaveURL(/mes=2026-11/);
    });

    test('desfazer: diálogo sem violações, Esc cancela e devolve o foco ao botão', async ({ page }) => {
      await abrir(page, tamanho, { ocorrencias: { status: 200, corpo: ler('ocorrencias-mes.json') } });

      const gatilho = page.getByRole('button', { name: 'Desfazer pagamento: Água' });
      await gatilho.click();
      const dialogo = page.getByRole('alertdialog');
      await expect(dialogo).toBeVisible();
      await semViolacoesGraves(page);
      await page.keyboard.press('Escape');
      await expect(dialogo).toBeHidden();
      await expect(gatilho).toBeFocused();
    });

    test('vazio: chamada para criar e sem violações graves', async ({ page }) => {
      await abrir(page, tamanho, {
        ocorrencias: { status: 200, corpo: ler('ocorrencias-mes-vazio.json') },
        modelos: ler('despesas-fixas-vazio.json'),
      });

      await expect(page.getByRole('heading', { name: 'Nenhuma despesa fixa cadastrada' })).toBeVisible();
      await alvosGrandes(page);
      await semViolacoesGraves(page);
    });

    test('carregando: esqueleto anunciado e sem violações graves', async ({ page }) => {
      await abrir(page, tamanho, { ocorrencias: 'pendente' });

      await expect(page.getByText('Carregando as despesas fixas…')).toBeAttached();
      await semViolacoesGraves(page);
    });

    test('erro: tentar de novo e sem violações graves', async ({ page }) => {
      test.setTimeout(40_000);
      await abrir(page, tamanho, { ocorrencias: { status: 503, corpo: ler('erro-servico.json') } });

      await expect(page.getByRole('button', { name: /Tentar de novo/ })).toBeVisible({ timeout: 20_000 });
      await alvosGrandes(page);
      await semViolacoesGraves(page);
    });
  });
}
