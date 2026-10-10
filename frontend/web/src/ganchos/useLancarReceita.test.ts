import { readFileSync } from 'node:fs';
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fila } from '../dados/fila/fila';
import { useLancarReceita } from './useLancarReceita';

const { fetchSimulado } = vi.hoisted(() => ({ fetchSimulado: vi.fn<typeof fetch>() }));

vi.mock('../dados/cliente', async (importOriginal) => {
  const original = await importOriginal<typeof import('../dados/cliente')>();
  const cliente = original.criarCliente({
    url: 'https://teste.supabase.co',
    chave: 'chave-anon-de-teste',
    fetch: (...args: Parameters<typeof fetch>) => fetchSimulado(...args),
  });
  return { ...original, obterCliente: () => cliente };
});

vi.mock('../dados/fila/fila', () => ({
  fila: {
    enfileirar: vi.fn(),
    esvaziar: vi.fn(),
    listar: vi.fn(),
    descartar: vi.fn(),
    assinar: vi.fn(() => () => {}),
  },
}));

const lerResposta = (nome: string): Record<string, unknown> =>
  JSON.parse(readFileSync(new URL(`../../../../.md/mockup/respostas/${nome}`, import.meta.url), 'utf8'));

const responder = (status: number, corpo: unknown) => () =>
  Promise.resolve(
    new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }),
  );

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const CAMPOS = {
  valorCentavos: 750000,
  categoriaId: '00000000-0000-4000-8000-000000000421',
  contaId: '00000000-0000-4000-8000-000000000201',
  data: '2026-10-09',
  descricao: '',
};

const RESPOSTA_RECEITA = {
  ...lerResposta('lancar-despesa-credito.json'),
  escopo: 'individual',
  categoria: 'Salário',
  valor_total_centavos: 750000,
  num_parcelas: 1,
  primeira_parcela_data: '2026-10-09',
  ja_existia: false,
};

type Chave = readonly unknown[];

function criarAmbiente() {
  const clienteConsulta = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const espiaInvalidar = vi.spyOn(clienteConsulta, 'invalidateQueries');
  const envoltorio = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: clienteConsulta }, children);
  const chavesInvalidadas = (): Chave[] =>
    espiaInvalidar.mock.calls.map(([filtro]) => (filtro as { queryKey?: Chave } | undefined)?.queryKey ?? []);
  const { result } = renderHook(() => useLancarReceita(), { wrapper: envoltorio });
  return { result, chavesInvalidadas };
}

function corposLancarReceita(): Record<string, unknown>[] {
  return fetchSimulado.mock.calls
    .filter(([entrada]) => new URL(String(entrada)).pathname === '/rest/v1/rpc/lancar_receita')
    .map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>);
}

// `lancar` pode devolver promessa que rejeita no erro; o estado é o que importa.
async function lancar(result: { current: ReturnType<typeof useLancarReceita> }, campos = CAMPOS) {
  await act(async () => {
    await Promise.resolve(result.current.lancar(campos)).catch(() => undefined);
  });
}

beforeEach(() => {
  fetchSimulado.mockReset();
});

afterEach(() => {
  vi.mocked(fila.enfileirar).mockClear();
});

