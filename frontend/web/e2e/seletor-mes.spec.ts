import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: '390x844', width: 390, height: 844 },
  { nome: '1440x900', width: 1440, height: 900 },
];

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number]) {
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto('/e2e/vitrine/seletor-mes.html?mes=2026-10');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Outubro');
}

for (const tamanho of TAMANHOS) {
  test.describe(`seletor de mês ${tamanho.nome}`, () => {
    test('botões com caixa de pelo menos 44x44 px', async ({ page }) => {
      await abrir(page, tamanho);
      for (const nome of [/Mês anterior/, /Próximo mês/]) {
        const caixa = await page.getByRole('button', { name: nome }).boundingBox();
        expect(caixa?.width ?? 0).toBeGreaterThanOrEqual(44);
        expect(caixa?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
    });

    test('sem violações graves de acessibilidade', async ({ page }) => {
      await abrir(page, tamanho);
      await semViolacoesGraves(page);
    });

    test('setas do teclado com foco no seletor mudam ?mes=', async ({ page }) => {
      await abrir(page, tamanho);
      await page.getByRole('button', { name: /Próximo mês/ }).focus();
      await page.keyboard.press('ArrowRight');
      await expect(page).toHaveURL(/mes=2026-11/);
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await expect(page).toHaveURL(/mes=2026-09/);
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Setembro');
    });
  });
}
