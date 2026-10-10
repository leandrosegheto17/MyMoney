import { expect, test } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

test('orçamento e metas, com dado e vazio, nos blocos casa e eu, sem violações graves', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/e2e/vitrine/inicio-componentes.html');
  await expect(page.getByRole('article', { name: /^Orçamento da casa/ }).first()).toBeVisible();
  await expect(page.getByRole('article', { name: /^Meu orçamento/ }).first()).toBeVisible();
  await expect(page.getByText('Atingida').first()).toBeVisible();
  await expect(page.getByText('Nenhuma meta ainda.')).toBeVisible();
  await semViolacoesGraves(page);
});
