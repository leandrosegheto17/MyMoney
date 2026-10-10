import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../dados/consultas/metas', () => ({ buscarMetas: vi.fn(), buscarMeta: vi.fn() }));
vi.mock('../dados/consultas/movimentosMeta', () => ({ buscarMovimentosMeta: vi.fn() }));
vi.mock('../dados/consultas/locaisGuardados', () => ({ buscarLocaisGuardados: vi.fn() }));

import { buscarMeta, buscarMetas } from '../dados/consultas/metas';
import { buscarLocaisGuardados } from '../dados/consultas/locaisGuardados';
import { buscarMovimentosMeta } from '../dados/consultas/movimentosMeta';
import { useLocaisGuardados } from './useLocaisGuardados';
import { useMeta, useMetas } from './useMetas';
import { useMovimentosMeta } from './useMovimentosMeta';

const ID_VIAGEM = '00000000-0000-4000-8000-000000000902';

function criarAmbiente(): { cliente: QueryClient; wrapper: (p: { children: ReactNode }) => ReactNode } {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
  return { cliente, wrapper };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('useMetas', () => {
  it('guarda a lista na chave metas', async () => {
    const lista = [{ id: ID_VIAGEM, nome: 'Viagem Nordeste' }];
    vi.mocked(buscarMetas).mockResolvedValue(lista as never);
    const { cliente, wrapper } = criarAmbiente();

    const { result } = renderHook(() => useMetas(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(lista);
    expect(cliente.getQueryData(['metas'])).toEqual(lista);
  });

  it('expõe o erro traduzido', async () => {
    vi.mocked(buscarMetas).mockRejectedValue({ tipo: 'rede' });
    const { wrapper } = criarAmbiente();

    const { result } = renderHook(() => useMetas(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ tipo: 'rede' });
  });
});

describe('useMeta', () => {
  it('busca pelo id e guarda na chave metas + id', async () => {
    const meta = { id: ID_VIAGEM, nome: 'Viagem Nordeste', por_local: [] };
    vi.mocked(buscarMeta).mockResolvedValue(meta as never);
    const { cliente, wrapper } = criarAmbiente();

    const { result } = renderHook(() => useMeta(ID_VIAGEM), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(buscarMeta).toHaveBeenCalledWith(ID_VIAGEM);
    expect(cliente.getQueryData(['metas', ID_VIAGEM])).toEqual(meta);
  });

  it('registro_invalido chega como erro de regra', async () => {
    vi.mocked(buscarMeta).mockRejectedValue({ tipo: 'regra', codigo: 'registro_invalido' });
    const { wrapper } = criarAmbiente();

    const { result } = renderHook(() => useMeta('abc'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ tipo: 'regra', codigo: 'registro_invalido' });
  });
});

describe('useMovimentosMeta', () => {
  it('guarda na chave movimentos_meta + id da meta', async () => {
    vi.mocked(buscarMovimentosMeta).mockResolvedValue([] as never);
    const { cliente, wrapper } = criarAmbiente();

    const { result } = renderHook(() => useMovimentosMeta(ID_VIAGEM), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(buscarMovimentosMeta).toHaveBeenCalledWith(ID_VIAGEM);
    expect(cliente.getQueryData(['movimentos_meta', ID_VIAGEM])).toEqual([]);
  });
});

describe('useLocaisGuardados', () => {
  it('busca e guarda na chave locais_guardados', async () => {
    vi.mocked(buscarLocaisGuardados).mockResolvedValue(['Caixinha Nubank', 'CDB Banco Inter']);
    const { cliente, wrapper } = criarAmbiente();

    const { result } = renderHook(() => useLocaisGuardados({ enabled: true }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cliente.getQueryData(['locais_guardados'])).toEqual(['Caixinha Nubank', 'CDB Banco Inter']);
  });

  it('desabilitado não chama a consulta', async () => {
    const { wrapper } = criarAmbiente();

    const { result } = renderHook(() => useLocaisGuardados({ enabled: false }), { wrapper });

    await new Promise((r) => setTimeout(r, 20));
    expect(buscarLocaisGuardados).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });
});
