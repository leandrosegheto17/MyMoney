// @integracao: Supabase local, dois membros. O pagador ajusta a data da parcela 2/3 na T05 e a
// parcela muda de mês na T04 e na T02; o outro membro não vê "Alterar data" (CA-08.5, RN-04).
import { expect, test } from '@playwright/test';
import { excluirLancamentosLocais, registrarLancamentosCriados } from '../apoio/limpeza-local';
import { abrirSessoes, lancarCompra, type Compra, type Sessoes } from './apoio/casal';
import { linhasComMarcador, valorDaT02 } from './apoio/leitura';
import { novoMarcador } from './apoio/marcador';
import { ambienteIntegracao, emailDe } from './apoio/sessao';

test.describe.configure({ mode: 'serial' });

const VALOR_PARCELA = 65000;
const CASA = 'Variáveis da casa';

let sessoes: Sessoes;
let criados: string[] = [];
let compra: Compra;
let mesOriginal: string;
let mesNovo: string;
const antes = new Map<string, number>();

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  sessoes = await abrirSessoes(browser);
  criados = registrarLancamentosCriados(sessoes.a);
});

test.afterAll(async () => {
  const { senha } = ambienteIntegracao();
  await excluirLancamentosLocais(criados, emailDe('A'), senha);
  await sessoes.fechar();
});

test('@integracao ajuste de data da parcela: 2/3 muda de mês na T04 e na T02, com selo na T05', async () => {
  test.setTimeout(120_000);
  const { a } = sessoes;
  compra = await lancarCompra(a, criados, {
    valorCentavos: VALOR_PARCELA * 3,
    categoria: 'Mercado',
    forma: 'Cartão de crédito XP',
    parcelas: 3,
    descricao: novoMarcador('e2e-ajuste'),
  });
  // A 2/3 sai do mês em que cai e vai para o mês da 3/3.
  [, mesOriginal, mesNovo] = compra.meses;
  for (const mes of [mesOriginal, mesNovo]) antes.set(mes, await valorDaT02(a, mes, CASA));

  await a.goto(`/lancamentos/${compra.id}`);
  await a.getByRole('button', { name: 'Alterar data da parcela 2 de 3' }).click();
  await a.getByLabel('Nova data da parcela 2 de 3').fill(`${mesNovo}-05`);
  await expect(a.getByText('Data da parcela alterada')).toBeVisible();
  await expect(a.getByText('data ajustada')).toHaveCount(1);
  await a.reload();
  await expect(a.getByText('data ajustada')).toHaveCount(1);

  await expect(await linhasComMarcador(a, mesOriginal, compra.marcador)).toHaveCount(0);
  const noNovo = await linhasComMarcador(a, mesNovo, compra.marcador);
  await expect(noNovo).toHaveCount(2);
  await expect(noNovo.filter({ hasText: /2\/3/ })).toHaveCount(1);

  await expect.poll(() => valorDaT02(a, mesOriginal, CASA)).toBe(antes.get(mesOriginal)! - VALOR_PARCELA);
  await expect.poll(() => valorDaT02(a, mesNovo, CASA)).toBe(antes.get(mesNovo)! + VALOR_PARCELA);
});

test('@integracao o outro membro vê a T05 da compra sem "Alterar data" e sem selo', async () => {
  const { b } = sessoes;
  await b.goto(`/lancamentos/${compra.id}`);
  await expect(b.getByRole('region', { name: 'Parcelas' })).toBeVisible();
  await expect(b.getByRole('button', { name: /Alterar data/ })).toHaveCount(0);
  await expect(b.getByText('data ajustada')).toHaveCount(0);
});
