import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchSimulado } = vi.hoisted(() => ({ fetchSimulado: vi.fn<typeof fetch>() }));

vi.mock('../cliente', async (importOriginal) => {
  const real = await importOriginal<typeof import('../cliente')>();
  let cliente: ReturnType<typeof real.criarCliente> | undefined;
  return {
    ...real,
    obterCliente: () =>
      (cliente ??= real.criarCliente({
        url: 'http://127.0.0.1:54321',
        chave: 'chave-falsa',
        fetch: (...args: Parameters<typeof fetch>) => fetchSimulado(...args),
      })),
  };
});

import { movimentarMeta, salvarMeta } from './metas';

function lerResposta(nome: string): unknown {
  return JSON.parse(readFileSync(new URL(`../../../../../.md/mockup/respostas/${nome}.json`, import.meta.url), 'utf8'));
}

function responder(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requisicao(indice = 0): { caminho: string; metodo: string; corpo: Record<string, unknown> } {
  const [entrada, init] = fetchSimulado.mock.calls[indice];
  const url = new URL(entrada instanceof Request ? entrada.url : String(entrada));
  const metodo = (entrada instanceof Request ? entrada.method : init?.method) ?? 'GET';
  const corpo = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
  return { caminho: url.pathname, metodo, corpo };
}

const ID_META = '00000000-0000-4000-8000-000000000902';
const ID_NOVA = '00000000-0000-4000-8000-0000000009a1';
const ID_MOVIMENTO = '00000000-0000-4000-8000-000000000ba1';
const ID_CONTA = '00000000-0000-4000-8000-000000000201';

beforeEach(() => {
  fetchSimulado.mockReset();
  fetchSimulado.mockImplementation(async (_entrada, init) => {
    const corpo = JSON.parse(String(init?.body ?? '{}')) as { p_id?: string };
    return responder(200, corpo.p_id ?? null);
  });
});

describe('salvarMeta', () => {
  it('na criação envia nome, alvo, prazo como data do mês e escopo', async () => {
    await salvarMeta({
      id: ID_NOVA,
      nome: 'Carro novo',
      alvoCentavos: 2000000,
      prazo: '2028-12',
      escopo: 'individual',
    });

    const { caminho, metodo, corpo } = requisicao();
    expect(metodo).toBe('POST');
    expect(caminho).toBe('/rest/v1/rpc/salvar_meta');
    expect(corpo).toEqual({
      p_id: ID_NOVA,
      p_nome: 'Carro novo',
      p_alvo_centavos: 2000000,
      p_prazo: '2028-12-01',
      p_escopo: 'individual',
    });
  });

  it('na edição não envia p_escopo', async () => {
    await salvarMeta({ id: ID_META, nome: 'Viagem Nordeste', alvoCentavos: 1200000, prazo: '2027-07' });

    const { corpo } = requisicao();
    expect(corpo).not.toHaveProperty('p_escopo');
    expect(corpo).toMatchObject({
      p_id: ID_META,
      p_nome: 'Viagem Nordeste',
      p_alvo_centavos: 1200000,
      p_prazo: '2027-07-01',
    });
  });

  it('sem prazo manda prazo nulo', async () => {
    await salvarMeta({ id: ID_META, nome: 'Reserva', alvoCentavos: 3000000, prazo: null });

    const { corpo } = requisicao();
    expect(corpo.p_prazo ?? null).toBeNull();
  });

  it('reenvio usa o mesmo id que recebeu', async () => {
    const dados = {
      id: ID_NOVA,
      nome: 'Carro novo',
      alvoCentavos: 2000000,
      prazo: null,
      escopo: 'individual' as const,
    };
    await salvarMeta(dados);
    await salvarMeta(dados);

    expect(requisicao(0).corpo.p_id).toBe(ID_NOVA);
    expect(requisicao(1).corpo.p_id).toBe(ID_NOVA);
  });

  it('traduz registro_invalido', async () => {
    fetchSimulado.mockResolvedValueOnce(responder(400, lerResposta('erro-registro-invalido')));

    await expect(salvarMeta({ id: ID_META, nome: 'X', alvoCentavos: 100, prazo: null })).rejects.toMatchObject({
      tipo: 'regra',
      codigo: 'registro_invalido',
    });
  });

  it('traduz falha de rede para rede', async () => {
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(salvarMeta({ id: ID_META, nome: 'X', alvoCentavos: 100, prazo: null })).rejects.toMatchObject({
      tipo: 'rede',
    });
  });
});

describe('movimentarMeta', () => {
  it('aporte com conta envia todos os p_* da RPC', async () => {
    await movimentarMeta({
      id: ID_MOVIMENTO,
      metaId: ID_META,
      tipo: 'aporte',
      valorCentavos: 50000,
      data: '2026-10-09',
      local: 'Caixinha Nubank',
      contaId: ID_CONTA,
    });

    const { caminho, metodo, corpo } = requisicao();
    expect(metodo).toBe('POST');
    expect(caminho).toBe('/rest/v1/rpc/movimentar_meta');
    expect(corpo).toEqual({
      p_id: ID_MOVIMENTO,
      p_meta_id: ID_META,
      p_tipo: 'aporte',
      p_valor_centavos: 50000,
      p_data: '2026-10-09',
      p_local: 'Caixinha Nubank',
      p_conta_id: ID_CONTA,
    });
  });

  it('sem conta não envia a chave p_conta_id', async () => {
    await movimentarMeta({
      id: ID_MOVIMENTO,
      metaId: ID_META,
      tipo: 'retirada',
      valorCentavos: 30000,
      data: '2026-10-09',
      local: 'CDB Banco Inter',
    });

    const { corpo } = requisicao();
    expect(corpo).not.toHaveProperty('p_conta_id');
    expect(corpo).toMatchObject({ p_tipo: 'retirada', p_local: 'CDB Banco Inter' });
  });

  it('duas tentativas do mesmo movimento levam o mesmo id', async () => {
    const dados = {
      id: ID_MOVIMENTO,
      metaId: ID_META,
      tipo: 'aporte' as const,
      valorCentavos: 50000,
      data: '2026-10-09',
      local: 'Caixinha Nubank',
    };
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(movimentarMeta(dados)).rejects.toMatchObject({ tipo: 'rede' });
    await movimentarMeta(dados);

    expect(requisicao(0).corpo.p_id).toBe(ID_MOVIMENTO);
    expect(requisicao(1).corpo.p_id).toBe(ID_MOVIMENTO);
  });

  it('retirada maior que o guardado no local vira o código de regra do contrato', async () => {
    fetchSimulado.mockResolvedValueOnce(
      responder(400, { code: 'P0001', message: 'retirada_maior_que_guardado', details: null, hint: null }),
    );

    await expect(
      movimentarMeta({
        id: ID_MOVIMENTO,
        metaId: ID_META,
        tipo: 'retirada',
        valorCentavos: 250000,
        data: '2026-10-09',
        local: 'CDB Banco Inter',
      }),
    ).rejects.toMatchObject({ tipo: 'regra', codigo: 'retirada_maior_que_guardado' });
  });

  it('traduz registro_invalido', async () => {
    fetchSimulado.mockResolvedValueOnce(responder(400, lerResposta('erro-registro-invalido')));

    await expect(
      movimentarMeta({
        id: ID_MOVIMENTO,
        metaId: ID_META,
        tipo: 'aporte',
        valorCentavos: 100,
        data: '2026-10-09',
        local: 'Cofre',
      }),
    ).rejects.toMatchObject({ tipo: 'regra', codigo: 'registro_invalido' });
  });
});
