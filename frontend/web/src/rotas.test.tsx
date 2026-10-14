import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { rotas } from './rotas';

vi.mock('./ganchos/useSessao', () => ({ useSessao: () => ({ carregando: false, sessao: { user: { id: 'u1' } } }) }));
vi.mock('./ganchos/useContexto', () => ({ useContexto: () => ({ data: { mes_corrente: '2026-10-01' } }) }));
vi.mock('./ganchos/useInicializarMembro', () => ({ useInicializarMembro: vi.fn() }));
vi.mock('./ganchos/usePendentes', () => ({ usePendentes: () => ({ total: 0, aguardando: 0, falhas: 0 }) }));
vi.mock('./dados/consultas/resumoMes', () => ({ buscarResumoMes: () => new Promise(() => {}) }));

function montar(caminho: string) {
  const router = createMemoryRouter(rotas, { initialEntries: [caminho] });
  const clienteConsulta = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={clienteConsulta}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('rotas', () => {
  it('a rota / renderiza a Início com o seletor de mês e o <main>', async () => {
    montar('/?mes=2026-10');
    expect(await screen.findByRole('main')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Outubro de 2026' })).toBeInTheDocument();
  });
});
