import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useInicializarMembro } from './useInicializarMembro';

vi.mock('../dados/comandos/inicializarMembro', () => ({
  inicializarMembro: vi.fn(() => Promise.resolve()),
}));

const { inicializarMembro } = await import('../dados/comandos/inicializarMembro');

const USUARIO_A = '00000000-0000-4000-8000-0000000000a1';
const USUARIO_B = '00000000-0000-4000-8000-0000000000b2';

function montar() {
  const clienteConsulta = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidar = vi.spyOn(clienteConsulta, 'invalidateQueries');
  const envolver = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={clienteConsulta}>{children}</QueryClientProvider>
  );
  return { invalidar, envolver };
}

beforeEach(() => {
  vi.mocked(inicializarMembro).mockClear();
  vi.mocked(inicializarMembro).mockResolvedValue(undefined);
});

describe('useInicializarMembro', () => {
  it('chama inicializarMembro com o usuário da sessão e invalida categorias ao terminar', async () => {
    const { envolver, invalidar } = montar();

    renderHook(() => useInicializarMembro(USUARIO_A), { wrapper: envolver });

    await waitFor(() => expect(inicializarMembro).toHaveBeenCalledWith(USUARIO_A));
    await waitFor(() => expect(invalidar).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['categorias'] })));
  });

  it('re-renderizações com o mesmo usuário não chamam de novo', async () => {
    const { envolver } = montar();

    const { rerender } = renderHook(({ id }) => useInicializarMembro(id), {
      wrapper: envolver,
      initialProps: { id: USUARIO_A },
    });
    rerender({ id: USUARIO_A });
    rerender({ id: USUARIO_A });

    await waitFor(() => expect(inicializarMembro).toHaveBeenCalledTimes(1));
  });

  it('chama de novo quando o usuário muda', async () => {
    const { envolver } = montar();

    const { rerender } = renderHook(({ id }) => useInicializarMembro(id), {
      wrapper: envolver,
      initialProps: { id: USUARIO_A },
    });
    await waitFor(() => expect(inicializarMembro).toHaveBeenCalledTimes(1));

    rerender({ id: USUARIO_B });

    await waitFor(() => expect(inicializarMembro).toHaveBeenLastCalledWith(USUARIO_B));
    expect(inicializarMembro).toHaveBeenCalledTimes(2);
  });

  it('sem usuário não chama', async () => {
    const { envolver } = montar();

    renderHook(() => useInicializarMembro(undefined), { wrapper: envolver });

    await new Promise((r) => setTimeout(r, 20));
    expect(inicializarMembro).not.toHaveBeenCalled();
  });
});
