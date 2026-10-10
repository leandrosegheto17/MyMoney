import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarOrcamentoMes } from '../dados/consultas/orcamentoMes';
import { useOrcamentoMes } from './useOrcamentoMes';

vi.mock('../dados/consultas/orcamentoMes', () => ({ buscarOrcamentoMes: vi.fn() }));

const RESPOSTAS = new URL('../../../../.md/mockup/respostas/', import.meta.url);

function resposta(nome: string): unknown {
  return JSON.parse(readFileSync(new URL(`${nome}.json`, RESPOSTAS), 'utf8'));
}

function criarAmbiente() {
  const clienteConsulta = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={clienteConsulta}>{children}</QueryClientProvider>
  );
  return { clienteConsulta, envoltorio };
}

afterEach(() => {
  vi.mocked(buscarOrcamentoMes).mockReset();
});

describe('useOrcamentoMes', () => {
  it('a chave inclui mês e escopo', async () => {
    vi.mocked(buscarOrcamentoMes).mockResolvedValue(resposta('orcamento-mes') as never);
    const { clienteConsulta, envoltorio } = criarAmbiente();

    const { result } = renderHook(() => useOrcamentoMes('2026-10', 'conjunto'), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(buscarOrcamentoMes).toHaveBeenCalledWith('2026-10', 'conjunto');
    expect(clienteConsulta.getQueryData(['orcamento_mes', '2026-10', 'conjunto'])).toEqual(resposta('orcamento-mes'));
  });

  it('trocar o mês ou o escopo busca de novo sem manter os dados anteriores', async () => {
    vi.mocked(buscarOrcamentoMes).mockResolvedValueOnce(resposta('orcamento-mes') as never);
    vi.mocked(buscarOrcamentoMes).mockReturnValue(new Promise(() => {}) as never);
    const { envoltorio } = criarAmbiente();

    const { result, rerender } = renderHook(({ mes, escopo }) => useOrcamentoMes(mes, escopo), {
      wrapper: envoltorio,
      initialProps: { mes: '2026-10', escopo: 'conjunto' as 'conjunto' | 'individual' },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ mes: '2026-10', escopo: 'individual' });
    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(buscarOrcamentoMes).toHaveBeenLastCalledWith('2026-10', 'individual');

    rerender({ mes: '2026-11', escopo: 'individual' });
    await waitFor(() => expect(buscarOrcamentoMes).toHaveBeenLastCalledWith('2026-11', 'individual'));
  });

  it('expõe o erro traduzido', async () => {
    vi.mocked(buscarOrcamentoMes).mockRejectedValue({ tipo: 'indisponivel' });
    const { envoltorio } = criarAmbiente();

    const { result } = renderHook(() => useOrcamentoMes('2026-10', 'conjunto'), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ tipo: 'indisponivel' });
  });
});
