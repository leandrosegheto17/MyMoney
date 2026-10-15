// @integracao: Supabase local; o usuário A lança pela folha e confere T02 e T04 reais.
import { expect, test } from '@playwright/test';
import { excluirLancamentosLocais, registrarLancamentosCriados } from '../apoio/limpeza-local';
import { semViolacoesGraves } from '../apoio/acessibilidade';
import { lancarPelaFolha } from './apoio/lancar';
import { linhasComMarcador, meuIndividual } from './apoio/leitura';
import { novoMarcador } from './apoio/marcador';
import { ambienteIntegracao, emailDe, entrarComo } from './apoio/sessao';

test.describe.configure({ mode: 'serial' });
test.use({ viewport: { width: 390, height: 844 } });

const hoje = new Date();
const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
const somarMeses = (mes: string, n: number) => {
  const d = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5)) - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

let criados: string[] = [];
test.afterEach(async () => {
  const { senha } = ambienteIntegracao();
  await excluirLancamentosLocais(criados, emailDe('A'), senha);
  criados = [];
});

test('@integracao Pix: aviso, total da T02 e item na T04', async ({ page }) => {
  const marcador = novoMarcador('pix');
  criados = registrarLancamentosCriados(page);
  await entrarComo(page, 'A');
  const antes = await meuIndividual(page);

  await lancarPelaFolha(page, { valorCentavos: 12345, categoria: 'Lazer pessoal', forma: 'Pix Nubank', descricao: marcador });
  await expect(page.getByRole('status').getByText(/^Lançado: R\$ 123,45 · Lazer pessoal/)).toBeVisible();

  await expect.poll(() => meuIndividual(page)).toBe(antes + 12345);
  await semViolacoesGraves(page);

  const linhas = await linhasComMarcador(page, mesAtual, marcador);
  await expect(linhas).toHaveCount(1);
  await expect(linhas).toHaveAccessibleName(/R\$ 123,45/);
  await semViolacoesGraves(page);
});

test('@integracao Crédito 3x: aviso da 1ª parcela e as parcelas nos meses certos', async ({ page }) => {
  const marcador = novoMarcador('cred');
  criados = registrarLancamentosCriados(page);
  await entrarComo(page, 'A');
  await page.goto('/');

  await lancarPelaFolha(page, {
    valorCentavos: 30000,
    categoria: 'Lazer pessoal',
    forma: 'Cartão de crédito XP',
    parcelas: 3,
    descricao: marcador,
  });
  const aviso = page.getByRole('status').getByText(/^Lançado em 3x · Lazer pessoal.*1ª parcela em \d{2}\/\d{2}$/);
  await expect(aviso).toBeVisible();
  const [, mesDaParcela] = /1ª parcela em \d{2}\/(\d{2})$/.exec((await aviso.textContent()) ?? '')!;

  // O aviso traz só dia/mês: o ano é o corrente, ou o seguinte se o mês já passou.
  const ano = Number(mesDaParcela) < hoje.getMonth() + 1 ? hoje.getFullYear() + 1 : hoje.getFullYear();
  const primeiro = `${ano}-${mesDaParcela}`;
  for (const [indice, mes] of [primeiro, somarMeses(primeiro, 1), somarMeses(primeiro, 2)].entries()) {
    const linhas = await linhasComMarcador(page, mes, marcador);
    await expect(linhas, mes).toHaveCount(1);
    await expect(linhas).toContainText(`(${indice + 1}/3)`);
  }
});
