import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { arquivarCategoria, excluirCategoria, salvarCategoria } from './categorias';

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

const ID_CATEGORIA = '00000000-0000-4000-8000-000000000401';

const argsMercado = {
  p_id: ID_CATEGORIA,
  p_nome: 'Mercado',
  p_tipo: 'despesa' as const,
  p_escopo: 'conjunto' as const,
  p_variavel: true,
};

const erroRegra = (codigo: string) => ({ code: 'P0001', message: codigo, details: null, hint: null });

beforeEach(() => {
  fetchSimulado.mockReset();
});

describe('salvarCategoria', () => {
  it('faz POST em rpc/salvar_categoria com os parâmetros p_*', async () => {
    fetchSimulado.mockImplementation(responder(200, ID_CATEGORIA));

    await salvarCategoria(argsMercado);

    const [req] = requisicoesRest();
    expect(req.metodo).toBe('POST');
    expect(req.url.pathname).toBe('/rest/v1/rpc/salvar_categoria');
    expect(req.cabecalhos.get('Content-Profile')).toBe('api');
    expect(req.corpo).toEqual(argsMercado);
  });

  it('nome repetido vira regra nome_repetido', async () => {
    fetchSimulado.mockImplementation(responder(400, erroRegra('nome_repetido')));
    await expect(salvarCategoria(argsMercado)).rejects.toEqual({ tipo: 'regra', codigo: 'nome_repetido' });
  });

  it('registro inválido vira regra registro_invalido', async () => {
    fetchSimulado.mockImplementation(responder(400, lerResposta('erro-registro-invalido.json')));
    await expect(salvarCategoria(argsMercado)).rejects.toEqual({
      tipo: 'regra',
      codigo: 'registro_invalido',
    });
  });

  it('falha de rede vira rede', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(salvarCategoria(argsMercado)).rejects.toEqual({ tipo: 'rede' });
  });
});

describe('arquivarCategoria', () => {
  it('faz POST em rpc/arquivar_categoria com p_id', async () => {
    fetchSimulado.mockImplementation(responder(204, undefined));

    await arquivarCategoria(ID_CATEGORIA);

    const [req] = requisicoesRest();
    expect(req.metodo).toBe('POST');
    expect(req.url.pathname).toBe('/rest/v1/rpc/arquivar_categoria');
    expect(req.corpo).toEqual({ p_id: ID_CATEGORIA });
  });
});

describe('excluirCategoria', () => {
  it('faz POST em rpc/excluir_categoria com p_id', async () => {
    fetchSimulado.mockImplementation(responder(204, undefined));

    await excluirCategoria(ID_CATEGORIA);

    const [req] = requisicoesRest();
    expect(req.url.pathname).toBe('/rest/v1/rpc/excluir_categoria');
    expect(req.corpo).toEqual({ p_id: ID_CATEGORIA });
  });

  it('categoria usada devolve o código categoria_em_uso', async () => {
    fetchSimulado.mockImplementation(responder(400, erroRegra('categoria_em_uso')));
    await expect(excluirCategoria(ID_CATEGORIA)).rejects.toEqual({
      tipo: 'regra',
      codigo: 'categoria_em_uso',
    });
  });

  it('registro inválido vira regra registro_invalido', async () => {
    fetchSimulado.mockImplementation(responder(400, lerResposta('erro-registro-invalido.json')));
    await expect(excluirCategoria(ID_CATEGORIA)).rejects.toEqual({
      tipo: 'regra',
      codigo: 'registro_invalido',
    });
  });
});

describe('escrita só por rpc', () => {
  it('nenhum comando usa PATCH, PUT, DELETE ou POST fora de /rpc/', async () => {
    fetchSimulado.mockImplementation(responder(200, null));

    await salvarCategoria(argsMercado);
    await arquivarCategoria(ID_CATEGORIA);
    await excluirCategoria(ID_CATEGORIA);

    for (const req of requisicoesRest()) {
      expect(req.metodo).toBe('POST');
      expect(req.url.pathname.startsWith('/rest/v1/rpc/')).toBe(true);
    }
  });
});
