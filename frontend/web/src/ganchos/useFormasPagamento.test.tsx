import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComandosForma, useForma, useFormasPagamento } from './useFormasPagamento';

vi.mock('../dados/consultas/formas', () => ({
  buscarFormas: vi.fn(),
  buscarForma: vi.fn(),
}));
vi.mock('../dados/comandos/formas', () => ({
  salvarForma: vi.fn(),
  arquivarForma: vi.fn(),
  excluirForma: vi.fn(),
  definirPreferida: vi.fn(),
}));

const consultas = await import('../dados/consultas/formas');
const comandos = await import('../dados/comandos/formas');

const lerResposta = (nome: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../.md/mockup/respostas/${nome}`, import.meta.url), 'utf8'));

const ID_XP = '00000000-0000-4000-8000-000000000303';

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

describe('useFormasPagamento e useForma', () => {
  it('useFormasPagamento entrega a lista da consulta', async () => {
    vi.mocked(consultas.buscarFormas).mockResolvedValue(lerResposta('formas-pagamento.json') as never);
    const { envolver } = montar();

    const { result } = renderHook(() => useFormasPagamento(), { wrapper: envolver });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(lerResposta('formas-pagamento.json'));
  });

  it('useForma busca pelo id', async () => {
    const [linha] = lerResposta('forma-xp.json') as unknown[];
    vi.mocked(consultas.buscarForma).mockResolvedValue(linha as never);
    const { envolver } = montar();

    const { result } = renderHook(() => useForma(ID_XP), { wrapper: envolver });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(consultas.buscarForma).toHaveBeenCalledWith(ID_XP);
    expect(result.current.data).toEqual(linha);
  });
});

describe('useComandosForma', () => {
  const args = {
    p_id: ID_XP,
    p_nome: 'Cartão de crédito XP',
    p_tipo: 'credito' as const,
    p_conta_id: null,
    p_dia_vencimento: 10,
  };

  it('salvarForma com sucesso invalida formas_pagamento', async () => {
    vi.mocked(comandos.salvarForma).mockResolvedValue(ID_XP as never);
    const { envolver, invalidar } = montar();
    const { result } = renderHook(() => useComandosForma(), { wrapper: envolver });

    await act(() => result.current.salvarForma.mutateAsync(args));

    expect(comandos.salvarForma).toHaveBeenCalledWith(args);
    expect(chavesInvalidadas(invalidar)).toContainEqual(['formas_pagamento']);
    expect(chavesInvalidadas(invalidar)).not.toContainEqual(['categorias']);
  });

  it('definirPreferida repassa id e valor e invalida formas_pagamento', async () => {
    vi.mocked(comandos.definirPreferida).mockResolvedValue(undefined as never);
    const { envolver, invalidar } = montar();
    const { result } = renderHook(() => useComandosForma(), { wrapper: envolver });

    await act(() => result.current.definirPreferida.mutateAsync({ id: ID_XP, preferida: false }));

    expect(comandos.definirPreferida).toHaveBeenCalledWith(ID_XP, false);
    expect(chavesInvalidadas(invalidar)).toContainEqual(['formas_pagamento']);
  });

  it('arquivarForma e excluirForma invalidam formas_pagamento', async () => {
    vi.mocked(comandos.arquivarForma).mockResolvedValue(undefined as never);
    vi.mocked(comandos.excluirForma).mockResolvedValue(undefined as never);
    const { envolver, invalidar } = montar();
    const { result } = renderHook(() => useComandosForma(), { wrapper: envolver });

    await act(() => result.current.arquivarForma.mutateAsync(ID_XP));
    await act(() => result.current.excluirForma.mutateAsync(ID_XP));

    expect(comandos.arquivarForma).toHaveBeenCalledWith(ID_XP);
    expect(comandos.excluirForma).toHaveBeenCalledWith(ID_XP);
    expect(chavesInvalidadas(invalidar).filter((c) => JSON.stringify(c) === '["formas_pagamento"]')).toHaveLength(2);
  });

  it('erro não invalida e expõe o ErroDados', async () => {
    vi.mocked(comandos.excluirForma).mockRejectedValue({ tipo: 'regra', codigo: 'em_uso' });
    const { envolver, invalidar } = montar();
    const { result } = renderHook(() => useComandosForma(), { wrapper: envolver });

    await act(async () => {
      await result.current.excluirForma.mutateAsync(ID_XP).catch(() => undefined);
    });

    await waitFor(() => expect(result.current.excluirForma.error).toEqual({ tipo: 'regra', codigo: 'em_uso' }));
    expect(invalidar).not.toHaveBeenCalled();
  });
});
