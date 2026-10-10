import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lerResposta } from '../../test/apoio/fetchSimulado';
import { buscarResumoMes } from '../dados/consultas/resumoMes';
import { useResumoMes } from './useResumoMes';

vi.mock('../dados/consultas/resumoMes', () => ({ buscarResumoMes: vi.fn() }));

const resumo = lerResposta('resumo-mes.json');

function montar(mesInicial: string) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
  const resultado = renderHook(({ mes }: { mes: string }) => useResumoMes(mes), {
    wrapper,
    initialProps: { mes: mesInicial },
  });
  return { cliente, ...resultado };
}

afterEach(() => {
  vi.mocked(buscarResumoMes).mockReset();
});

describe('useResumoMes', () => {
  it('guarda na chave ["resumo_mes", mes]', async () => {
    vi.mocked(buscarResumoMes).mockResolvedValue(resumo as never);
    const { result, cliente } = montar('2026-10');

    await waitFor(() => expect(result.current.data).toEqual(resumo));
    expect(buscarResumoMes).toHaveBeenCalledWith('2026-10');
    expect(cliente.getQueryData(['resumo_mes', '2026-10'])).toEqual(resumo);
  });

  it('trocar o mês refaz a consulta com o mês novo', async () => {
    vi.mocked(buscarResumoMes).mockResolvedValue(resumo as never);
    const { result, rerender } = montar('2026-10');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ mes: '2026-09' });

    await waitFor(() => expect(buscarResumoMes).toHaveBeenCalledWith('2026-09'));
    expect(buscarResumoMes).toHaveBeenCalledTimes(2);
  });

  it('erro chega ao gancho como ErroDados', async () => {
    vi.mocked(buscarResumoMes).mockRejectedValue({ tipo: 'indisponivel' });
    const { result } = montar('2026-10');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ tipo: 'indisponivel' });
  });
});
