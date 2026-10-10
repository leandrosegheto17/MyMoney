import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { copiarOrcamento, definirOrcamento } from './orcamento';

const { fetchSimulado } = vi.hoisted(() => ({ fetchSimulado: vi.fn() }));

vi.mock('../cliente', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('../cliente')>();
  const cliente = real.criarCliente({
    url: 'http://127.0.0.1:54321',
    chave: 'chave-anon-de-teste',
    fetch: fetchSimulado,
  });
  return { ...real, obterCliente: () => cliente };
});

const RESPOSTAS = new URL('../../../../../.md/mockup/respostas/', import.meta.url);

function resposta(nome: string): unknown {
  return JSON.parse(readFileSync(new URL(`${nome}.json`, RESPOSTAS), 'utf8'));
}

function responderCom(corpo: unknown, status = 200) {
  fetchSimulado.mockImplementation(
    async () =>
      new Response(JSON.stringify(corpo), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
}

function chamadasRest() {
  return fetchSimulado.mock.calls
    .map(([entrada, init]: [RequestInfo | URL, RequestInit | undefined]) => {
      const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
      return {
        url: decodeURIComponent(url),
        metodo: (init?.method ?? 'GET').toUpperCase(),
        corpo: init?.body ? JSON.parse(String(init.body)) : undefined,
      };
    })
    .filter((chamada) => chamada.url.includes('/rest/v1/'));
}

const ID_CONTAS_DA_CASA = '00000000-0000-4000-8000-000000000404';

afterEach(() => {
  fetchSimulado.mockReset();
});

describe('definirOrcamento', () => {
  it('envia mês, categoria e valor para definir_orcamento', async () => {
    responderCom(null);

    await definirOrcamento({ mes: '2026-10', categoriaId: ID_CONTAS_DA_CASA, valorCentavos: 30000 });

    const [chamada] = chamadasRest();
    expect(chamada.metodo).toBe('POST');
    expect(chamada.url).toMatch(/\/rest\/v1\/rpc\/definir_orcamento$/);
    expect(chamada.corpo).toEqual({
      p_mes: '2026-10-01',
      p_categoria_id: ID_CONTAS_DA_CASA,
      p_valor_centavos: 30000,
    });
  });

  it('remover envia p_valor_centavos null com a chave presente', async () => {
    responderCom(null);

    await definirOrcamento({ mes: '2026-10', categoriaId: ID_CONTAS_DA_CASA, valorCentavos: null });

    const [chamada] = chamadasRest();
    expect(chamada.corpo).toHaveProperty('p_valor_centavos', null);
    expect(chamada.corpo).toEqual({
      p_mes: '2026-10-01',
      p_categoria_id: ID_CONTAS_DA_CASA,
      p_valor_centavos: null,
    });
  });

  it('nunca envia escopo nem dono (vêm da categoria no servidor)', async () => {
    responderCom(null);

    await definirOrcamento({ mes: '2026-10', categoriaId: ID_CONTAS_DA_CASA, valorCentavos: 30000 });

    expect(Object.keys(chamadasRest()[0].corpo).sort()).toEqual(['p_categoria_id', 'p_mes', 'p_valor_centavos']);
  });

  it('categoria que não é uuid vira registro_invalido sem requisição', async () => {
    await expect(definirOrcamento({ mes: '2026-10', categoriaId: 'abc', valorCentavos: 30000 })).rejects.toEqual({
      tipo: 'regra',
      codigo: 'registro_invalido',
    });
    expect(chamadasRest()).toHaveLength(0);
  });

  it('400 registro_invalido chega traduzido', async () => {
    responderCom(resposta('erro-registro-invalido'), 400);

    await expect(
      definirOrcamento({ mes: '2026-10', categoriaId: ID_CONTAS_DA_CASA, valorCentavos: 30000 }),
    ).rejects.toEqual({ tipo: 'regra', codigo: 'registro_invalido' });
  });

  it('valor_invalido chega traduzido', async () => {
    responderCom({ code: 'P0001', message: 'valor_invalido', details: null, hint: null }, 400);

    await expect(
      definirOrcamento({ mes: '2026-10', categoriaId: ID_CONTAS_DA_CASA, valorCentavos: 30000 }),
    ).rejects.toEqual({ tipo: 'regra', codigo: 'valor_invalido' });
  });

  it('falha do fetch vira rede', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      definirOrcamento({ mes: '2026-10', categoriaId: ID_CONTAS_DA_CASA, valorCentavos: 30000 }),
    ).rejects.toMatchObject({ tipo: 'rede' });
  });
});

describe('copiarOrcamento', () => {
  it('envia mês e escopo para copiar_orcamento e devolve o número de categorias copiadas', async () => {
    responderCom(5);

    const copiadas = await copiarOrcamento({ mes: '2026-11', escopo: 'conjunto' });

    expect(copiadas).toBe(5);
    const [chamada] = chamadasRest();
    expect(chamada.metodo).toBe('POST');
    expect(chamada.url).toMatch(/\/rest\/v1\/rpc\/copiar_orcamento$/);
    expect(chamada.corpo).toEqual({ p_mes: '2026-11-01', p_escopo: 'conjunto' });
  });

  it('erro chega traduzido', async () => {
    responderCom(resposta('erro-registro-invalido'), 400);

    await expect(copiarOrcamento({ mes: '2026-11', escopo: 'individual' })).rejects.toEqual({
      tipo: 'regra',
      codigo: 'registro_invalido',
    });
  });
});
