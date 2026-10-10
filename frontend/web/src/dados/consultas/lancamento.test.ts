import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buscarLancamento } from './lancamento';

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
    new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }),
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

const ID_GELADEIRA = '00000000-0000-4000-8000-000000000520';

beforeEach(() => {
  fetchSimulado.mockReset();
});

describe('buscarLancamento', () => {
  it('pagador: POST em rpc/lancamento com p_id e devolve o detalhe com "pagamento"', async () => {
    fetchSimulado.mockImplementation(responder(200, lerResposta('lancamento-pagador.json')));

    const lancamento = await buscarLancamento(ID_GELADEIRA);

    expect(lancamento).toEqual(lerResposta('lancamento-pagador.json'));
    expect(lancamento).toHaveProperty('pagamento');
    const [req] = requisicoesRest();
    expect(req.metodo).toBe('POST');
    expect(req.url.pathname).toBe('/rest/v1/rpc/lancamento');
    expect(req.cabecalhos.get('Content-Profile')).toBe('api');
    expect(req.corpo).toEqual({ p_id: ID_GELADEIRA });
  });

  it('outro membro: a resposta não tem a chave "pagamento" (não vira null)', async () => {
    fetchSimulado.mockImplementation(responder(200, lerResposta('lancamento-outro-membro.json')));

    const lancamento = await buscarLancamento(ID_GELADEIRA);

    expect(lancamento).toEqual(lerResposta('lancamento-outro-membro.json'));
    expect('pagamento' in (lancamento as object)).toBe(false);
  });

  it('400 com registro_invalido vira { tipo: "regra", codigo: "registro_invalido" }', async () => {
    fetchSimulado.mockImplementation(responder(400, lerResposta('erro-registro-invalido.json')));

    await expect(buscarLancamento(ID_GELADEIRA)).rejects.toEqual({
      tipo: 'regra',
      codigo: 'registro_invalido',
    });
  });

  it('id que não é uuid dá o mesmo registro_invalido, sem requisição', async () => {
    await expect(buscarLancamento('abc')).rejects.toEqual({ tipo: 'regra', codigo: 'registro_invalido' });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it('TypeError do fetch vira { tipo: "rede" }', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(buscarLancamento(ID_GELADEIRA)).rejects.toEqual({ tipo: 'rede' });
  });
});
