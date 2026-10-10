import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSalvarNovaSenha } from './useSalvarNovaSenha';

const simulados = vi.hoisted(() => ({ salvarNovaSenha: vi.fn(), sair: vi.fn() }));

vi.mock('../dados/sessao', () => ({
  salvarNovaSenha: simulados.salvarNovaSenha,
  sair: simulados.sair,
  entrar: vi.fn(),
  sairDeTodos: vi.fn(),
  pedirRedefinicao: vi.fn(),
  estadoRecuperacao: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
  simulados.sair.mockResolvedValue(undefined);
});

describe('useSalvarNovaSenha', () => {
  it('salva a senha e depois sai localmente', async () => {
    simulados.salvarNovaSenha.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSalvarNovaSenha(), { wrapper: envolver() });

    act(() => result.current.mutate('senha-nova-segura'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(simulados.salvarNovaSenha).toHaveBeenCalledWith('senha-nova-segura');
    expect(simulados.sair).toHaveBeenCalledTimes(1);
    expect(simulados.salvarNovaSenha.mock.invocationCallOrder[0]).toBeLessThan(
      simulados.sair.mock.invocationCallOrder[0],
    );
  });

  it('erro ao salvar: não sai e expõe o erro', async () => {
    simulados.salvarNovaSenha.mockRejectedValue({ tipo: 'regra', codigo: 'link_expirado' });
    const { result } = renderHook(() => useSalvarNovaSenha(), { wrapper: envolver() });

    act(() => result.current.mutate('senha-nova-segura'));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ tipo: 'regra', codigo: 'link_expirado' });
    expect(simulados.sair).not.toHaveBeenCalled();
  });

  it('rede: expõe o erro de rede', async () => {
    simulados.salvarNovaSenha.mockRejectedValue({ tipo: 'rede' });
    const { result } = renderHook(() => useSalvarNovaSenha(), { wrapper: envolver() });

    act(() => result.current.mutate('senha-nova-segura'));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ tipo: 'rede' });
  });
});
