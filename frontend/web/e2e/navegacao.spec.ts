import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const VITRINE = '/e2e/vitrine/navegacao.html';
const RAIZ = resolve(import.meta.dirname, '../../..');
const MOCKUP = pathToFileURL(resolve(RAIZ, '.md/mockup/telas/lancamentos--sucesso.html')).href;
const PASTA_PRINTS = resolve(RAIZ, '.md/.visual', new Date().toISOString().slice(0, 10), 'navegacao');

const CELULAR = { width: 390, height: 844 };
const PC = { width: 1440, height: 900 };

async function alvosDoLinks(page: Page, seletor: string) {
  const links = page.locator(`${seletor} a`);
  const total = await links.count();
  const caixas = [];
  for (let i = 0; i < total; i += 1) {
    const caixa = await links.nth(i).boundingBox();
    expect(caixa, `link ${i} sem caixa`).not.toBeNull();
    caixas.push(caixa!);
  }
  return caixas;
}

test.describe('navegação (vitrine)', () => {
  test('celular: barra visível, trilho oculto, alvos de 44 px, "+" maior, sem violações graves', async ({ page }) => {
    await page.setViewportSize(CELULAR);
    await page.goto(VITRINE);
    const barra = page.locator('nav[aria-label="Navegação principal"]:visible');
    await expect(barra).toHaveCount(1);
    await expect(page.getByText('MyMoney')).toBeHidden();

    const caixas = await alvosDoLinks(page, 'nav:visible');
    expect(caixas).toHaveLength(5);
    for (const caixa of caixas) {
      expect(caixa.width).toBeGreaterThanOrEqual(44);
      expect(caixa.height).toBeGreaterThanOrEqual(44);
    }
    const botao = await page.locator('nav:visible a[href="/lancar"] span').boundingBox();
    const outroIcone = await page.locator('nav:visible a[href="/metas"] svg').boundingBox();
    expect(botao!.width).toBeGreaterThan(outroIcone!.width);
    await expect(page.getByRole('link', { name: 'Lançamentos' })).toHaveAttribute('aria-current', 'page');

    await semViolacoesGraves(page);
    mkdirSync(PASTA_PRINTS, { recursive: true });
    await barra.screenshot({ path: resolve(PASTA_PRINTS, 'barra-app.png') });
  });

  test('PC: trilho visível, barra oculta, alvos de 44 px, sem violações graves', async ({ page }) => {
    await page.setViewportSize(PC);
    await page.goto(VITRINE);
    const trilho = page.locator('nav[aria-label="Navegação principal"]:visible');
    await expect(trilho).toHaveCount(1);
    await expect(trilho.getByText('MyMoney')).toBeVisible();

    const caixas = await alvosDoLinks(page, 'nav:visible');
    expect(caixas).toHaveLength(6);
    for (const caixa of caixas) {
      expect(caixa.width).toBeGreaterThanOrEqual(44);
      expect(caixa.height).toBeGreaterThanOrEqual(44);
    }

    await semViolacoesGraves(page);
    mkdirSync(PASTA_PRINTS, { recursive: true });
    await trilho.screenshot({ path: resolve(PASTA_PRINTS, 'trilho-app.png') });
  });

  test('prints do mockup para a comparação lado a lado', async ({ page }) => {
    mkdirSync(PASTA_PRINTS, { recursive: true });
    await page.setViewportSize(CELULAR);
    await page.goto(MOCKUP);
    await page.locator('nav.barra-inferior').screenshot({ path: resolve(PASTA_PRINTS, 'barra-mockup.png') });
    await page.setViewportSize(PC);
    await page.locator('nav.trilho').screenshot({ path: resolve(PASTA_PRINTS, 'trilho-mockup.png') });
  });
});
