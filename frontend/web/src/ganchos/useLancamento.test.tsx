import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarLancamento } from '../dados/consultas/lancamento';
import { useLancamento } from './useLancamento';

vi.mock('../dados/consultas/lancamento', () => ({ buscarLancamento: vi.fn() }));

const RESPOSTAS = new URL('../../../../.md/mockup/respostas/', import.meta.url);

function resposta(nome: string): unknown {
  return JSON.parse(readFileSync(new URL(`${nome}.json`, RESPOSTAS), 'utf8'));
}

const ID_GELADEIRA = '00000000-0000-4000-8000-000000000520';

function criarAmbiente() {
  const clienteConsulta = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={clienteConsulta}>{children}</QueryClientProvider>
  );
  return { clienteConsulta, envoltorio };
}

afterEach(() => {
  vi.mocked(buscarLancamento).mockReset();
});

describe('useLancamento', () => {
  it('busca o detalhe e guarda em ["lancamento", id]', async () => {
    vi.mocked(buscarLancamento).mockResolvedValue(resposta('lancamento-pagador') as never);
    const { clienteConsulta, envoltorio } = criarAmbiente();

    const { result } = renderHook(() => useLancamento(ID_GELADEIRA), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(buscarLancamento).toHaveBeenCalledWith(ID_GELADEIRA);
    expect(clienteConsulta.getQueryData(['lancamento', ID_GELADEIRA])).toEqual(resposta('lancamento-pagador'));
  });

  it('registro_invalido fica exposto como erro', async () => {
    vi.mocked(buscarLancamento).mockRejectedValue({ tipo: 'regra', codigo: 'registro_invalido' });
    const { envoltorio } = criarAmbiente();

    const { result } = renderHook(() => useLancamento(ID_GELADEIRA), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ tipo: 'regra', codigo: 'registro_invalido' });
  });
});
