// @integracao: Supabase local; o usuário A lança pela folha e confere T02 e T04 reais.
import { expect, test } from '@playwright/test';
import { excluirLancamentosLocais, registrarLancamentosCriados } from '../apoio/limpeza-local';
import { semViolacoesGraves } from '../apoio/acessibilidade';
import { lancarPelaFolha } from './apoio/lancar';
import { linhasComMarcador, meuIndividual } from './apoio/leitura';
import { novoMarcador } from './apoio/marcador';
import { mesAtual, mesDaPrimeiraParcela, somarMeses } from './apoio/meses';
import { ambienteIntegracao, emailDe, entrarComo } from './apoio/sessao';

test.describe.configure({ mode: 'serial' });
test.use({ viewport: { width: 390, height: 844 } });

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
  await expect(page.getByRole('status').getByText(/^Lançado em 3x · Lazer pessoal/)).toBeVisible();
  const primeiro = await mesDaPrimeiraParcela(page);
  for (const [indice, mes] of [primeiro, somarMeses(primeiro, 1), somarMeses(primeiro, 2)].entries()) {
    const linhas = await linhasComMarcador(page, mes, marcador);
    await expect(linhas, mes).toHaveCount(1);
    await expect(linhas).toContainText(`(${indice + 1}/3)`);
  }
});
