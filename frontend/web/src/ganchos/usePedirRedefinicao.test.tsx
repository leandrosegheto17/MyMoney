import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePedirRedefinicao } from './usePedirRedefinicao';

const simulados = vi.hoisted(() => ({ pedirRedefinicao: vi.fn() }));

vi.mock('../dados/sessao', () => ({
  entrar: vi.fn(),
  sair: vi.fn(),
  sairDeTodos: vi.fn(),
  pedirRedefinicao: simulados.pedirRedefinicao,
  salvarNovaSenha: vi.fn(),
  obterSessao: vi.fn(),
  ouvirSessao: vi.fn(() => () => {}),
}));

vi.mock('../dados/erros', async (original) => ({
  ...(await original<typeof import('../dados/erros')>()),
  traduzirErro: (e: unknown) => e,
}));

function envolver() {
  const consulta = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={consulta}>{children}</QueryClientProvider>
  );
}

beforeEach(() => vi.clearAllMocks());

describe('usePedirRedefinicao', () => {
  it('sucesso: chama pedirRedefinicao com o e-mail', async () => {
    simulados.pedirRedefinicao.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePedirRedefinicao(), { wrapper: envolver() });

    act(() => result.current.mutate('leandro@exemplo.com'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(simulados.pedirRedefinicao).toHaveBeenCalledTimes(1);
    expect(simulados.pedirRedefinicao).toHaveBeenCalledWith('leandro@exemplo.com');
  });

  it('e-mail desconhecido: a camada de dados responde igual, e o gancho também', async () => {
    simulados.pedirRedefinicao.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePedirRedefinicao(), { wrapper: envolver() });

    act(() => result.current.mutate('ninguem@exemplo.com'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isError).toBe(false);
  });

  it('rede: expõe o erro de rede', async () => {
    simulados.pedirRedefinicao.mockRejectedValue({ tipo: 'rede' });
    const { result } = renderHook(() => usePedirRedefinicao(), { wrapper: envolver() });

    act(() => result.current.mutate('leandro@exemplo.com'));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ tipo: 'rede' });
  });
});
