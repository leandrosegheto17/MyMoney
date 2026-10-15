// Leituras da T02 e da T04 reais, em centavos e em itens, para comparar antes/depois.
import { expect, type Locator, type Page } from '@playwright/test';

export const emCentavos = (texto: string): number => Math.round(Number(texto.replace(/[^\d,-]/g, '').replace(',', '.')) * 100);

/** "Meu individual" do bloco Eu da T02 do mês corrente. */
export async function meuIndividual(page: Page): Promise<number> {
  await page.goto('/');
  const valor = page.locator('dt', { hasText: /^Meu individual$/ }).locator('xpath=following-sibling::dd');
  await expect(valor).toBeVisible();
  return emCentavos((await valor.textContent()) ?? '');
}

/**
 * Valor de uma linha rotulada (ex.: "Variáveis da casa") da T02 de um mês ('AAAA-MM'), em centavos.
 * Mês sem lançamentos não mostra as linhas de detalhe: vale 0.
 */
export async function valorDaT02(page: Page, mes: string, rotulo: string): Promise<number> {
  await page.goto(`/?mes=${mes}`);
  await expect(page.locator('dt', { hasText: /^Meu individual$/ })).toBeVisible();
  const valor = page.locator('dt', { hasText: new RegExp(`^${rotulo}$`) }).locator('xpath=following-sibling::dd');
  if ((await valor.count()) === 0) return 0;
  return emCentavos((await valor.textContent()) ?? '');
}

/** Soma dos valores "R$ x,xx" dos nomes acessíveis das linhas (a parcela de cada mês), em centavos. */
export async function somaDasLinhas(linhas: Locator): Promise<number> {
  const nomes = await linhas.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));
  return nomes.reduce((soma, nome) => soma + emCentavos(/R\$[\s ]*[\d.]+,\d{2}/.exec(nome)?.[0] ?? ''), 0);
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
