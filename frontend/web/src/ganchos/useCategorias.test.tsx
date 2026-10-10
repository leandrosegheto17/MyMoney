import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCategoria, useCategorias, useComandosCategoria } from './useCategorias';

vi.mock('../dados/consultas/categorias', () => ({
  buscarCategorias: vi.fn(),
  buscarCategoria: vi.fn(),
}));
vi.mock('../dados/comandos/categorias', () => ({
  salvarCategoria: vi.fn(),
  arquivarCategoria: vi.fn(),
  excluirCategoria: vi.fn(),
}));

const consultas = await import('../dados/consultas/categorias');
const comandos = await import('../dados/comandos/categorias');

const lerResposta = (nome: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../.md/mockup/respostas/${nome}`, import.meta.url), 'utf8'));

const ID_MERCADO = '00000000-0000-4000-8000-000000000401';

function montar() {
  const clienteConsulta = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidar = vi.spyOn(clienteConsulta, 'invalidateQueries');
  const envolver = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={clienteConsulta}>{children}</QueryClientProvider>
  );
  return { invalidar, envolver };
}

const chavesInvalidadas = (invalidar: ReturnType<typeof montar>['invalidar']) =>
  invalidar.mock.calls.map(([filtro]) => (filtro as { queryKey?: unknown } | undefined)?.queryKey);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCategorias e useCategoria', () => {
  it('useCategorias entrega a lista da consulta', async () => {
    vi.mocked(consultas.buscarCategorias).mockResolvedValue(lerResposta('categorias.json') as never);
    const { envolver } = montar();

    const { result } = renderHook(() => useCategorias(), { wrapper: envolver });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(lerResposta('categorias.json'));
  });

  it('useCategoria busca pelo id', async () => {
    const [linha] = lerResposta('categoria-mercado.json') as unknown[];
    vi.mocked(consultas.buscarCategoria).mockResolvedValue(linha as never);
    const { envolver } = montar();

    const { result } = renderHook(() => useCategoria(ID_MERCADO), { wrapper: envolver });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(consultas.buscarCategoria).toHaveBeenCalledWith(ID_MERCADO);
    expect(result.current.data).toEqual(linha);
  });
});

describe('useComandosCategoria', () => {
  const args = {
    p_id: ID_MERCADO,
    p_nome: 'Mercado',
    p_tipo: 'despesa' as const,
    p_escopo: 'conjunto' as const,
    p_variavel: true,
  };

  it('salvarCategoria com sucesso invalida categorias', async () => {
    vi.mocked(comandos.salvarCategoria).mockResolvedValue(ID_MERCADO as never);
    const { envolver, invalidar } = montar();
    const { result } = renderHook(() => useComandosCategoria(), { wrapper: envolver });

    await act(() => result.current.salvarCategoria.mutateAsync(args));

    expect(comandos.salvarCategoria).toHaveBeenCalledWith(args);
    expect(chavesInvalidadas(invalidar)).toContainEqual(['categorias']);
    expect(chavesInvalidadas(invalidar)).not.toContainEqual(['contas']);
  });

  it('arquivarCategoria e excluirCategoria invalidam categorias', async () => {
    vi.mocked(comandos.arquivarCategoria).mockResolvedValue(undefined as never);
    vi.mocked(comandos.excluirCategoria).mockResolvedValue(undefined as never);
    const { envolver, invalidar } = montar();
    const { result } = renderHook(() => useComandosCategoria(), { wrapper: envolver });

    await act(() => result.current.arquivarCategoria.mutateAsync(ID_MERCADO));
    await act(() => result.current.excluirCategoria.mutateAsync(ID_MERCADO));

    expect(comandos.arquivarCategoria).toHaveBeenCalledWith(ID_MERCADO);
    expect(comandos.excluirCategoria).toHaveBeenCalledWith(ID_MERCADO);
    expect(chavesInvalidadas(invalidar).filter((c) => JSON.stringify(c) === '["categorias"]')).toHaveLength(2);
  });

  it('erro não invalida e expõe o ErroDados', async () => {
    vi.mocked(comandos.excluirCategoria).mockRejectedValue({ tipo: 'regra', codigo: 'categoria_em_uso' });
    const { envolver, invalidar } = montar();
    const { result } = renderHook(() => useComandosCategoria(), { wrapper: envolver });

    await act(async () => {
      await result.current.excluirCategoria.mutateAsync(ID_MERCADO).catch(() => undefined);
    });

    await waitFor(() =>
      expect(result.current.excluirCategoria.error).toEqual({ tipo: 'regra', codigo: 'categoria_em_uso' }),
    );
    expect(invalidar).not.toHaveBeenCalled();
  });
});
