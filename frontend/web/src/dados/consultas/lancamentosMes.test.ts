import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buscarLancamentosMes } from './lancamentosMes';

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

beforeEach(() => {
  fetchSimulado.mockReset();
});

describe('buscarLancamentosMes', () => {
  it('faz POST em rpc/lancamentos_mes no esquema api, só com os filtros dados, e devolve a resposta inteira', async () => {
    fetchSimulado.mockImplementation(responder(200, lerResposta('lancamentos-mes.json')));

    const resposta = await buscarLancamentosMes({ mes: '2026-10', escopo: 'individual', variavel: true });

    expect(resposta).toEqual(lerResposta('lancamentos-mes.json'));
    const [req] = requisicoesRest();
    expect(req.metodo).toBe('POST');
    expect(req.url.pathname).toBe('/rest/v1/rpc/lancamentos_mes');
    expect(req.cabecalhos.get('Content-Profile')).toBe('api');
    expect(req.corpo).toEqual({ p_mes: '2026-10-01', p_escopo: 'individual', p_variavel: true });
  });

  it('sem filtros envia só o mês, no formato AAAA-MM-01', async () => {
    fetchSimulado.mockImplementation(responder(200, lerResposta('lancamentos-mes.json')));

    await buscarLancamentosMes({ mes: '2026-09' });

    const [req] = requisicoesRest();
    expect(req.corpo).toEqual({ p_mes: '2026-09-01' });
  });

  it('categoria e forma viram p_categoria_id e p_forma_id', async () => {
    fetchSimulado.mockImplementation(responder(200, lerResposta('lancamentos-mes-vazio.json')));

    await buscarLancamentosMes({
      mes: '2026-10',
      escopo: 'conjunto',
      categoriaId: '00000000-0000-4000-8000-000000000401',
      formaId: '00000000-0000-4000-8000-000000000302',
    });

    const [req] = requisicoesRest();
    expect(req.corpo).toEqual({
      p_mes: '2026-10-01',
      p_escopo: 'conjunto',
      p_categoria_id: '00000000-0000-4000-8000-000000000401',
      p_forma_id: '00000000-0000-4000-8000-000000000302',
    });
  });

  it('mês vazio devolve a resposta vazia do contrato (total e quantidade prontos)', async () => {
    fetchSimulado.mockImplementation(responder(200, lerResposta('lancamentos-mes-vazio.json')));

    const resposta = await buscarLancamentosMes({ mes: '2026-10' });

    expect(resposta).toEqual(lerResposta('lancamentos-mes-vazio.json'));
    expect(resposta.quantidade).toBe(0);
    expect(resposta.total_filtrado_centavos).toBe(0);
  });

  it('503 vira { tipo: "indisponivel" }', async () => {
    fetchSimulado.mockImplementation(responder(503, lerResposta('erro-servico.json')));

    await expect(buscarLancamentosMes({ mes: '2026-10' })).rejects.toEqual({ tipo: 'indisponivel' });
  });

  it('TypeError do fetch vira { tipo: "rede" }', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(buscarLancamentosMes({ mes: '2026-10' })).rejects.toEqual({ tipo: 'rede' });
  });
});
