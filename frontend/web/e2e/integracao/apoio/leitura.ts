// Leituras da T02 e da T04 reais, em centavos e em itens, para comparar antes/depois.
import { expect, type Page } from '@playwright/test';

export const emCentavos = (texto: string): number => Math.round(Number(texto.replace(/[^\d,-]/g, '').replace(',', '.')) * 100);

/** "Meu individual" do bloco Eu da T02 do mês corrente. */
export async function meuIndividual(page: Page): Promise<number> {
  await page.goto('/');
  const valor = page.locator('dt', { hasText: /^Meu individual$/ }).locator('xpath=following-sibling::dd');
  await expect(valor).toBeVisible();
  return emCentavos((await valor.textContent()) ?? '');
}

/** Linhas da T04 de um mês ('AAAA-MM') cujo nome acessível traz o marcador. */
export async function linhasComMarcador(page: Page, mes: string, marcador: string) {
  await page.goto(`/lancamentos?mes=${mes}`);
  await expect(page.getByText(/Total filtrado/)).toBeVisible();
  return page.getByRole('link', { name: new RegExp(marcador) });
}

/** Quantidade "N lançamentos" do total filtrado na T04. */
export async function quantidadeNaLista(page: Page): Promise<number> {
  const texto = (await page.getByText(/· (\d+) lançamentos?/).first().textContent()) ?? '';
  return Number(/(\d+) lançamento/.exec(texto)?.[1]);
}
