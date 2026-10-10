import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarDespesaFixa, buscarDespesasFixas } from '../dados/consultas/despesasFixas';
import { useDespesaFixa, useDespesasFixas } from './useDespesasFixas';

vi.mock('../dados/consultas/despesasFixas', () => ({
  buscarDespesasFixas: vi.fn(),
  buscarDespesaFixa: vi.fn(),
}));

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

const ID_ALUGUEL = '00000000-0000-4000-8000-000000000701';

afterEach(() => {
  vi.mocked(buscarDespesasFixas).mockReset();
  vi.mocked(buscarDespesaFixa).mockReset();
});

describe('useDespesasFixas', () => {
  it('guarda a lista na chave despesas_fixas', async () => {
    vi.mocked(buscarDespesasFixas).mockResolvedValue(resposta('despesas-fixas') as never);
    const { clienteConsulta, envoltorio } = criarAmbiente();

    const { result } = renderHook(() => useDespesasFixas(), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(resposta('despesas-fixas'));
    expect(clienteConsulta.getQueryData(['despesas_fixas'])).toEqual(resposta('despesas-fixas'));
  });
});

describe('useDespesaFixa', () => {
  it('guarda o modelo na chave despesas_fixas + id', async () => {
    const [aluguel] = resposta('despesa-fixa') as unknown[];
    vi.mocked(buscarDespesaFixa).mockResolvedValue(aluguel as never);
    const { clienteConsulta, envoltorio } = criarAmbiente();

    const { result } = renderHook(() => useDespesaFixa(ID_ALUGUEL), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(buscarDespesaFixa).toHaveBeenCalledWith(ID_ALUGUEL);
    expect(clienteConsulta.getQueryData(['despesas_fixas', ID_ALUGUEL])).toEqual(aluguel);
  });

  it('expõe registro_invalido do modelo inexistente', async () => {
    vi.mocked(buscarDespesaFixa).mockRejectedValue({ tipo: 'regra', codigo: 'registro_invalido' });
    const { envoltorio } = criarAmbiente();

    const { result } = renderHook(() => useDespesaFixa(ID_ALUGUEL), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ tipo: 'regra', codigo: 'registro_invalido' });
  });
});
