// @integracao: Supabase local, dois membros. B edita valor e descrição de uma conjunta de A e a
// exclui; A vê o resultado (RN-04, RN-06).
import { expect, test } from '@playwright/test';
import { semViolacoesGraves } from '../apoio/acessibilidade';
import { excluirLancamentosLocais, registrarLancamentosCriados } from '../apoio/limpeza-local';
import { abrirSessoes, lancarCompra, MENSAGEM_NAO_EXISTE, type Compra, type Sessoes } from './apoio/casal';
import { linhasComMarcador } from './apoio/leitura';
import { novoMarcador } from './apoio/marcador';
import { ambienteIntegracao, emailDe } from './apoio/sessao';

test.describe.configure({ mode: 'serial' });

let sessoes: Sessoes;
let criados: string[] = [];
let conjunta: Compra;
let aExcluir: Compra;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  sessoes = await abrirSessoes(browser);
  criados = registrarLancamentosCriados(sessoes.a);
  conjunta = await lancarCompra(sessoes.a, criados, {
    valorCentavos: 30000,
    categoria: 'Mercado',
    forma: 'Cartão de crédito XP',
    parcelas: 3,
    descricao: novoMarcador('e2e-conj'),
  });
  aExcluir = await lancarCompra(sessoes.a, criados, { valorCentavos: 4321, categoria: 'Mercado', forma: 'Pix Nubank', descricao: novoMarcador('e2e-excl') });
});

test.afterAll(async () => {
  const { senha } = ambienteIntegracao();
  await excluirLancamentosLocais(
    criados.filter((id) => id !== aExcluir?.id),
    emailDe('A'),
    senha,
  );
  await sessoes.fechar();
});

test('@integracao B edita valor e descrição da conjunta de A, sem forma nem parcelas', async () => {
  const { a, b } = sessoes;
  await b.goto(`/lancamentos/${conjunta.id}`);
  await expect(b.getByLabel('Descrição', { exact: true })).toHaveValue(conjunta.marcador);
  await expect(b.getByRole('button', { name: /^Forma de pagamento/ })).toHaveCount(0);
  await expect(b.getByRole('combobox', { name: 'Parcelas' })).toHaveCount(0);
  await expect(b.getByLabel('Data da compra')).toHaveCount(0);
  await expect(b.getByRole('button', { name: /Alterar data/ })).toHaveCount(0);
  await semViolacoesGraves(b);

  const novaDescricao = `${conjunta.marcador}-ed`;
  const valor = b.getByLabel('Valor total da compra');
  await valor.click();
  await valor.press('Control+A');
  await b.keyboard.type('45000');
  await b.getByLabel('Descrição', { exact: true }).fill(novaDescricao);
  await b.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(b.getByRole('status').getByText('Alterações salvas')).toBeVisible();

  await a.goto(`/lancamentos/${conjunta.id}`);
  await expect(a.getByLabel('Descrição', { exact: true })).toHaveValue(novaDescricao);
  await expect(a.getByLabel('Valor total da compra')).toHaveValue(/450,00/);
  await expect(a.getByText(/Alterado por último por Ana/)).toBeVisible();
  await semViolacoesGraves(a);
});

test('@integracao B exclui uma conjunta de A com o diálogo; ela some para A', async () => {
  const { a, b } = sessoes;
  await b.goto(`/lancamentos/${aExcluir.id}`);
  await b.getByRole('button', { name: 'Excluir', exact: true }).click();
  const dialogo = b.getByRole('alertdialog').or(b.getByRole('dialog', { name: /^Excluir esta compra/ }));
  await expect(dialogo).toBeVisible();
  await dialogo.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(b.getByRole('status').getByText('Excluído')).toBeVisible();

  await expect(await linhasComMarcador(a, aExcluir.meses[0], aExcluir.marcador)).toHaveCount(0);
  await a.goto(`/lancamentos/${aExcluir.id}`);
  await expect(a.getByText(MENSAGEM_NAO_EXISTE)).toBeVisible();
});
