// @integracao: Supabase local, dois membros ao mesmo tempo. A lança pela folha; B não pode ver o
// que é individual de A, nem forma, conta ou data da compra de uma conjunta de A (RNF-04, G-04, G-05).
import { expect, test } from '@playwright/test';
import { semViolacoesGraves } from '../apoio/acessibilidade';
import { excluirLancamentosLocais, registrarLancamentosCriados } from '../apoio/limpeza-local';
import {
  abrirSessoes,
  IDS_FORMAS_E_CONTAS_DE_A,
  lancarCompra,
  MENSAGEM_NAO_EXISTE,
  NOMES_FORMAS_E_CONTAS_DE_A,
  type ColetorRest,
  type Compra,
  type Sessoes,
} from './apoio/casal';
import { linhasComMarcador, somaDasLinhas, valorDaT02 } from './apoio/leitura';
import { novoMarcador } from './apoio/marcador';
import { mesAtual, somarMeses } from './apoio/meses';
import { ambienteIntegracao, emailDe } from './apoio/sessao';

test.describe.configure({ mode: 'serial' });

const VALOR_INDIVIDUAL = 98765;
const marcadorInd = novoMarcador('e2e-ind');
let sessoes: Sessoes;
let coletor: ColetorRest;
let criados: string[] = [];
let individual: Compra;
let conjunta: Compra;
let avista: Compra;
const antes = new Map<string, { casa: number; individualDeB: number }>();
const conjuntas = () => [conjunta, avista];
const meses = () => [...new Set(conjuntas().flatMap((c) => c.meses))];

test.beforeAll(async ({ browser }) => {
  sessoes = await abrirSessoes(browser);
  coletor = sessoes.coletorB;
  criados = registrarLancamentosCriados(sessoes.a);
});

test.afterAll(async () => {
  const { senha } = ambienteIntegracao();
  await excluirLancamentosLocais(criados, emailDe('A'), senha);
  await sessoes.fechar();
});

test('@integracao A lança um individual e duas conjuntas; B guarda os totais de antes', async () => {
  test.setTimeout(120_000);
  const candidatos = [mesAtual, ...[1, 2, 3].map((n) => somarMeses(mesAtual, n))];
  for (const mes of candidatos) {
    antes.set(mes, {
      casa: await valorDaT02(sessoes.b, mes, 'Variáveis da casa'),
      individualDeB: await valorDaT02(sessoes.b, mes, 'Meu individual'),
    });
  }

  const m = { conj: novoMarcador('e2e-conj'), excl: novoMarcador('e2e-excl') };
  individual = await lancarCompra(sessoes.a, criados, {
    valorCentavos: VALOR_INDIVIDUAL,
    categoria: 'Lazer pessoal',
    forma: 'Débito Itaú',
    descricao: marcadorInd,
  });
  conjunta = await lancarCompra(sessoes.a, criados, {
    valorCentavos: 30000,
    categoria: 'Mercado',
    forma: 'Cartão de crédito XP',
    parcelas: 3,
    descricao: m.conj,
  });
  avista = await lancarCompra(sessoes.a, criados, { valorCentavos: 4321, categoria: 'Mercado', forma: 'Pix Nubank', descricao: m.excl });
  expect(criados).toHaveLength(3);
  for (const mes of meses()) expect(antes.has(mes), mes).toBe(true);
});

test('@integracao T02 de B: a casa sobe pelas conjuntas e nada do individual de A aparece', async () => {
  const b = sessoes.b;
  for (const mes of meses()) {
    const doMes = conjuntas().filter((c) => c.meses.includes(mes));
    let esperado = 0;
    for (const c of doMes) esperado += await somaDasLinhas(await linhasComMarcador(b, mes, c.marcador));

    await expect.poll(() => valorDaT02(b, mes, 'Variáveis da casa'), mes).toBe(antes.get(mes)!.casa + esperado);
    expect(await valorDaT02(b, mes, 'Meu individual'), mes).toBe(antes.get(mes)!.individualDeB);
    await expect(b.getByText(marcadorInd)).toHaveCount(0);
    await expect(b.getByText('987,65')).toHaveCount(0);
  }
  await semViolacoesGraves(b);
});

