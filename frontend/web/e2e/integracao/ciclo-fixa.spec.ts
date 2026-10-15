// @integracao: Supabase local, dois membros. A cria uma despesa fixa, paga no Crédito e desfaz; B só
// vê "Paga por" (RN-04, RN-06, RN-15, R-UX-12, I-20). Sem relógio no banco: o estado "atrasada" vem de
// um vencimento anterior a hoje no mês corrente e o "pendente" do mesmo modelo no mês seguinte.
import { expect, test } from '@playwright/test';
import { semViolacoesGraves } from '../apoio/acessibilidade';
import { abrirSessoes, IDS_FORMAS_E_CONTAS_DE_A, NOMES_FORMAS_E_CONTAS_DE_A, type Sessoes } from './apoio/casal';
import { coletarRespostas, type ColetorRede } from './apoio/coletorRede';
import {
  criarModeloFixa,
  desfazerPagamento,
  encerrarModeloFixa,
  fixasAPagarNaT02,
  hojeSaoPaulo,
  ocorrenciaDoMes,
  pagarOcorrencia,
  totaisDoCartao,
  totalDoCasal,
} from './apoio/fixas';
import { novoMarcador } from './apoio/marcador';
import { somarMeses } from './apoio/meses';

test.describe.configure({ mode: 'serial' });

const VALOR = 32147;
const FORMA = 'Cartão de crédito XP';
const ID_FORMA = '00000000-0000-4000-8000-000000000303';
const DIA_VENCIMENTO_CARTAO = 10;

const hoje = hojeSaoPaulo();
const mes = hoje.mes;
const mesSeguinte = somarMeses(mes, 1);
// No dia 1 não existe dia anterior para vencer: o modelo vence hoje e a ocorrência fica pendente.
const diaDoModelo = hoje.dia > 1 ? hoje.dia - 1 : 1;
const seloInicial = hoje.dia > 1 ? 'Atrasada' : 'Pendente';
const vencimento = `${mes}-${String(diaDoModelo).padStart(2, '0')}`;
// No dia do vencimento do cartão o pagamento é da véspera, para fugir da borda do "depois de".
const diaDoPagamento = hoje.dia === DIA_VENCIMENTO_CARTAO ? hoje.dia - 1 : hoje.dia;
const dataDoPagamento = `${mes}-${String(diaDoPagamento).padStart(2, '0')}`;
// ADR-005 §5 e CA-12.2a: a despesa fixa paga no Crédito entra no cartão no próximo vencimento depois da
// data do pagamento; antes do dia 10 é o vencimento deste mês ("Neste mês"), senão o do mês seguinte.
const entraNesteMesNoCartao = diaDoPagamento < DIA_VENCIMENTO_CARTAO;

const marcador = novoMarcador('e2e-fixa');
let sessoes: Sessoes;
let coletorB: ColetorRede;
let modeloCriado = false;

/** Objetos da resposta que têm algum campo (qualquer chave) igual a um dos valores dados. */
function objetosComValor(no: unknown, valores: ReadonlySet<string>): Record<string, unknown>[] {
  if (Array.isArray(no)) return no.flatMap((n) => objetosComValor(n, valores));
  if (no === null || typeof no !== 'object') return [];
  const objeto = no as Record<string, unknown>;
  const filhos = Object.values(objeto);
  const proprio = filhos.some((v) => typeof v === 'string' && valores.has(v)) ? [objeto] : [];
  return [...proprio, ...filhos.flatMap((v) => objetosComValor(v, valores))];
}

/** Corpos JSON das respostas (ignora as vazias). */
function corposJson(respostas: { corpo: string }[]): unknown[] {
  return respostas.filter(({ corpo }) => corpo.trim() !== '').map(({ corpo }) => JSON.parse(corpo) as unknown);
}

const antes = { casa: 0, casaSeguinte: 0, aPagar: 0, cartao: { nesteMes: 0, proximosMeses: 0 } };

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  sessoes = await abrirSessoes(browser);
  coletorB = coletarRespostas(sessoes.b);
});

test.afterAll(async () => {
  test.setTimeout(60_000);
  if (modeloCriado) await encerrarModeloFixa(sessoes.a, marcador).catch(() => undefined);
  await sessoes.fechar();
});

test('@integracao A cria o modelo; a ocorrência aparece na T06, na T02 e no mês seguinte', async () => {
  const { a } = sessoes;
  antes.casa = await totalDoCasal(a, mes);
  antes.casaSeguinte = await totalDoCasal(a, mesSeguinte);
  antes.aPagar = await fixasAPagarNaT02(a, mes);
  antes.cartao = await totaisDoCartao(a, ID_FORMA, FORMA);

  await criarModeloFixa(a, { descricao: marcador, categoria: 'Contas da casa', valorCentavos: VALOR, dia: diaDoModelo });
  modeloCriado = true;

  const linha = await ocorrenciaDoMes(a, mes, marcador);
  await expect(linha).toHaveCount(1);
  await expect(linha).toContainText('321,47');
  if (hoje.dia === 1) {
    test.info().annotations.push({ type: 'atrasada', description: 'dia 1: não existe vencimento anterior a hoje' });
  } else {
    await expect(linha).toContainText('Atrasada');
    await expect(linha).toContainText('venceu');
  }
  await expect(linha).toContainText(seloInicial);
  await expect(await ocorrenciaDoMes(a, mesSeguinte, marcador)).toContainText('Pendente');

  expect(await fixasAPagarNaT02(a, mes)).toBe(antes.aPagar + 1);
  expect(await fixasAPagarNaT02(a, mesSeguinte)).toBeGreaterThan(0);
  expect(await totalDoCasal(a, mes), 'fixa pendente não entra no total').toBe(antes.casa);
});

