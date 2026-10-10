import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../dados/comandos/formas', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../dados/comandos/formas')>()),
  registrarPagamentoCartao: vi.fn(),
}));

import { registrarPagamentoCartao } from '../dados/comandos/formas';
import { useComandosForma } from './useFormasPagamento';

const DADOS = {
  id: '00000000-0000-4000-8000-000000000c01',
  formaId: '00000000-0000-4000-8000-000000000303',
  contaId: '00000000-0000-4000-8000-000000000202',
  valorCentavos: 50000,
  data: '2026-10-09',
};

function montar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidar = vi.spyOn(cliente, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useComandosForma(), { wrapper });
  const chaves = () =>
    invalidar.mock.calls.map(([filtro]) => (filtro as { queryKey?: unknown[] } | undefined)?.queryKey);
  return { result, invalidar, chaves };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('useComandosForma: registrar pagamento do cartão', () => {
  it('sucesso invalida contas e o resumo do mês, mas não as formas', async () => {
    vi.mocked(registrarPagamentoCartao).mockResolvedValue(DADOS.id as never);
    const { result, chaves } = montar();

    await act(() => result.current.registrarPagamentoCartao.mutateAsync(DADOS));

    expect(vi.mocked(registrarPagamentoCartao).mock.calls[0][0]).toEqual(DADOS);
    expect(chaves()).toContainEqual(['contas']);
    expect(chaves()).toContainEqual(['resumo_mes']);
    expect(chaves()).not.toContainEqual(['formas_pagamento']);
  });

  it('erro não invalida', async () => {
    vi.mocked(registrarPagamentoCartao).mockRejectedValue({ tipo: 'regra', codigo: 'registro_invalido' });
    const { result, invalidar } = montar();

    await act(async () => {
      await expect(result.current.registrarPagamentoCartao.mutateAsync(DADOS)).rejects.toMatchObject({
        tipo: 'regra',
        codigo: 'registro_invalido',
      });
    });

    expect(invalidar).not.toHaveBeenCalled();
  });
});
