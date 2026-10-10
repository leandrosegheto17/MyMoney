import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEntrar } from './useEntrar';

const simulados = vi.hoisted(() => ({ entrar: vi.fn() }));

vi.mock('../dados/sessao', () => ({
  entrar: simulados.entrar,
  sair: vi.fn(),
  sairDeTodos: vi.fn(),
  pedirRedefinicao: vi.fn(),
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

describe('useEntrar', () => {
  it('sucesso: chama entrar(email, senha) uma vez', async () => {
    simulados.entrar.mockResolvedValue(undefined);
    const { result } = renderHook(() => useEntrar(), { wrapper: envolver() });

    act(() => result.current.mutate({ email: 'leandro@exemplo.com', senha: 'senha-correta-123' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(simulados.entrar).toHaveBeenCalledTimes(1);
    expect(simulados.entrar).toHaveBeenCalledWith('leandro@exemplo.com', 'senha-correta-123');
  });

  it('rede: expõe o erro de rede', async () => {
    simulados.entrar.mockRejectedValue({ tipo: 'rede' });
    const { result } = renderHook(() => useEntrar(), { wrapper: envolver() });

    act(() => result.current.mutate({ email: 'a@b.com', senha: 'x' }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ tipo: 'rede' });
  });

  it('credenciais: expõe o erro de regra', async () => {
    simulados.entrar.mockRejectedValue({ tipo: 'regra', codigo: 'credenciais_invalidas' });
    const { result } = renderHook(() => useEntrar(), { wrapper: envolver() });

    act(() => result.current.mutate({ email: 'a@b.com', senha: 'x' }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ tipo: 'regra', codigo: 'credenciais_invalidas' });
  });
});
