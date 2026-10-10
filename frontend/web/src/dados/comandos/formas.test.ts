import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { arquivarForma, definirPreferida, excluirForma, salvarForma } from './formas';

const { fetchSimulado } = vi.hoisted(() => ({ fetchSimulado: vi.fn<typeof fetch>() }));

vi.mock('../cliente', async (importOriginal) => {
  const original = await importOriginal<typeof import('../cliente')>();
  const cliente = original.criarCliente({
    url: 'https://teste.supabase.co',
    chave: 'chave-anon-de-teste',
    fetch: (...args: Parameters<typeof fetch>) => fetchSimulado(...args),
  });
  return { ...original, obterCliente: () => cliente };
});

const lerResposta = (nome: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../../.md/mockup/respostas/${nome}`, import.meta.url), 'utf8'));

const responder = (status: number, corpo: unknown) => () =>
  Promise.resolve(
    new Response(corpo === undefined ? null : JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

function requisicoesRest() {
  return fetchSimulado.mock.calls
    .map(([entrada, init]) => ({
      url: new URL(String(entrada)),
      metodo: (init?.method ?? 'GET').toUpperCase(),
      cabecalhos: new Headers(init?.headers),
      corpo: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined,
    }))
    .filter((r) => r.url.pathname.startsWith('/rest/v1/'));
}

const ID_FORMA = '00000000-0000-4000-8000-000000000303';
const ID_CONTA = '00000000-0000-4000-8000-000000000202';

const argsCredito = {
  p_id: ID_FORMA,
  p_nome: 'Cartão de crédito XP',
  p_tipo: 'credito' as const,
  p_conta_id: ID_CONTA,
  p_dia_vencimento: 10,
};

beforeEach(() => {
  fetchSimulado.mockReset();
});

describe('salvarForma', () => {
  it('faz POST em rpc/salvar_forma com os parâmetros p_*', async () => {
    fetchSimulado.mockImplementation(responder(200, ID_FORMA));

    await salvarForma(argsCredito);

    const [req] = requisicoesRest();
    expect(req.metodo).toBe('POST');
    expect(req.url.pathname).toBe('/rest/v1/rpc/salvar_forma');
    expect(req.cabecalhos.get('Content-Profile')).toBe('api');
    expect(req.corpo).toEqual(argsCredito);
  });

  it('crédito sem conta de pagamento envia p_conta_id nulo', async () => {
    fetchSimulado.mockImplementation(responder(200, ID_FORMA));

    await salvarForma({ ...argsCredito, p_conta_id: null });

    expect(requisicoesRest()[0].corpo?.p_conta_id).toBeNull();
  });

  it('erro de regra vira { tipo: regra, codigo }', async () => {
    fetchSimulado.mockImplementation(responder(400, lerResposta('erro-registro-invalido.json')));
    await expect(salvarForma(argsCredito)).rejects.toEqual({ tipo: 'regra', codigo: 'registro_invalido' });
  });

  it('falha de rede vira rede', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(salvarForma(argsCredito)).rejects.toEqual({ tipo: 'rede' });
  });
});

describe('definirPreferida', () => {
  it('liga com p_preferida true', async () => {
    fetchSimulado.mockImplementation(responder(204, undefined));

    await definirPreferida(ID_FORMA, true);

    const [req] = requisicoesRest();
    expect(req.metodo).toBe('POST');
    expect(req.url.pathname).toBe('/rest/v1/rpc/definir_preferida');
    expect(req.corpo).toEqual({ p_id: ID_FORMA, p_preferida: true });
  });

  it('desliga com p_preferida false', async () => {
    fetchSimulado.mockImplementation(responder(204, undefined));

    await definirPreferida(ID_FORMA, false);

    expect(requisicoesRest()[0].corpo).toEqual({ p_id: ID_FORMA, p_preferida: false });
  });

  it('registro inválido vira regra registro_invalido', async () => {
    fetchSimulado.mockImplementation(responder(400, lerResposta('erro-registro-invalido.json')));
    await expect(definirPreferida(ID_FORMA, true)).rejects.toEqual({
      tipo: 'regra',
      codigo: 'registro_invalido',
    });
  });
});

describe('arquivarForma', () => {
  it('faz POST em rpc/arquivar_forma com p_id', async () => {
    fetchSimulado.mockImplementation(responder(204, undefined));

    await arquivarForma(ID_FORMA);

    const [req] = requisicoesRest();
    expect(req.url.pathname).toBe('/rest/v1/rpc/arquivar_forma');
    expect(req.corpo).toEqual({ p_id: ID_FORMA });
  });
});

describe('excluirForma', () => {
  it('faz POST em rpc/excluir_forma com p_id', async () => {
    fetchSimulado.mockImplementation(responder(204, undefined));

    await excluirForma(ID_FORMA);

    const [req] = requisicoesRest();
    expect(req.url.pathname).toBe('/rest/v1/rpc/excluir_forma');
    expect(req.corpo).toEqual({ p_id: ID_FORMA });
  });

  it('forma com lançamento devolve o código em_uso', async () => {
    fetchSimulado.mockImplementation(responder(400, { code: 'P0001', message: 'em_uso', details: null, hint: null }));
    await expect(excluirForma(ID_FORMA)).rejects.toEqual({ tipo: 'regra', codigo: 'em_uso' });
  });

  it('falha de rede vira rede', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(excluirForma(ID_FORMA)).rejects.toEqual({ tipo: 'rede' });
  });
});

describe('escrita só por rpc', () => {
  it('nenhum comando usa PATCH, PUT, DELETE ou POST fora de /rpc/', async () => {
    fetchSimulado.mockImplementation(responder(200, null));

    await salvarForma(argsCredito);
    await definirPreferida(ID_FORMA, true);
    await arquivarForma(ID_FORMA);
    await excluirForma(ID_FORMA);

    for (const req of requisicoesRest()) {
      expect(req.metodo).toBe('POST');
      expect(req.url.pathname.startsWith('/rest/v1/rpc/')).toBe(true);
    }
  });
});
