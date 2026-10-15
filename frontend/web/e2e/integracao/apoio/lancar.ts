// Lança uma despesa pela folha "Lançar" aberta no "+" da navegação, como a pessoa faz.
import { expect, type Page } from '@playwright/test';

export interface LancamentoDeTeste {
  /** Em centavos: 1500 vira R$ 15,00. */
  valorCentavos: number;
  /** Nome (ou parte) da categoria de despesa. */
  categoria: string;
  /** Nome da forma; sem ele, vale a forma já selecionada. */
  forma?: string;
  /** 1 = à vista. Só vale para forma de crédito. */
  parcelas?: number;
  descricao?: string;
}

export async function abrirFolhaLancar(page: Page) {
  await page.getByRole('navigation').first().getByRole('link', { name: 'Lançar' }).click();
  const folha = page.getByRole('dialog', { name: 'Lançar' });
  await expect(folha).toBeVisible();
  return folha;
}

export async function lancarPelaFolha(page: Page, lancamento: LancamentoDeTeste): Promise<void> {
  const folha = await abrirFolhaLancar(page);
  await page.locator('#valor').click();
  await page.keyboard.type(String(lancamento.valorCentavos));
  // A grade mostra as 8 mais usadas; as demais ficam em "Outras…".
  const categoria = page.getByRole('radio', { name: new RegExp(`^${lancamento.categoria}`) });
  if ((await categoria.count()) === 0) await folha.getByRole('button', { name: 'Outras…' }).click();
  await categoria.locator('xpath=ancestor::label').click();

  if (lancamento.forma) {
    await folha.getByRole('button', { name: /^Forma de pagamento/ }).click();
    await page.getByRole('radio', { name: new RegExp(lancamento.forma) }).locator('xpath=ancestor::label').click();
  }
  if (lancamento.parcelas && lancamento.parcelas > 1) {
    await folha.getByRole('radiogroup', { name: 'Parcelas' }).getByText(`${lancamento.parcelas}x`, { exact: true }).click();
  }
  if (lancamento.descricao) {
    await folha.getByLabel('Descrição (opcional)').fill(lancamento.descricao);
  }
  await folha.getByRole('button', { name: /^Lançar R\$/ }).click();
}

/** Depois de lançar a folha continua aberta, pronta para o próximo: quem quer ver a tela atrás a fecha. */
export async function fecharFolhaLancar(page: Page): Promise<void> {
  await page.getByRole('dialog', { name: 'Lançar' }).getByRole('button', { name: 'Fechar' }).click();
  await expect(page.getByRole('dialog', { name: 'Lançar' })).toBeHidden();
}
