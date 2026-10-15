// @integracao: fila de envio contra o Supabase local; o usuário A lança sem rede e com a resposta perdida.
import { expect, test } from '@playwright/test';
import { excluirLancamentosLocais, registrarLancamentosCriados } from '../apoio/limpeza-local';
import { semViolacoesGraves } from '../apoio/acessibilidade';
import { fecharFolhaLancar, lancarPelaFolha } from './apoio/lancar';
import { linhasComMarcador, quantidadeNaLista } from './apoio/leitura';
import { novoMarcador } from './apoio/marcador';
import { ambienteIntegracao, emailDe, entrarComo } from './apoio/sessao';

test.describe.configure({ mode: 'serial' });
test.use({ viewport: { width: 390, height: 844 } });

const hoje = new Date();
const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

let criados: string[] = [];
test.afterEach(async () => {
  const { senha } = ambienteIntegracao();
  await excluirLancamentosLocais(criados, emailDe('A'), senha);
  criados = [];
});

test('@integracao modo avião: guardado no aparelho, rede volta e o item é enviado', async ({ page, context }) => {
  const marcador = novoMarcador('aviao');
  criados = registrarLancamentosCriados(page);
  await entrarComo(page, 'A');
  await page.goto('/');
  await expect(page.getByText('Eu · Leandro')).toBeVisible();

  await context.setOffline(true);
  await lancarPelaFolha(page, { valorCentavos: 4200, categoria: 'Lazer pessoal', forma: 'Pix Nubank', descricao: marcador });
  await expect(page.getByRole('status').getByText(/^Guardado no aparelho/)).toBeVisible();
  await fecharFolhaLancar(page);
  await expect(page.getByText(/^1 lançamento aguardando envio/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Envios pendentes: 1' })).toBeVisible();
  await semViolacoesGraves(page);

  await context.setOffline(false);
  await expect(page.getByRole('status').getByText(/^Enviado: R\$ 42,00 · Lazer pessoal/)).toBeVisible();
  await expect(page.getByText(/aguardando envio/)).toHaveCount(0);
  await expect(await linhasComMarcador(page, mesAtual, marcador)).toHaveCount(1);
});

test('@integracao resposta perdida depois de gravar: Tentar agora não duplica', async ({ page }) => {
  const marcador = novoMarcador('perdida');
  criados = registrarLancamentosCriados(page);
  await entrarComo(page, 'A');
  await page.goto('/');
  await expect(page.getByText('Eu · Leandro')).toBeVisible();
  await linhasComMarcador(page, mesAtual, marcador);
  const antes = await quantidadeNaLista(page);
  await page.goto('/');

  // O pedido chega ao banco, mas a página nunca recebe a resposta.
  await page.route('**/rest/v1/rpc/lancar_despesa*', async (rota) => {
    await rota.fetch();
    await rota.abort('failed');
  });
  await lancarPelaFolha(page, { valorCentavos: 1999, categoria: 'Lazer pessoal', forma: 'Pix Nubank', descricao: marcador });
  await expect(page.getByRole('status').getByText(/^Guardado no aparelho/)).toBeVisible();
  await fecharFolhaLancar(page);
  await expect(page.getByText(/^1 lançamento aguardando envio/)).toBeVisible();

  await page.unroute('**/rest/v1/rpc/lancar_despesa*');
  await page.getByRole('link', { name: 'Ver', exact: true }).click();
  const envios = page.getByRole('dialog', { name: 'Envios pendentes' });
  await envios.getByRole('button', { name: 'Tentar agora' }).click();
  await expect(page.getByText(/aguardando envio/)).toHaveCount(0);

  const linhas = await linhasComMarcador(page, mesAtual, marcador);
  await expect(linhas).toHaveCount(1);
  await expect.poll(() => quantidadeNaLista(page)).toBe(antes + 1);
  await semViolacoesGraves(page);
});
