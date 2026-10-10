import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSair } from './useSair';

const simulados = vi.hoisted(() => ({ sair: vi.fn(), sairDeTodos: vi.fn() }));

vi.mock('../dados/sessao', () => ({
  sair: simulados.sair,
  sairDeTodos: simulados.sairDeTodos,
  entrar: vi.fn(),
  pedirRedefinicao: vi.fn(),
  salvarNovaSenha: vi.fn(),
  obterSessao: vi.fn(),
  ouvirSessao: vi.fn(() => () => {}),
}));

vi.mock('../dados/erros', async (original) => ({
  ...(await original<typeof import('../dados/erros')>()),
  traduzirErro: (e: unknown) => e,
}));

function montar() {
  const consulta = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  consulta.setQueryData(['dado-do-membro'], { valor: 1 });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={consulta}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useSair(), { wrapper });
  return { consulta, result };
}

const cacheLimpo = (consulta: QueryClient) => consulta.getQueryData(['dado-do-membro']) === undefined;

beforeEach(() => vi.clearAllMocks());

describe('useSair', () => {
  it('local: chama sair e limpa o cache', async () => {
    simulados.sair.mockResolvedValue(undefined);
    const { consulta, result } = montar();

    act(() => result.current.mutate('local'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(simulados.sair).toHaveBeenCalledTimes(1);
    expect(simulados.sairDeTodos).not.toHaveBeenCalled();
    expect(cacheLimpo(consulta)).toBe(true);
  });

  it('local com erro de rede: limpa o cache mesmo assim', async () => {
    simulados.sair.mockRejectedValue({ tipo: 'rede' });
    const { consulta, result } = montar();

    act(() => result.current.mutate('local'));

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(cacheLimpo(consulta)).toBe(true);
  });

  it('global: chama sairDeTodos e limpa o cache no sucesso', async () => {
    simulados.sairDeTodos.mockResolvedValue(undefined);
    const { consulta, result } = montar();

    act(() => result.current.mutate('global'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(simulados.sairDeTodos).toHaveBeenCalledTimes(1);
    expect(simulados.sair).not.toHaveBeenCalled();
    expect(cacheLimpo(consulta)).toBe(true);
  });

  it('global com erro de rede: não limpa o cache e expõe o erro', async () => {
    simulados.sairDeTodos.mockRejectedValue({ tipo: 'rede' });
    const { consulta, result } = montar();

    act(() => result.current.mutate('global'));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ tipo: 'rede' });
    expect(cacheLimpo(consulta)).toBe(false);
  });
});
