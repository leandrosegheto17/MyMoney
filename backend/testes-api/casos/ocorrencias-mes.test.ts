import { describe, expect, it } from 'vitest';
import exemplo from '../../../.md/mockup/respostas/ocorrencias-mes.json';
import vazio from '../../../.md/mockup/respostas/ocorrencias-mes-vazio.json';
import { esperarRegistroInvalido } from '../src/esperar';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

interface Item {
  id: string;
  situacao: string;
  pagador: { nome: string; sou_eu: boolean } | null;
  [chave: string]: unknown;
}
interface Resposta {
  mes: string;
  pagas: number;
  total: number;
  previsto_a_pagar_centavos: number;
  ocorrencias: Item[];
}

const mes = '2026-10-01';
const mesSemFixas = '2025-12-01';
const LUZ_PAGA_POR_ANA = '00000000-0000-4000-8000-000000000803';

async function ocorrencias(sessao: Awaited<ReturnType<typeof comoA>>, p_mes: string) {
  const { data, error } = await sessao.rpc('ocorrencias_mes', { p_mes });
  expect(error).toBeNull();
  return data as unknown as Resposta;
}

describe('api.ocorrencias_mes', () => {
  it('A recebe a lista no formato do exemplo, com item pago e item sem pagador', async () => {
    const resposta = await ocorrencias(await comoA(), mes);
    mesmaForma(resposta, exemplo);
    const pago = resposta.ocorrencias.find((o) => o.situacao === 'paga');
    const naoPago = resposta.ocorrencias.find((o) => o.situacao !== 'paga');
    expect(pago?.pagador).not.toBeNull();
    expect(naoPago?.pagador).toBeNull();
    mesmaForma(
      pago,
      exemplo.ocorrencias.find((o) => o.situacao === 'paga'),
    );
    mesmaForma(
      naoPago,
      exemplo.ocorrencias.find((o) => o.situacao !== 'paga'),
    );
    expect(resposta.total).toBe(resposta.ocorrencias.length);
    expect(resposta.pagas).toBe(resposta.ocorrencias.filter((o) => o.situacao === 'paga').length);
  });

  it('mês sem fixas ativas tem a forma do exemplo vazio', async () => {
    const resposta = await ocorrencias(await comoA(), mesSemFixas);
    mesmaForma(resposta, vazio);
    expect(resposta.ocorrencias).toEqual([]);
  });

  it('sou_eu é invertido entre A e B na mesma ocorrência', async () => {
    const deA = (await ocorrencias(await comoA(), mes)).ocorrencias.find((o) => o.id === LUZ_PAGA_POR_ANA);
    const deB = (await ocorrencias(await comoB(), mes)).ocorrencias.find((o) => o.id === LUZ_PAGA_POR_ANA);
    expect(deA?.pagador).toEqual({ nome: 'Ana', sou_eu: false });
    expect(deB?.pagador).toEqual({ nome: 'Ana', sou_eu: true });
  });

  it('B não recebe forma, conta nem data de pagamento da fixa paga por A', async () => {
    const resposta = await ocorrencias(await comoB(), mes);
    const primeiro = exemplo.ocorrencias[0];
    expect(primeiro).toBeDefined();
    const chavesDoExemplo = Object.keys(primeiro as object).sort();
    for (const item of resposta.ocorrencias) expect(Object.keys(item).sort()).toEqual(chavesDoExemplo);
    const texto = JSON.stringify(resposta);
    for (const proibido of ['forma', 'conta', 'data_operacao']) expect(texto).not.toContain(`"${proibido}`);
  });

  it('usuário sem membro recebe registro_invalido', async () => {
    await esperarRegistroInvalido((await comoSemMembro()).rpc('ocorrencias_mes', { p_mes: mesSemFixas }));
  });

  it('anon não executa', async () => {
    const { error } = await (await comoAnon()).rpc('ocorrencias_mes', { p_mes: mes });
    expect(error).not.toBeNull();
  });
});
