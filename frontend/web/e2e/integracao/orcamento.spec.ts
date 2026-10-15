// @integracao: Supabase local; A e B em sessões separadas definem, editam, lançam e copiam o orçamento pela T09 real.
import { expect, test, type Page } from '@playwright/test';
import { semViolacoesGraves } from '../apoio/acessibilidade';
import { excluirLancamentosLocais, registrarLancamentosCriados } from '../apoio/limpeza-local';
import { coletarRespostas, type ColetorRede } from './apoio/coletorRede';
import { lancarPelaFolha, fecharFolhaLancar } from './apoio/lancar';
import { emCentavos } from './apoio/leitura';
import {
  abrirFolhaDeValor,
  abrirOrcamento,
  definirOrcamento,
  lerLinhas,
  linhaDe,
  mesCorrente,
  moeda,
  nomeDoMes,
  salvarValor,
  somarMeses,
} from './apoio/orcamento';
import { ambienteIntegracao, emailDe, entrarComo } from './apoio/sessao';

test.describe.configure({ mode: 'serial' });

// Centavos únicos por execução: o teste não depende de execuções anteriores nem dos seeds.
const ss = 1 + (Math.floor(Date.now() / 1000) % 59);
const VALOR_CASA_A = 123_400 + ss;
const VALOR_CASA_B = 143_400 + ss;
const VALOR_INDIVIDUAL_A = 77_700 + ss;
const MES = mesCorrente();

let paginaA: Page;
let paginaB: Page;
let coletorB: ColetorRede;
let lancamentosDeA: string[];
let categoriaIndividualDeA: string;

test.beforeAll(async ({ browser }, info) => {
  const opcoes = { viewport: { width: 390, height: 844 }, baseURL: info.project.use.baseURL };
  paginaA = await (await browser.newContext(opcoes)).newPage();
  paginaB = await (await browser.newContext(opcoes)).newPage();
  lancamentosDeA = registrarLancamentosCriados(paginaA);
  coletorB = coletarRespostas(paginaB);
  await entrarComo(paginaA, 'A');
  await entrarComo(paginaB, 'B');
});

test.afterAll(async () => {
  await excluirLancamentosLocais(lancamentosDeA, emailDe('A'), ambienteIntegracao().senha);
  await paginaA.context().close();
  await paginaB.context().close();
});

test('@integracao A define o orçamento da casa e um individual', async () => {
  await abrirOrcamento(paginaA, 'casa');
  await abrirFolhaDeValor(paginaA, 'Mercado');
  await semViolacoesGraves(paginaA);
  await salvarValor(paginaA, VALOR_CASA_A);
  await expect(paginaA.getByRole('link', { name: new RegExp(`^Editar orçamento de Mercado: R\\$ [\\d.,]+ de ${moeda(VALOR_CASA_A).replace('$', '\\$')},`) })).toBeVisible();

  await abrirOrcamento(paginaA, 'eu');
  categoriaIndividualDeA = await definirOrcamento(paginaA, 'Transporte', VALOR_INDIVIDUAL_A);
  expect(categoriaIndividualDeA).toMatch(/^[0-9a-f-]{36}$/);
  expect((await linhaDe(paginaA, 'Transporte')).orcado).toBe(moeda(VALOR_INDIVIDUAL_A));
});

test('@integracao B vê e edita o da casa; A vê o valor de B', async () => {
  await abrirOrcamento(paginaB, 'casa');
  expect((await linhaDe(paginaB, 'Mercado')).orcado).toBe(moeda(VALOR_CASA_A));
  await semViolacoesGraves(paginaB);

  await abrirFolhaDeValor(paginaB, 'Mercado');
  await expect(paginaB.getByLabel('Valor orçado')).toHaveValue(new RegExp(moeda(VALOR_CASA_A).slice(3)));
  await semViolacoesGraves(paginaB);
  await salvarValor(paginaB, VALOR_CASA_B);
  expect((await linhaDe(paginaB, 'Mercado')).orcado).toBe(moeda(VALOR_CASA_B));

  await abrirOrcamento(paginaA, 'casa');
  expect((await linhaDe(paginaA, 'Mercado')).orcado).toBe(moeda(VALOR_CASA_B));
});

test('@integracao B não vê nem recebe o orçamento individual de A', async () => {
  await abrirOrcamento(paginaB, 'eu');
  await expect(paginaB.locator(`a[href*="${categoriaIndividualDeA}"]`)).toHaveCount(0);
  expect((await lerLinhas(paginaB)).map((l) => l.categoriaId)).not.toContain(categoriaIndividualDeA);
  await semViolacoesGraves(paginaB);

  // A categoria de A não abre a folha para B: o parâmetro some.
  await paginaB.goto(`/orcamento?escopo=eu&editar=${categoriaIndividualDeA}`);
  await expect(paginaB.getByRole('main')).toHaveAttribute('aria-busy', 'false');
  await expect(paginaB.getByRole('dialog')).toHaveCount(0);
  await expect(paginaB).not.toHaveURL(/editar=/);

  expect(await coletorB.vazamentos([categoriaIndividualDeA, new RegExp(`(?<!\\d)${VALOR_INDIVIDUAL_A}(?!\\d)`)])).toEqual([]);
});

