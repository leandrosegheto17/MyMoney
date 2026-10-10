import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lerResposta } from '../../test/apoio/fetchSimulado';
import { buscarContexto } from '../dados/consultas/contexto';
import { useContexto } from './useContexto';

vi.mock('../dados/consultas/contexto', () => ({ buscarContexto: vi.fn() }));

const CONTEXTO = lerResposta('contexto.json');

function envoltorio() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(buscarContexto).mockReset();
});

describe('useContexto', () => {
  it('começa carregando e entrega o contexto', async () => {
    vi.mocked(buscarContexto).mockResolvedValue(CONTEXTO as Awaited<ReturnType<typeof buscarContexto>>);
    const { result } = renderHook(() => useContexto(), { wrapper: envoltorio() });

    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(CONTEXTO);
    expect(buscarContexto).toHaveBeenCalledTimes(1);
  });

  it('expõe o erro traduzido', async () => {
    vi.mocked(buscarContexto).mockRejectedValue({ tipo: 'rede' });
    const { result } = renderHook(() => useContexto(), { wrapper: envoltorio() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ tipo: 'rede' });
  });
});
