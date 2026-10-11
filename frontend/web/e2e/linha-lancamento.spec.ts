import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: '390x844', width: 390, height: 844, pc: false },
  { nome: '1440x900', width: 1440, height: 900, pc: true },
];

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number]) {
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto('/e2e/vitrine/linha-lancamento.html');
  await expect(page.getByRole('link')).toHaveCount(4);
}

for (const tamanho of TAMANHOS) {
  test.describe(`linha de lançamento ${tamanho.nome}`, () => {
    test(`altura mínima de ${tamanho.pc ? 44 : 56} px`, async ({ page }) => {
      await abrir(page, tamanho);
      const links = page.getByRole('link');
      for (let i = 0; i < 4; i++) {
        const caixa = await links.nth(i).boundingBox();
        expect(caixa?.height ?? 0).toBeGreaterThanOrEqual(tamanho.pc ? 44 : 56);
      }
    });

    test(`colunas de data e pagador ${tamanho.pc ? 'visíveis' : 'ocultas'}`, async ({ page }) => {
      await abrir(page, tamanho);
      const conjunta = page.getByRole('link', { name: /^Mercado, Casa, pago por Ana/ });
      const data = conjunta.getByText('12/10', { exact: true });
      const pagadorColuna = conjunta.getByText('Ana', { exact: true });
      const pagadorMovel = conjunta.getByText('Pago por Ana');
      expect(await data.isVisible()).toBe(tamanho.pc);
      expect(await pagadorColuna.isVisible()).toBe(tamanho.pc);
      expect(await pagadorMovel.isVisible()).toBe(!tamanho.pc);
    });

    test('nome acessível completo e sem violações graves de acessibilidade', async ({ page }) => {
      await abrir(page, tamanho);
      await expect(
        page.getByRole('link', { name: 'Mercado, Casa, pago por Ana, R$ 45,90, 12 de outubro' }),
      ).toBeVisible();
      await semViolacoesGraves(page);
    });
  });
}
