import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { alterarDataParcela, editarLancamento, excluirLancamento } from '../dados/comandos/lancamentos';
import { useComandosLancamento } from './useComandosLancamento';

vi.mock('../dados/comandos/lancamentos', async (importOriginal) => {
  const original = await importOriginal<typeof import('../dados/comandos/lancamentos')>();
  return {
    ...original,
    editarLancamento: vi.fn(),
    excluirLancamento: vi.fn(),
    alterarDataParcela: vi.fn(),
  };
});

type Chave = readonly unknown[];

const ID_GELADEIRA = '00000000-0000-4000-8000-000000000520';
const ID_PARCELA_2 = '00000000-0000-4000-8000-000000000621';

function criarAmbiente() {
  const clienteConsulta = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const espiaInvalidar = vi.spyOn(clienteConsulta, 'invalidateQueries');
  const espiaRemover = vi.spyOn(clienteConsulta, 'removeQueries');
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={clienteConsulta}>{children}</QueryClientProvider>
  );
  const chaves = (espia: typeof espiaInvalidar | typeof espiaRemover): Chave[] =>
    espia.mock.calls.map(([filtro]) => (filtro as { queryKey?: Chave } | undefined)?.queryKey ?? []);
  return { envoltorio, espiaInvalidar, espiaRemover, chaves };
}

// O comando da fábrica pode ser a função ou o resultado do useMutation.
function executar(comando: unknown, argumentos: unknown): Promise<unknown> {
  if (typeof comando === 'function') return (comando as (a: unknown) => Promise<unknown>)(argumentos);
  return (comando as { mutateAsync: (a: unknown) => Promise<unknown> }).mutateAsync(argumentos);
}

const comInicio = (chaves: Chave[], prefixo: string) => chaves.some((c) => c[0] === prefixo);

afterEach(() => {
  vi.mocked(editarLancamento).mockReset();
  vi.mocked(excluirLancamento).mockReset();
  vi.mocked(alterarDataParcela).mockReset();
});

describe('useComandosLancamento: editar', () => {
  it('sucesso invalida lancamentos_mes, o detalhe e resumo_mes', async () => {
    vi.mocked(editarLancamento).mockResolvedValue({} as never);
    const { envoltorio, espiaInvalidar, chaves } = criarAmbiente();
    const { result } = renderHook(() => useComandosLancamento(), { wrapper: envoltorio });
    const argumentos = { id: ID_GELADEIRA, campos: { descricao: 'Geladeira inox' } };

    await act(() => executar(result.current.editar, argumentos));

    expect(editarLancamento).toHaveBeenCalledWith(argumentos);
    const invalidadas = chaves(espiaInvalidar);
    expect(invalidadas).toEqual(expect.arrayContaining([['lancamentos_mes'], ['lancamento', ID_GELADEIRA]]));
    expect(comInicio(invalidadas, 'resumo_mes')).toBe(true);
  });

  it('erro não invalida e sobe como ErroDados', async () => {
    vi.mocked(editarLancamento).mockRejectedValue({ tipo: 'regra', codigo: 'confirmar_descarte_ajustes' });
    const { envoltorio, espiaInvalidar } = criarAmbiente();
    const { result } = renderHook(() => useComandosLancamento(), { wrapper: envoltorio });

    await act(async () => {
      await expect(
        executar(result.current.editar, { id: ID_GELADEIRA, campos: { valorTotalCentavos: 200000 } }),
      ).rejects.toEqual({ tipo: 'regra', codigo: 'confirmar_descarte_ajustes' });
    });

    expect(espiaInvalidar).not.toHaveBeenCalled();
  });

  it('sem rede: erro "rede" sobe e nada é invalidado', async () => {
    vi.mocked(editarLancamento).mockRejectedValue({ tipo: 'rede' });
    const { envoltorio, espiaInvalidar } = criarAmbiente();
    const { result } = renderHook(() => useComandosLancamento(), { wrapper: envoltorio });

    await act(async () => {
      await expect(executar(result.current.editar, { id: ID_GELADEIRA, campos: { descricao: 'x' } })).rejects.toEqual({
        tipo: 'rede',
      });
    });

    expect(espiaInvalidar).not.toHaveBeenCalled();
  });
});

describe('useComandosLancamento: excluir', () => {
  it('sucesso invalida as listas e o resumo e remove ["lancamento", id] sem refazer a leitura', async () => {
    vi.mocked(excluirLancamento).mockResolvedValue(undefined as never);
    const { envoltorio, espiaInvalidar, espiaRemover, chaves } = criarAmbiente();
    const { result } = renderHook(() => useComandosLancamento(), { wrapper: envoltorio });

    await act(() => executar(result.current.excluir, ID_GELADEIRA));

    expect(excluirLancamento).toHaveBeenCalledWith(ID_GELADEIRA);
    const invalidadas = chaves(espiaInvalidar);
    expect(invalidadas).toEqual(expect.arrayContaining([['lancamentos_mes']]));
    expect(comInicio(invalidadas, 'resumo_mes')).toBe(true);
    expect(invalidadas).not.toContainEqual(['lancamento', ID_GELADEIRA]);
    expect(chaves(espiaRemover)).toContainEqual(['lancamento', ID_GELADEIRA]);
  });

  it('erro não invalida nem remove', async () => {
    vi.mocked(excluirLancamento).mockRejectedValue({ tipo: 'regra', codigo: 'registro_invalido' });
    const { envoltorio, espiaInvalidar, espiaRemover } = criarAmbiente();
    const { result } = renderHook(() => useComandosLancamento(), { wrapper: envoltorio });

    await act(async () => {
      await expect(executar(result.current.excluir, ID_GELADEIRA)).rejects.toEqual({
        tipo: 'regra',
        codigo: 'registro_invalido',
      });
    });

    expect(espiaInvalidar).not.toHaveBeenCalled();
    expect(espiaRemover).not.toHaveBeenCalled();
  });
});

describe('useComandosLancamento: alterarDataParcela', () => {
  const ARGUMENTOS = { lancamentoId: ID_GELADEIRA, parcelaId: ID_PARCELA_2, data: '2026-11-05' };

  it('sucesso invalida o detalhe, lancamentos_mes, resumo_mes e formas_pagamento', async () => {
    vi.mocked(alterarDataParcela).mockResolvedValue(undefined as never);
    const { envoltorio, espiaInvalidar, chaves } = criarAmbiente();
    const { result } = renderHook(() => useComandosLancamento(), { wrapper: envoltorio });

    await act(() => executar(result.current.alterarDataParcela, ARGUMENTOS));

    expect(alterarDataParcela).toHaveBeenCalledWith(
      expect.objectContaining({ parcelaId: ID_PARCELA_2, data: '2026-11-05' }),
    );
    const invalidadas = chaves(espiaInvalidar);
    expect(invalidadas).toEqual(
      expect.arrayContaining([['lancamento', ID_GELADEIRA], ['lancamentos_mes'], ['formas_pagamento']]),
    );
    expect(comInicio(invalidadas, 'resumo_mes')).toBe(true);
  });

  it('erro não invalida', async () => {
    vi.mocked(alterarDataParcela).mockRejectedValue({ tipo: 'rede' });
    const { envoltorio, espiaInvalidar } = criarAmbiente();
    const { result } = renderHook(() => useComandosLancamento(), { wrapper: envoltorio });

    await act(async () => {
      await expect(executar(result.current.alterarDataParcela, ARGUMENTOS)).rejects.toEqual({ tipo: 'rede' });
    });

    expect(espiaInvalidar).not.toHaveBeenCalled();
  });
});
