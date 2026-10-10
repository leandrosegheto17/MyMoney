import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarOcorrenciasMes } from '../dados/consultas/ocorrenciasMes';
import { useOcorrenciasMes } from './useOcorrenciasMes';

vi.mock('../dados/consultas/ocorrenciasMes', () => ({ buscarOcorrenciasMes: vi.fn() }));

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
  vi.mocked(buscarOcorrenciasMes).mockReset();
});

describe('useOcorrenciasMes', () => {
  it('busca o mês pedido e guarda na chave ocorrencias_mes + mês', async () => {
    vi.mocked(buscarOcorrenciasMes).mockResolvedValue(resposta('ocorrencias-mes') as never);
    const { clienteConsulta, envoltorio } = criarAmbiente();

    const { result } = renderHook(() => useOcorrenciasMes('2026-10'), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(resposta('ocorrencias-mes'));
    expect(buscarOcorrenciasMes).toHaveBeenCalledWith('2026-10');
    expect(clienteConsulta.getQueryData(['ocorrencias_mes', '2026-10'])).toEqual(resposta('ocorrencias-mes'));
  });

  it('trocar de mês não mantém os dados do mês anterior (a tela mostra o esqueleto)', async () => {
    vi.mocked(buscarOcorrenciasMes).mockResolvedValueOnce(resposta('ocorrencias-mes') as never);
    vi.mocked(buscarOcorrenciasMes).mockReturnValueOnce(new Promise(() => {}) as never);
    const { envoltorio } = criarAmbiente();

    const { result, rerender } = renderHook(({ mes }) => useOcorrenciasMes(mes), {
      wrapper: envoltorio,
      initialProps: { mes: '2026-10' },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ mes: '2026-11' });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it('expõe o erro traduzido', async () => {
    vi.mocked(buscarOcorrenciasMes).mockRejectedValue({ tipo: 'rede' });
    const { envoltorio } = criarAmbiente();

    const { result } = renderHook(() => useOcorrenciasMes('2026-10'), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ tipo: 'rede' });
  });
});