test('@integracao T04 de B: as conjuntas "Pago por Leandro" aparecem e o individual de A não', async () => {
  const b = sessoes.b;
  for (const mes of meses()) {
    for (const c of conjuntas().filter((x) => x.meses.includes(mes))) {
      const linhas = await linhasComMarcador(b, mes, c.marcador);
      await expect(linhas, `${c.marcador} em ${mes}`).toHaveCount(1);
      await expect(linhas).toHaveAccessibleName(/pago por Leandro/);
    }
    await expect(await linhasComMarcador(b, mes, marcadorInd), mes).toHaveCount(0);
    await expect(b.getByText('987,65')).toHaveCount(0);
  }

  // Com os filtros: "Eu" e uma categoria individual de B não trazem o individual de A.
  await linhasComMarcador(b, individual.meses[0], marcadorInd);
  await b.getByRole('button', { name: 'Eu', exact: true }).click();
  await expect(b.getByRole('button', { name: 'Eu', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(b.getByRole('link', { name: new RegExp(marcadorInd) })).toHaveCount(0);
  await b.getByRole('group', { name: 'Filtros' }).getByRole('button', { name: 'Limpar filtros' }).click();
  await b.getByRole('button', { name: /^Categoria:/ }).click();
  await b.getByRole('radio', { name: /^Lazer pessoal/ }).locator('xpath=ancestor::label').click();
  await expect(b.getByRole('button', { name: /^Categoria: Lazer pessoal/ })).toBeVisible();
  await expect(b.getByRole('link', { name: new RegExp(marcadorInd) })).toHaveCount(0);
  await semViolacoesGraves(b);
});

test('@integracao T05 de B: só descrição, categoria, valor, parcela e quem pagou; individual de A não existe', async () => {
  const b = sessoes.b;
  await b.goto(`/lancamentos/${conjunta.id}`);
  await expect(b.getByLabel('Descrição', { exact: true })).toHaveValue(conjunta.marcador);
  await expect(b.getByLabel('Valor total da compra')).toHaveValue(/30\.000|300,00/);
  await expect(b.getByLabel('Categoria', { exact: true })).toBeVisible();
  await expect(b.getByText(/parcela \d de 3/)).toBeVisible();
  await expect(b.getByText(/Pago por Leandro/)).toBeVisible();
  await expect(b.getByRole('region', { name: 'Parcelas' })).toContainText('1/3');

  // Nada de forma, conta, data da compra nem parcelas editáveis; nem como "—" (R-UX-05).
  await expect(b.getByLabel('Data da compra')).toHaveCount(0);
  await expect(b.getByRole('combobox', { name: 'Parcelas' })).toHaveCount(0);
  await expect(b.getByRole('button', { name: /^Forma de pagamento/ })).toHaveCount(0);
  await expect(b.getByRole('button', { name: /Alterar data/ })).toHaveCount(0);
  for (const nome of NOMES_FORMAS_E_CONTAS_DE_A) await expect(b.getByText(nome)).toHaveCount(0);
  await expect(b.getByText('—')).toHaveCount(0);
  await semViolacoesGraves(b);

  await b.goto(`/lancamentos/${individual.id}`);
  await expect(b.getByText(MENSAGEM_NAO_EXISTE)).toBeVisible();
  await expect(b.getByText(marcadorInd)).toHaveCount(0);
});

test('@integracao respostas de rede de B: nenhum corpo traz o individual, formas ou contas de A', async () => {
  expect(coletor.quantidade()).toBeGreaterThan(0);
  const proibidos = [marcadorInd, '98765', ...NOMES_FORMAS_E_CONTAS_DE_A, ...IDS_FORMAS_E_CONTAS_DE_A, individual.id];
  expect(await coletor.encontrar(proibidos)).toEqual([]);
});
