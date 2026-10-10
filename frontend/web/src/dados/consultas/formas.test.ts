import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buscarForma, buscarFormas } from './formas';

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
    }))
    .filter((r) => r.url.pathname.startsWith('/rest/v1/'));
}

const ID_ITEM = '00000000-0000-4000-8000-000000000303';

beforeEach(() => {
  fetchSimulado.mockReset();
});

describe('buscarFormas', () => {
  it('faz GET em /rest/v1/formas_pagamento?select=* no esquema api e devolve a lista inteira', async () => {
    fetchSimulado.mockImplementation(responder(200, lerResposta('formas-pagamento.json')));

    const lista = await buscarFormas();

    expect(lista).toEqual(lerResposta('formas-pagamento.json'));
    const [req] = requisicoesRest();
    expect(req.metodo).toBe('GET');
    expect(req.url.pathname).toBe('/rest/v1/formas_pagamento');
    expect(req.url.searchParams.get('select')).toBe('*');
    expect(req.cabecalhos.get('Accept-Profile')).toBe('api');
  });

  it('lista vazia devolve []', async () => {
    fetchSimulado.mockImplementation(responder(200, lerResposta('formas-vazio.json')));
    expect(await buscarFormas()).toEqual([]);
  });

  it('não filtra as arquivadas (a tela decide o que mostrar)', async () => {
    fetchSimulado.mockImplementation(responder(200, lerResposta('formas-pagamento.json')));
    await buscarFormas();
    expect(requisicoesRest()[0].url.searchParams.has('arquivada')).toBe(false);
  });

  it('503 vira indisponivel', async () => {
    fetchSimulado.mockImplementation(responder(503, lerResposta('erro-servico.json')));
    await expect(buscarFormas()).rejects.toEqual({ tipo: 'indisponivel' });
  });

  it('falha de rede vira rede', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(buscarFormas()).rejects.toEqual({ tipo: 'rede' });
  });
});

describe('buscarForma', () => {
  it('envia id=eq.<id> e devolve a linha', async () => {
    fetchSimulado.mockImplementation(responder(200, lerResposta('forma-xp.json')));

    const linha = await buscarForma(ID_ITEM);

    expect(linha).toEqual((lerResposta('forma-xp.json') as unknown[])[0]);
    const [req] = requisicoesRest();
    expect(req.url.pathname).toBe('/rest/v1/formas_pagamento');
    expect(req.url.searchParams.get('id')).toBe(`eq.${ID_ITEM}`);
    expect(req.cabecalhos.get('Accept-Profile')).toBe('api');
  });

  it('lista vazia (não existe ou não é sua) vira registro_invalido', async () => {
    fetchSimulado.mockImplementation(responder(200, []));
    await expect(buscarForma(ID_ITEM)).rejects.toEqual({ tipo: 'regra', codigo: 'registro_invalido' });
  });

  it('id que não é uuid vira registro_invalido sem nenhuma requisição', async () => {
    await expect(buscarForma('abc')).rejects.toEqual({ tipo: 'regra', codigo: 'registro_invalido' });
    expect(requisicoesRest()).toHaveLength(0);
  });

  it('503 vira indisponivel', async () => {
    fetchSimulado.mockImplementation(responder(503, lerResposta('erro-servico.json')));
    await expect(buscarForma(ID_ITEM)).rejects.toEqual({ tipo: 'indisponivel' });
  });

  it('falha de rede vira rede', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(buscarForma(ID_ITEM)).rejects.toEqual({ tipo: 'rede' });
  });
});
