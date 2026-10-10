import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

const TAMANHOS = [
  { nome: '390x844', width: 390, height: 844 },
  { nome: '1440x900', width: 1440, height: 900 },
];
const DATA = new Date().toISOString().slice(0, 10);
const PASTA_PRINTS = join(process.cwd(), '..', '..', '.md', '.visual', DATA, 'formulario');

async function abrir(page: Page, tamanho: (typeof TAMANHOS)[number]) {
  await page.setViewportSize({ width: tamanho.width, height: tamanho.height });
  await page.goto('/e2e/vitrine/formulario.html');
  await expect(page.getByRole('heading', { name: 'Nova conta' })).toBeVisible();
}

for (const tamanho of TAMANHOS) {
  test.describe(`formulário ${tamanho.nome}`, () => {
    test('estado normal sem violações graves e alvos de 44 px', async ({ page }) => {
      await abrir(page, tamanho);
      await semViolacoesGraves(page);
      const alvos = page.locator('form input:not([type=checkbox]), form select, form button, form label:has(input)');
      for (const alvo of await alvos.all()) {
        const caixa = await alvo.boundingBox();
        expect(caixa?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
      const chave = page.getByRole('switch');
      expect((await chave.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(44);
    });

    test('submeter vazio foca o primeiro campo inválido', async ({ page }) => {
      await abrir(page, tamanho);
      await page.getByRole('button', { name: 'Salvar' }).click();
      const nome = page.getByLabel('Nome');
      await expect(nome).toBeFocused();
      await expect(nome).toHaveAttribute('aria-invalid', 'true');
      await expect(nome).toHaveAccessibleDescription(/Informe o nome\./);
      await semViolacoesGraves(page);
    });

    test('formulario--salvando: botão vira "Salvando…" e o segundo clique não envia de novo', async ({ page }) => {
      await abrir(page, tamanho);
      await page.getByLabel('Nome').fill('Nubank');
      const botao = page.getByRole('button', { name: 'Salvar' });
      await botao.click();
      const salvando = page.getByRole('button', { name: 'Salvando…' });
      await expect(salvando).toHaveAttribute('aria-disabled', 'true');
      await expect(page.getByTestId('envios')).toHaveText('1');
      await salvando.click({ force: true });
      await salvando.press('Enter');
      await expect(page.getByTestId('envios')).toHaveText('1');
      await expect(page.locator('form')).toHaveAttribute('aria-busy', 'true');
      await semViolacoesGraves(page);
      mkdirSync(PASTA_PRINTS, { recursive: true });
      await page.locator('form').screenshot({ path: join(PASTA_PRINTS, `vitrine-salvando-${tamanho.nome}.png`) });
    });
  });
}
