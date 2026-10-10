import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarLancamentosMes } from '../dados/consultas/lancamentosMes';
import { useLancamentosMes } from './useLancamentosMes';

vi.mock('../dados/consultas/lancamentosMes', () => ({ buscarLancamentosMes: vi.fn() }));

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
  vi.mocked(buscarLancamentosMes).mockReset();
});

describe('useLancamentosMes', () => {
  it('busca o mês com os filtros e guarda em ["lancamentos_mes", mês, filtros]', async () => {
    vi.mocked(buscarLancamentosMes).mockResolvedValue(resposta('lancamentos-mes') as never);
    const { clienteConsulta, envoltorio } = criarAmbiente();
    const filtros = { escopo: 'individual' as const, variavel: true as const };

    const { result } = renderHook(() => useLancamentosMes('2026-10', filtros), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(resposta('lancamentos-mes'));
    expect(buscarLancamentosMes).toHaveBeenCalledWith(expect.objectContaining({ mes: '2026-10', ...filtros }));
    expect(clienteConsulta.getQueryData(['lancamentos_mes', '2026-10', filtros])).toEqual(
      resposta('lancamentos-mes'),
    );
  });

  it('trocar o filtro mantém os dados anteriores até chegar a nova resposta', async () => {
    let resolverNova: (valor: unknown) => void = () => {};
    vi.mocked(buscarLancamentosMes)
      .mockResolvedValueOnce(resposta('lancamentos-mes') as never)
      .mockReturnValueOnce(new Promise((r) => (resolverNova = r)) as never);
    const { envoltorio } = criarAmbiente();

    const { result, rerender } = renderHook(({ filtros }) => useLancamentosMes('2026-10', filtros), {
      wrapper: envoltorio,
      initialProps: { filtros: {} as Record<string, unknown> },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ filtros: { escopo: 'conjunto' } });

    await waitFor(() => expect(buscarLancamentosMes).toHaveBeenCalledTimes(2));
    expect(result.current.data).toEqual(resposta('lancamentos-mes'));
    expect(result.current.isPlaceholderData).toBe(true);

    resolverNova(resposta('lancamentos-mes-vazio'));
    await waitFor(() => expect(result.current.data).toEqual(resposta('lancamentos-mes-vazio')));
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it('erro de leitura fica exposto como ErroDados', async () => {
    vi.mocked(buscarLancamentosMes).mockRejectedValue({ tipo: 'rede' });
    const { envoltorio } = criarAmbiente();

    const { result } = renderHook(() => useLancamentosMes('2026-10', {}), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ tipo: 'rede' });
  });
});
