import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: '390x844', width: 390, height: 844 },
  { nome: '1440x900', width: 1440, height: 900 },
];
const DATA = new Date().toISOString().slice(0, 10);
const PASTA_PRINTS = join(process.cwd(), '..', '..', '.md', '.visual', DATA, 'TP-0080');

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number]) {
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto('/e2e/vitrine/botao-forma.html');
  await expect(page.getByRole('heading', { name: 'Botão de forma' })).toBeVisible();
}

const botaoForma = (page: Page) => page.getByRole('button', { name: /^Forma de pagamento/ });

for (const tamanho of TAMANHOS) {
  test.describe(`botão de forma ${tamanho.nome}`, () => {
    test('botão e cada opção com pelo menos 44 px', async ({ page }) => {
      await abrir(page, tamanho);
      expect((await botaoForma(page).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
      await botaoForma(page).click();
      const radios = page.getByTestId('forma').getByRole('radio');
      await expect(radios).toHaveCount(3);
      for (let i = 0; i < 3; i++) {
        const caixa = await radios.nth(i).locator('xpath=ancestor::label').boundingBox();
        expect(caixa?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
    });

    test('teclado: Enter abre, setas navegam, Enter escolhe, Esc fecha', async ({ page }) => {
      await abrir(page, tamanho);
      await botaoForma(page).focus();
      await page.keyboard.press('Enter');
      await expect(botaoForma(page)).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByRole('radio', { name: /Pix Nubank/ })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(botaoForma(page)).toHaveAttribute('aria-expanded', 'false');
      await expect(botaoForma(page)).toBeFocused();

      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowDown');
      await expect(botaoForma(page)).toHaveAttribute('aria-expanded', 'false');
      await expect(botaoForma(page)).toHaveAccessibleName(/Débito Itaú/);
    });

    test('2 toques escolhem a forma; sem violações graves fechado e aberto, com prints', async ({ page }) => {
      await abrir(page, tamanho);
      await semViolacoesGraves(page);
      mkdirSync(PASTA_PRINTS, { recursive: true });
      await page.getByTestId('forma').screenshot({ path: join(PASTA_PRINTS, `vitrine-forma-fechada-${tamanho.nome}.png`) });
      await page.getByTestId('conta').screenshot({ path: join(PASTA_PRINTS, `vitrine-conta-${tamanho.nome}.png`) });

      await botaoForma(page).click();
      await semViolacoesGraves(page);
      await page.getByTestId('forma').screenshot({ path: join(PASTA_PRINTS, `vitrine-forma-aberta-${tamanho.nome}.png`) });
      await page.getByRole('radio', { name: /Cartão de crédito XP/ }).click();
      await expect(botaoForma(page)).toHaveAccessibleName(/Cartão de crédito XP/);
      await expect(page.getByTestId('forma').getByRole('radio')).toHaveCount(0);
    });
  });
}
