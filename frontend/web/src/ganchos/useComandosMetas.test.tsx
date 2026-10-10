import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../dados/comandos/metas', () => ({ salvarMeta: vi.fn(), movimentarMeta: vi.fn() }));

import { movimentarMeta, salvarMeta } from '../dados/comandos/metas';
import { useComandosMetas } from './useComandosMetas';

const ID_META = '00000000-0000-4000-8000-000000000902';
const ID_MOVIMENTO = '00000000-0000-4000-8000-000000000ba1';

const DADOS_SALVAR = { id: ID_META, nome: 'Viagem Nordeste', alvoCentavos: 1200000, prazo: '2027-07' };
const DADOS_MOVIMENTAR = {
  id: ID_MOVIMENTO,
  metaId: ID_META,
  tipo: 'aporte' as const,
  valorCentavos: 50000,
  data: '2026-10-09',
  local: 'Caixinha Nubank',
};

function montar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidar = vi.spyOn(cliente, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useComandosMetas(), { wrapper });
  const chavesInvalidadas = () =>
    invalidar.mock.calls.map(([filtro]) => (filtro as { queryKey?: unknown[] } | undefined)?.queryKey);
  return { result, invalidar, chavesInvalidadas };
}

afterEach(() => {
  vi.clearAllMocks();
  onlineManager.setOnline(true);
});

describe('useComandosMetas: salvar', () => {
  it('sucesso invalida metas e o resumo do mês', async () => {
    vi.mocked(salvarMeta).mockResolvedValue(ID_META as never);
    const { result, chavesInvalidadas } = montar();

    await act(() => result.current.salvarMeta.mutateAsync(DADOS_SALVAR));

    expect(vi.mocked(salvarMeta).mock.calls[0][0]).toEqual(DADOS_SALVAR);
    const chaves = chavesInvalidadas();
    expect(chaves).toContainEqual(['metas']);
    expect(chaves).toContainEqual(['resumo_mes']);
    expect(chaves).not.toContainEqual(['contas']);
    expect(chaves).not.toContainEqual(['locais_guardados']);
  });

  it('erro não invalida e sobe como ErroDados', async () => {
    vi.mocked(salvarMeta).mockRejectedValue({ tipo: 'regra', codigo: 'valor_invalido' });
    const { result, invalidar } = montar();

    await act(async () => {
      await expect(result.current.salvarMeta.mutateAsync(DADOS_SALVAR)).rejects.toMatchObject({
        tipo: 'regra',
        codigo: 'valor_invalido',
      });
    });

    expect(invalidar).not.toHaveBeenCalled();
  });

  it('sem rede não fica pausado: devolve rede', async () => {
    onlineManager.setOnline(false);
    vi.mocked(salvarMeta).mockRejectedValue({ tipo: 'rede' });
    const { result } = montar();

    act(() => {
      result.current.salvarMeta.mutate(DADOS_SALVAR);
    });

    await waitFor(() => expect(result.current.salvarMeta.isError).toBe(true));
    expect(result.current.salvarMeta.isPaused).toBe(false);
    expect(result.current.salvarMeta.error).toMatchObject({ tipo: 'rede' });
    expect(salvarMeta).toHaveBeenCalledTimes(1);
  });
});

describe('useComandosMetas: movimentar', () => {
  it('sucesso invalida metas, movimentos da meta, locais, resumo e contas', async () => {
    vi.mocked(movimentarMeta).mockResolvedValue(ID_MOVIMENTO as never);
    const { result, chavesInvalidadas } = montar();

    await act(() => result.current.movimentarMeta.mutateAsync(DADOS_MOVIMENTAR));

    expect(vi.mocked(movimentarMeta).mock.calls[0][0]).toEqual(DADOS_MOVIMENTAR);
    const chaves = chavesInvalidadas();
    expect(chaves).toContainEqual(['metas']);
    expect(chaves).toContainEqual(['movimentos_meta', ID_META]);
    expect(chaves).toContainEqual(['locais_guardados']);
    expect(chaves).toContainEqual(['resumo_mes']);
    expect(chaves).toContainEqual(['contas']);
  });

  it('erro não invalida', async () => {
    vi.mocked(movimentarMeta).mockRejectedValue({ tipo: 'regra', codigo: 'retirada_maior_que_guardado' });
    const { result, invalidar } = montar();

    await act(async () => {
      await expect(result.current.movimentarMeta.mutateAsync(DADOS_MOVIMENTAR)).rejects.toMatchObject({
        tipo: 'regra',
        codigo: 'retirada_maior_que_guardado',
      });
    });

    expect(invalidar).not.toHaveBeenCalled();
  });

  it('sem rede não fica pausado: devolve rede', async () => {
    onlineManager.setOnline(false);
    vi.mocked(movimentarMeta).mockRejectedValue({ tipo: 'rede' });
    const { result } = montar();

    act(() => {
      result.current.movimentarMeta.mutate(DADOS_MOVIMENTAR);
    });

    await waitFor(() => expect(result.current.movimentarMeta.isError).toBe(true));
    expect(result.current.movimentarMeta.isPaused).toBe(false);
    expect(result.current.movimentarMeta.error).toMatchObject({ tipo: 'rede' });
  });
});
