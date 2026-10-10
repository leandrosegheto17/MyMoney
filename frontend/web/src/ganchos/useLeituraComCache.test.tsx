import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useLeituraComCache } from './useLeituraComCache';

type Dados = { total: number };

function preparar(queryFn: () => Promise<Dados>) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const envolver = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
  return renderHook(
    () => {
      const consulta = useQuery({ queryKey: ['teste'], queryFn });
      return { consulta, leitura: useLeituraComCache(consulta) };
    },
    { wrapper: envolver },
  );
}

describe('useLeituraComCache', () => {
  it('na 1ª carga fica em "carregando"', () => {
    const { result } = preparar(() => new Promise<Dados>(() => {}));
    expect(result.current.leitura.situacao).toBe('carregando');
    expect(result.current.leitura.dados).toBeUndefined();
  });

  it('com sucesso fica em "pronto" com os dados', async () => {
    const { result } = preparar(async () => ({ total: 10 }));
    await waitFor(() => expect(result.current.leitura.situacao).toBe('pronto'));
    expect(result.current.leitura.dados).toEqual({ total: 10 });
    expect(result.current.leitura.atualizadoEm).toBeGreaterThan(0);
  });

  it('refetch com erro fica em "cache" com os dados e a hora da carga anterior', async () => {
    const queryFn = vi.fn<() => Promise<Dados>>().mockResolvedValueOnce({ total: 10 });
    const { result } = preparar(queryFn);
    await waitFor(() => expect(result.current.leitura.situacao).toBe('pronto'));
    const horaDaPrimeira = result.current.leitura.atualizadoEm;

    queryFn.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await act(async () => {
      await result.current.consulta.refetch();
    });

    await waitFor(() => expect(result.current.leitura.situacao).toBe('cache'));
    expect(result.current.leitura.dados).toEqual({ total: 10 });
    expect(result.current.leitura.atualizadoEm).toBe(horaDaPrimeira);
  });

  it('erro sem dado fica em "erro"', async () => {
    const { result } = preparar(async () => {
      throw new TypeError('Failed to fetch');
    });
    await waitFor(() => expect(result.current.leitura.situacao).toBe('erro'));
    expect(result.current.leitura.dados).toBeUndefined();
  });

  it('devolve a hora como número, sem formatar', async () => {
    const { result } = preparar(async () => ({ total: 1 }));
    await waitFor(() => expect(result.current.leitura.situacao).toBe('pronto'));
    expect(typeof result.current.leitura.atualizadoEm).toBe('number');
  });
});
