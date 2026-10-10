import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecuperacaoSenha } from './useRecuperacaoSenha';

const simulados = vi.hoisted(() => ({ estadoRecuperacao: vi.fn() }));

vi.mock('../dados/sessao', () => ({
  estadoRecuperacao: simulados.estadoRecuperacao,
  salvarNovaSenha: vi.fn(),
  sair: vi.fn(),
  entrar: vi.fn(),
  sairDeTodos: vi.fn(),
  pedirRedefinicao: vi.fn(),
  obterSessao: vi.fn(),
  ouvirSessao: vi.fn(() => () => {}),
}));

function envolver() {
  const consulta = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={consulta}>{children}</QueryClientProvider>
  );
}

beforeEach(() => vi.clearAllMocks());

describe('useRecuperacaoSenha', () => {
  it.each(['pronta', 'expirado', 'sem_link'] as const)('expõe o estado %s do link', async (estado) => {
    simulados.estadoRecuperacao.mockResolvedValue(estado);
    const { result } = renderHook(() => useRecuperacaoSenha(), { wrapper: envolver() });

    await waitFor(() => expect(result.current.data).toBe(estado));
    expect(simulados.estadoRecuperacao).toHaveBeenCalledTimes(1);
  });
});