describe('useLancarReceita', () => {
  it('envia rpc/lancar_receita com p_id uuid v4, os campos da tela e p_data = data da tela', async () => {
    fetchSimulado.mockImplementation(responder(200, RESPOSTA_RECEITA));
    const { result } = criarAmbiente();

    await lancar(result);

    const corpos = corposLancarReceita();
    expect(corpos).toHaveLength(1);
    expect(corpos[0].p_id).toMatch(UUID_V4);
    expect(corpos[0]).toMatchObject({
      p_valor_centavos: 750000,
      p_categoria_id: CAMPOS.categoriaId,
      p_conta_id: CAMPOS.contaId,
      p_data: '2026-10-09',
    });
  });

  it('sucesso → estado sucesso, resposta exposta e invalida dados_lancamento, resumo_mes e contas', async () => {
    fetchSimulado.mockImplementation(responder(200, RESPOSTA_RECEITA));
    const { result, chavesInvalidadas } = criarAmbiente();

    await lancar(result);

    await waitFor(() => expect(result.current.estado).toBe('sucesso'));
    expect(result.current.resposta).toEqual(RESPOSTA_RECEITA);
    const prefixos = chavesInvalidadas().map((chave) => chave[0]);
    expect(prefixos).toEqual(expect.arrayContaining(['dados_lancamento', 'resumo_mes', 'contas']));
  });

  it('"enviando" enquanto o servidor não responde', async () => {
    fetchSimulado.mockImplementation(() => new Promise<Response>(() => {}));
    const { result } = criarAmbiente();

    act(() => {
      void Promise.resolve(result.current.lancar(CAMPOS)).catch(() => undefined);
    });

    await waitFor(() => expect(result.current.estado).toBe('enviando'));
  });

  it('TypeError de rede → sem_conexao, nada vai para a fila e nada é invalidado', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result, chavesInvalidadas } = criarAmbiente();

    await lancar(result);

    await waitFor(() => expect(result.current.estado).toBe('sem_conexao'));
    expect(fila.enfileirar).not.toHaveBeenCalled();
    expect(chavesInvalidadas()).toEqual([]);
  });

  it('servidor indisponível (503) → sem_conexao, sem fila', async () => {
    fetchSimulado.mockImplementation(responder(503, lerResposta('erro-servico.json')));
    const { result } = criarAmbiente();

    await lancar(result);

    await waitFor(() => expect(result.current.estado).toBe('sem_conexao'));
    expect(fila.enfileirar).not.toHaveBeenCalled();
  });

  it('registro_invalido → estado regra com o código traduzido, sem fila', async () => {
    fetchSimulado.mockImplementation(responder(400, lerResposta('erro-registro-invalido.json')));
    const { result, chavesInvalidadas } = criarAmbiente();

    await lancar(result);

    await waitFor(() => expect(result.current.estado).toBe('regra'));
    expect(result.current.erro).toEqual({ tipo: 'regra', codigo: 'registro_invalido' });
    expect(fila.enfileirar).not.toHaveBeenCalled();
    expect(chavesInvalidadas()).toEqual([]);
  });

  it('tentar de novo com os mesmos dados reaproveita o p_id', async () => {
    fetchSimulado
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockImplementation(responder(200, RESPOSTA_RECEITA));
    const { result } = criarAmbiente();

    await lancar(result);
    await waitFor(() => expect(result.current.estado).toBe('sem_conexao'));
    await lancar(result, { ...CAMPOS });
    await waitFor(() => expect(result.current.estado).toBe('sucesso'));

    const [primeiro, segundo] = corposLancarReceita();
    expect(primeiro.p_id).toMatch(UUID_V4);
    expect(segundo.p_id).toBe(primeiro.p_id);
  });

  it('tentar de novo com dados diferentes gera outro p_id', async () => {
    fetchSimulado
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockImplementation(responder(200, RESPOSTA_RECEITA));
    const { result } = criarAmbiente();

    await lancar(result);
    await lancar(result, { ...CAMPOS, valorCentavos: 800000 });

    const [primeiro, segundo] = corposLancarReceita();
    expect(segundo.p_id).toMatch(UUID_V4);
    expect(segundo.p_id).not.toBe(primeiro.p_id);
  });

  it('nova receita depois de um sucesso gera outro p_id, mesmo com os mesmos dados', async () => {
    fetchSimulado.mockImplementation(responder(200, RESPOSTA_RECEITA));
    const { result } = criarAmbiente();

    await lancar(result);
    await waitFor(() => expect(result.current.estado).toBe('sucesso'));
    await lancar(result);

    const [primeiro, segundo] = corposLancarReceita();
    expect(segundo.p_id).not.toBe(primeiro.p_id);
  });
});
