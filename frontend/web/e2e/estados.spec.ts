import { expect, test } from '@playwright/test';
import { semViolacoesGraves } from './apoio/acessibilidade';

test('vazio, erro e carregando não têm violações graves', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/e2e/vitrine/estados.html');
  await expect(page.getByRole('heading', { name: 'Nenhum lançamento' })).toBeVisible();
  await expect(page.getByText('Nenhuma meta cadastrada')).toBeVisible();
  await expect(page.getByRole('alert').getByRole('heading', { name: 'Não foi possível carregar' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Carregando…');
  await semViolacoesGraves(page);
});
