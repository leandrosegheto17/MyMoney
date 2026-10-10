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

import { buscarMovimentosMeta } from './movimentosMeta';

function lerResposta(nome: string): unknown {
  return JSON.parse(readFileSync(new URL(`../../../../../.md/mockup/respostas/${nome}.json`, import.meta.url), 'utf8'));
}

function responder(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requisicao(indice = 0): { url: URL; metodo: string; cabecalhos: Headers; corpo: unknown } {
  const [entrada, init] = fetchSimulado.mock.calls[indice];
  const url = new URL(entrada instanceof Request ? entrada.url : String(entrada));
  const cabecalhos = new Headers(entrada instanceof Request ? entrada.headers : init?.headers);
  const metodo = (entrada instanceof Request ? entrada.method : init?.method) ?? 'GET';
  const corpo = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
  return { url, metodo, cabecalhos, corpo };
}

const ID_VIAGEM = '00000000-0000-4000-8000-000000000902';

type Movimento = { autor: { sou_eu: boolean }; conta?: { nome: string } };

beforeEach(() => {
  fetchSimulado.mockReset();
});

describe('buscarMovimentosMeta', () => {
  it('chama a RPC movimentos_meta com o id da meta', async () => {
    fetchSimulado.mockResolvedValueOnce(responder(200, lerResposta('movimentos-meta')));

    await buscarMovimentosMeta(ID_VIAGEM);

    const { url, metodo, cabecalhos, corpo } = requisicao();
    expect(metodo).toBe('POST');
    expect(url.pathname).toBe('/rest/v1/rpc/movimentos_meta');
    expect(cabecalhos.get('Content-Profile')).toBe('api');
    expect(corpo).toEqual({ p_meta_id: ID_VIAGEM });
  });

  it('devolve a lista intacta, na ordem da API, com a conta só nas linhas do autor', async () => {
    const movimentos = lerResposta('movimentos-meta') as Movimento[];
    fetchSimulado.mockResolvedValueOnce(responder(200, movimentos));

    const resultado = (await buscarMovimentosMeta(ID_VIAGEM)) as unknown as Movimento[];

    expect(resultado).toEqual(movimentos);
    for (const linha of resultado) {
      if (linha.autor.sou_eu) expect(linha.conta).toEqual({ nome: 'Nubank' });
      else expect(linha).not.toHaveProperty('conta');
    }
  });

  it('devolve lista vazia quando a meta não tem movimentos', async () => {
    fetchSimulado.mockResolvedValueOnce(responder(200, lerResposta('movimentos-meta-vazio')));

    await expect(buscarMovimentosMeta(ID_VIAGEM)).resolves.toEqual([]);
  });

  it('traduz 400 registro_invalido', async () => {
    fetchSimulado.mockResolvedValueOnce(responder(400, lerResposta('erro-registro-invalido')));

    await expect(buscarMovimentosMeta(ID_VIAGEM)).rejects.toMatchObject({
      tipo: 'regra',
      codigo: 'registro_invalido',
    });
  });

  it('traduz falha de rede para rede', async () => {
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(buscarMovimentosMeta(ID_VIAGEM)).rejects.toMatchObject({ tipo: 'rede' });
  });
});