test('@integracao A paga no Crédito: casa na competência da ocorrência, cartão no próximo vencimento', async () => {
  const { a } = sessoes;
  await pagarOcorrencia(a, mes, marcador, FORMA, dataDoPagamento);
  await semViolacoesGraves(a);

  const linha = await ocorrenciaDoMes(a, mes, marcador);
  await expect(linha).toContainText('Paga por você');
  await expect(a.getByRole('button', { name: `Desfazer pagamento: ${marcador}` })).toBeVisible();

  // Competência = mês da ocorrência (RN-15); a do cartão não muda o total do casal do outro mês.
  expect(await totalDoCasal(a, mes)).toBe(antes.casa + VALOR);
  expect(await totalDoCasal(a, mesSeguinte)).toBe(antes.casaSeguinte);
  expect(await fixasAPagarNaT02(a, mes)).toBe(antes.aPagar);

  const depois = await totaisDoCartao(a, ID_FORMA, FORMA);
  expect(depois).toEqual({
    nesteMes: antes.cartao.nesteMes + (entraNesteMesNoCartao ? VALOR : 0),
    proximosMeses: antes.cartao.proximosMeses + (entraNesteMesNoCartao ? 0 : VALOR),
  });
});

test('@integracao B vê "Paga por Leandro", sem Desfazer e sem forma, conta nem data de A', async () => {
  const { b } = sessoes;
  const linha = await ocorrenciaDoMes(b, mes, marcador);
  await expect(linha).toHaveCount(1);
  await expect(linha).toContainText('Paga por Leandro');
  await expect(linha).toContainText('321,47');
  await expect(linha).toContainText(/vence \d{2}\/\d{2}/);
  await expect(linha.getByRole('button', { name: /Desfazer pagamento/ })).toHaveCount(0);
  await expect(b.getByRole('button', { name: `Desfazer pagamento: ${marcador}` })).toHaveCount(0);
  await expect(b.getByRole('link', { name: `Marcar como paga: ${marcador}` })).toHaveCount(0);
  await expect(b.getByText(FORMA)).toHaveCount(0);
  await semViolacoesGraves(b);

  await totalDoCasal(b, mes);
  // Forma e id valem para qualquer resposta de B. A data do pagamento aparece em outros campos legítimos
  // (ex.: "hoje" do contexto), então só vale dentro do que B recebeu sobre esta ocorrência.
  expect(await coletorB.vazamentos([...NOMES_FORMAS_E_CONTAS_DE_A, ...IDS_FORMAS_E_CONTAS_DE_A])).toEqual([]);
  const respostas = await coletorB.respostas();
  const corpos = corposJson(respostas);
  const porMarcador = corpos.flatMap((c) => objetosComValor(c, new Set([marcador])));
  expect(porMarcador.length, 'B recebeu a ocorrência').toBeGreaterThan(0);
  // A data pode vir em outra estrutura (ex.: pagamento ligado por id): vale todo objeto que cita o
  // marcador ou o id da ocorrência, não só o que tem a `descricao`.
  const referencias = new Set([marcador, ...porMarcador.flatMap((o) => (typeof o.id === 'string' ? [o.id] : []))]);
  const daOcorrencia = corpos.flatMap((c) => objetosComValor(c, referencias)).map((o) => JSON.stringify(o));
  for (const item of daOcorrencia) {
    if (dataDoPagamento !== vencimento) expect(item).not.toContain(dataDoPagamento);
  }
});

test('@integracao A desfaz: a ocorrência, o total da casa e o cartão voltam aos de antes', async () => {
  const { a } = sessoes;
  await desfazerPagamento(a, mes, marcador);

  const linha = await ocorrenciaDoMes(a, mes, marcador);
  await expect(linha).toContainText(seloInicial);
  await expect(linha).not.toContainText('Paga por');
  await expect(a.getByRole('link', { name: `Marcar como paga: ${marcador}` })).toBeVisible();

  expect(await totalDoCasal(a, mes)).toBe(antes.casa);
  expect(await totalDoCasal(a, mesSeguinte)).toBe(antes.casaSeguinte);
  expect(await totaisDoCartao(a, ID_FORMA, FORMA)).toEqual(antes.cartao);
  expect(await fixasAPagarNaT02(a, mes)).toBe(antes.aPagar + 1);
});
