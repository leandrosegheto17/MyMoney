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

import { buscarMeta, buscarMetas } from './metas';

function lerResposta(nome: string): unknown {
  return JSON.parse(readFileSync(new URL(`../../../../../.md/mockup/respostas/${nome}.json`, import.meta.url), 'utf8'));
}

function responder(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requisicao(indice = 0): { url: URL; metodo: string; cabecalhos: Headers } {
  const [entrada, init] = fetchSimulado.mock.calls[indice];
  const url = new URL(entrada instanceof Request ? entrada.url : String(entrada));
  const cabecalhos = new Headers(entrada instanceof Request ? entrada.headers : init?.headers);
  const metodo = (entrada instanceof Request ? entrada.method : init?.method) ?? 'GET';
  return { url, metodo, cabecalhos };
}

const ID_VIAGEM = '00000000-0000-4000-8000-000000000902';

beforeEach(() => {
  fetchSimulado.mockReset();
});

describe('buscarMetas', () => {
  it('lê a view metas do schema api e devolve a lista na ordem da API', async () => {
    const metas = lerResposta('metas');
    fetchSimulado.mockResolvedValueOnce(responder(200, metas));

    await expect(buscarMetas()).resolves.toEqual(metas);

    const { url, metodo, cabecalhos } = requisicao();
    expect(metodo).toBe('GET');
    expect(url.pathname).toBe('/rest/v1/metas');
    expect(url.searchParams.get('select')).toBe('*');
    expect(cabecalhos.get('Accept-Profile')).toBe('api');
  });

  it('devolve lista vazia quando não há metas', async () => {
    fetchSimulado.mockResolvedValueOnce(responder(200, lerResposta('metas-vazio')));

    await expect(buscarMetas()).resolves.toEqual([]);
  });

  it('traduz 503 para indisponivel', async () => {
    fetchSimulado.mockResolvedValueOnce(responder(503, lerResposta('erro-servico')));

    await expect(buscarMetas()).rejects.toMatchObject({ tipo: 'indisponivel' });
  });

  it('traduz falha de rede para rede', async () => {
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(buscarMetas()).rejects.toMatchObject({ tipo: 'rede' });
  });
});

describe('buscarMeta', () => {
  it('filtra pelo id e devolve a meta com por_local', async () => {
    const detalhe = lerResposta('meta-detalhe') as Array<Record<string, unknown>>;
    fetchSimulado.mockResolvedValueOnce(responder(200, detalhe));

    const meta = await buscarMeta(ID_VIAGEM);

    expect(meta).toEqual(detalhe[0]);
    expect(meta.por_local).toEqual([
      { local: 'Caixinha Nubank', guardado_centavos: 420000 },
      { local: 'CDB Banco Inter', guardado_centavos: 200000 },
    ]);
    const { url, cabecalhos } = requisicao();
    expect(url.pathname).toBe('/rest/v1/metas');
    expect(url.searchParams.get('id')).toBe(`eq.${ID_VIAGEM}`);
    expect(cabecalhos.get('Accept-Profile')).toBe('api');
  });

  it('lista vazia (inexistente ou alheia) vira registro_invalido', async () => {
    fetchSimulado.mockResolvedValueOnce(responder(200, lerResposta('metas-vazio')));

    await expect(buscarMeta(ID_VIAGEM)).rejects.toMatchObject({
      tipo: 'regra',
      codigo: 'registro_invalido',
    });
  });

  it('id que não é uuid vira o mesmo registro_invalido sem requisição', async () => {
    await expect(buscarMeta('abc')).rejects.toMatchObject({
      tipo: 'regra',
      codigo: 'registro_invalido',
    });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it('traduz 503 para indisponivel', async () => {
    fetchSimulado.mockResolvedValueOnce(responder(503, lerResposta('erro-servico')));

    await expect(buscarMeta(ID_VIAGEM)).rejects.toMatchObject({ tipo: 'indisponivel' });
  });

  it('traduz falha de rede para rede', async () => {
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(buscarMeta(ID_VIAGEM)).rejects.toMatchObject({ tipo: 'rede' });
  });

  it('não repassa a mensagem crua do servidor', async () => {
    fetchSimulado.mockResolvedValueOnce(
      responder(400, { code: '42P01', message: 'relation "app.meta" does not exist' }),
    );

    const erro = await buscarMeta(ID_VIAGEM).catch((e: unknown) => e);
    expect(JSON.stringify(erro)).not.toContain('app.meta');
  });
});
