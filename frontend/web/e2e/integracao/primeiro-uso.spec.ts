// @integracao: Ana (membro B) sem contas e formas. Depois do reset, rode antes:
//   bash backend/supabase/volume/carregar.sh ../ensaio/sem-cadastros-ana.sql
// Sem isso o cartão "Primeiros passos" não aparece e o spec avisa em vez de passar calado.
import { expect, test } from '@playwright/test';
import { semViolacoesGraves } from '../apoio/acessibilidade';
import { abrirFolhaLancar } from './apoio/lancar';
import { novoMarcador } from './apoio/marcador';
import { entrarComo } from './apoio/sessao';

test.describe.configure({ mode: 'serial' });
test.use({ viewport: { width: 390, height: 844 } });

const sufixo = novoMarcador('pu');
const CONTA = `Conta ${sufixo}`;
const FORMA = `Pix ${sufixo}`;

test('@integracao primeiro uso: categorias, cartão de passos, conta e forma pela interface', async ({ page }) => {
  await entrarComo(page, 'B');

  await page.goto('/ajustes/categorias');
  for (const nome of ['Mercado', 'Transporte']) {
    await expect(page.getByText(nome, { exact: true }).first()).toBeVisible();
  }

  await page.goto('/');
  const cartao = page.getByRole('region', { name: 'Primeiros passos' });
  await expect(
    cartao,
    'Ana já tem conta e forma: aplique backend/supabase/ensaio/sem-cadastros-ana.sql (ver frontend/README.md)',
  ).toBeVisible();
  await semViolacoesGraves(page);

  await cartao.getByRole('link', { name: /^Cadastre uma conta/ }).click();
  await page.getByLabel('Nome', { exact: true }).fill(CONTA);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Conta salva')).toBeVisible();

  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Primeiros passos' }).locator('li').first()).toContainText('(feito)');
  await page.getByRole('link', { name: /^Cadastre uma forma de pagamento/ }).click();
  await page.getByLabel('Nome', { exact: true }).fill(FORMA);
  await page.getByLabel('Conta de origem').selectOption({ label: CONTA });
  await page.getByRole('button', { name: 'Criar forma' }).click();
  await expect(page.getByText('Forma salva')).toBeVisible();

  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Primeiros passos' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Primeiros passos' })).toHaveCount(0);

  const folha = await abrirFolhaLancar(page);
  await folha.getByRole('button', { name: /^Forma de pagamento/ }).click();
  await expect(page.getByRole('radio', { name: new RegExp(FORMA) })).toBeVisible();
  await page.goto('/ajustes/contas');
  await expect(page.getByText(CONTA)).toBeVisible();
});
