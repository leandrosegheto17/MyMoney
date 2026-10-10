import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: '390x844', width: 390, height: 844 },
  { nome: '1440x900', width: 1440, height: 900 },
];
const DATA = new Date().toISOString().slice(0, 10);
const PASTA_PRINTS = join(process.cwd(), '..', '..', '.md', '.visual', DATA, 'campo-valor');

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number]) {
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto('/e2e/vitrine/campo-valor.html');
  await expect(page.getByRole('heading', { name: 'Campo de valor' })).toBeVisible();
}

for (const tamanho of TAMANHOS) {
  test.describe(`campo de valor ${tamanho.nome}`, () => {
    test('digitação real, Backspace e cursor no fim', async ({ page }) => {
      await abrir(page, tamanho);
      const campo = page.getByLabel('Valor', { exact: true });
      await campo.click();
      await page.keyboard.type('4590');
      await expect(campo).toHaveValue(/R\$\s45,90/);
      await page.keyboard.press('Backspace');
      await expect(campo).toHaveValue(/R\$\s4,59/);
      const cursor = await campo.evaluate((el: HTMLInputElement) => [
        el.selectionStart,
        el.selectionEnd,
        el.value.length,
      ]);
      expect(cursor).toEqual([cursor[2], cursor[2], cursor[2]]);
    });

    test('altura do campo de pelo menos 44 px', async ({ page }) => {
      await abrir(page, tamanho);
      const caixa = await page.getByLabel('Valor', { exact: true }).boundingBox();
      expect(caixa?.height ?? 0).toBeGreaterThanOrEqual(44);
    });

    test('normal, erro, ajuda e desabilitado sem violações graves, com prints', async ({ page }) => {
      await abrir(page, tamanho);
      await expect(page.getByLabel('Valor pago')).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByLabel('Valor travado')).toBeDisabled();
      await semViolacoesGraves(page);
      mkdirSync(PASTA_PRINTS, { recursive: true });
      for (const estado of ['normal', 'erro', 'ajuda', 'desabilitado']) {
        await page
          .getByTestId(estado)
          .screenshot({ path: join(PASTA_PRINTS, `vitrine-campo-valor-${estado}-${tamanho.nome}.png`) });
      }
    });
  });
}
