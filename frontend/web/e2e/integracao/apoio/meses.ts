// Meses ('AAAA-MM') das parcelas, lidos do aviso de lançamento e do calendário.
import { expect, type Page } from '@playwright/test';

const hoje = new Date();

export const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

export function somarMeses(mes: string, n: number): string {
  const d = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5)) - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Mês da 1ª parcela, lido do aviso "Lançado em Nx · … 1ª parcela em dd/mm". O aviso traz só
 * dia/mês: o ano é o corrente, ou o seguinte se o mês já passou.
 */
export async function mesDaPrimeiraParcela(page: Page): Promise<string> {
  const aviso = page.getByRole('status').getByText(/^Lançado em \d+x · .*1ª parcela em \d{2}\/\d{2}$/);
  await expect(aviso).toBeVisible();
  const [, mes] = /1ª parcela em \d{2}\/(\d{2})$/.exec((await aviso.textContent()) ?? '')!;
  const ano = Number(mes) < hoje.getMonth() + 1 ? hoje.getFullYear() + 1 : hoje.getFullYear();
  return `${ano}-${mes}`;
}