test('@integracao o lançamento muda o realizado e a situação', async () => {
  await abrirOrcamento(paginaA, 'casa');
  const antes = emCentavos((await linhaDe(paginaA, 'Mercado')).realizado);
  // Conta do teste sobre números lidos: o orçado fica R$ 50,00 acima do realizado, e o lançamento passa dele.
  await abrirFolhaDeValor(paginaA, 'Mercado');
  await salvarValor(paginaA, antes + 5000);
  expect((await linhaDe(paginaA, 'Mercado')).orcado).toBe(moeda(antes + 5000));

  await lancarPelaFolha(paginaA, { valorCentavos: 8000, categoria: 'Mercado' });
  await expect(paginaA.getByRole('status').getByText(/^Lançado: R\$ 80,00 · Mercado/)).toBeVisible();
  await fecharFolhaLancar(paginaA);

  await expect
    .poll(async () => {
      await abrirOrcamento(paginaA, 'casa');
      return emCentavos((await linhaDe(paginaA, 'Mercado')).realizado);
    })
    .toBe(antes + 8000);
  await expect(paginaA.getByRole('link', { name: /^Editar orçamento de Mercado:/ }).getByText('Estourado')).toBeVisible();
});

test('@integracao copiar do mês anterior no primeiro mês sem orçamento', async () => {
  let anterior = await (async () => {
    await abrirOrcamento(paginaA, 'casa', MES);
    return lerLinhas(paginaA);
  })();
  let mes = MES;
  const vazio = paginaA.getByRole('heading', { name: /^Sem orçamento da casa em / });
  for (let passo = 0; passo < 24; passo++) {
    mes = somarMeses(mes, 1);
    await abrirOrcamento(paginaA, 'casa', mes);
    if ((await vazio.count()) > 0) break;
    anterior = await lerLinhas(paginaA);
  }
  await expect(vazio).toHaveText(`Sem orçamento da casa em ${nomeDoMes(mes)}`);

  const copiar = paginaA.getByRole('button', { name: `Copiar de ${nomeDoMes(somarMeses(mes, -1))}` });
  await semViolacoesGraves(paginaA);
  await copiar.click();
  await expect(paginaA.getByRole('status').getByText(`Orçamento copiado de ${nomeDoMes(somarMeses(mes, -1))}`)).toBeVisible();
  await expect(copiar).toHaveCount(0);

  const copiado = await lerLinhas(paginaA);
  const orcadoPorNome = (linhas: typeof copiado) => linhas.map((l) => [l.nome, l.orcado]).sort();
  expect(orcadoPorNome(copiado)).toEqual(orcadoPorNome(anterior));
  expect(copiado.length).toBeGreaterThan(0);

  // No escopo Eu de B, o mês novo não traz nada de A.
  await abrirOrcamento(paginaB, 'eu', mes);
  const copiarB = paginaB.getByRole('button', { name: /^Copiar de / });
  if ((await copiarB.count()) > 0) {
    await copiarB.click();
    await expect(paginaB.getByRole('status').getByText(/^Orçamento copiado de /)).toBeVisible();
  }
  await expect(paginaB.locator(`a[href*="${categoriaIndividualDeA}"]`)).toHaveCount(0);
  expect(await coletorB.vazamentos([categoriaIndividualDeA, new RegExp(`(?<!\\d)${VALOR_INDIVIDUAL_A}(?!\\d)`)])).toEqual([]);
});

for (const quem of ['A', 'B'] as const) {
  test(`@integracao T02 de ${quem} mostra o mesmo resumo do orçamento da casa`, async () => {
    const pagina = quem === 'A' ? paginaA : paginaB;
    await abrirOrcamento(pagina, 'casa', MES);
    const total = pagina.getByRole('region', { name: /^Orçamento da casa/ });
    const textoTotal = (await total.getByText(/^R\$ [\d.,]+ de R\$ [\d.,]+$/).first().textContent()) ?? '';
    const percentualTotal = await total.getByRole('progressbar', { name: 'Orçamento da casa' }).getAttribute('aria-valuenow');
    const porCategoria = new Map((await lerLinhas(pagina)).map((l) => [l.nome, l.percentual]));

    await pagina.goto('/');
    const cartao = pagina.getByRole('article', { name: /^Orçamento da casa/ });
    await expect(cartao.getByText(textoTotal, { exact: true }).first()).toBeVisible();
    await expect(cartao.getByRole('progressbar', { name: 'Orçamento da casa' })).toHaveAttribute('aria-valuenow', percentualTotal!);
    const destaques = await cartao.getByRole('progressbar').evaluateAll((els) =>
      els.map((el) => [el.getAttribute('aria-label') ?? '', el.getAttribute('aria-valuenow') ?? '']),
    );
    const categorias = destaques.filter(([nome]) => nome !== 'Orçamento da casa');
    expect(categorias.length).toBeGreaterThan(0);
    for (const [nome, percentual] of categorias) expect(porCategoria.get(nome), nome).toBe(Number(percentual));
    await semViolacoesGraves(pagina);

    await cartao.getByRole('link', { name: 'Ver orçamento' }).click();
    await expect(pagina).toHaveURL(/\/orcamento\?.*escopo=(casa|conjunto)/);
    await expect(pagina.getByRole('heading', { level: 1 })).toContainText('Orçamento');
  });
}

test('@integracao o resumo de B não cita o orçamento individual de A', async () => {
  await paginaB.goto('/');
  const meu = paginaB.getByRole('article', { name: /^Meu orçamento/ });
  await expect(meu.or(paginaB.getByText('Sem orçamento no mês.'))).toBeVisible();
  await expect(paginaB.getByRole('main')).not.toContainText(moeda(VALOR_INDIVIDUAL_A));
  expect(await coletorB.vazamentos([categoriaIndividualDeA, new RegExp(`(?<!\\d)${VALOR_INDIVIDUAL_A}(?!\\d)`)])).toEqual([]);
});
