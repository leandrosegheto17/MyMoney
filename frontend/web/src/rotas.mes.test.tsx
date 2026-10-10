import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AreaAutenticada } from './paginas/AreaAutenticada';

const lerResposta = (nome: string) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`../../../.md/mockup/respostas/${nome}`, import.meta.url)), 'utf8'),
  );

const sessao = {
  access_token: 'token-de-teste',
  user: lerResposta('auth-usuario.json'),
};

vi.mock('./dados/sessao', () => ({
  obterSessao: vi.fn(async () => sessao),
  ouvirSessao: vi.fn((cb: (s: unknown) => void) => {
    cb(sessao);
    return () => {};
  }),
  entrar: vi.fn(),
  sair: vi.fn(),
  sairDeTodos: vi.fn(),
  pedirRedefinicao: vi.fn(),
  salvarNovaSenha: vi.fn(),
}));

vi.mock('./dados/consultas/contexto', () => ({
  buscarContexto: vi.fn(async () => lerResposta('contexto.json')),
}));

function montar(entrada: string) {
  const roteador = createMemoryRouter(
    [
      {
        path: '/',
        element: <AreaAutenticada />,
        children: [
          { index: true, element: <p>Página Início</p> },
          { path: 'lancamentos', element: <p>Página Lançamentos</p> },
          { path: 'metas', element: <p>Página Metas</p> },
        ],
      },
      { path: '/entrar', element: <p>Página Entrar</p> },
    ],
    { initialEntries: [entrada] },
  );
  const consulta = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={consulta}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
}

describe('mês levado entre telas pela navegação', () => {
  it('em /lancamentos?mes=2026-08, o Início aponta para /?mes=2026-08', async () => {
    montar('/lancamentos?mes=2026-08');
    await screen.findByText('Página Lançamentos');

    const inicios = screen.getAllByRole('link', { name: 'Início' });
    expect(inicios.length).toBeGreaterThan(0);
    for (const link of inicios) expect(link).toHaveAttribute('href', '/?mes=2026-08');
  });

  it('Lançamentos também leva o mês; Metas não', async () => {
    montar('/lancamentos?mes=2026-08');
    await screen.findByText('Página Lançamentos');

    for (const link of screen.getAllByRole('link', { name: 'Lançamentos' })) {
      expect(link).toHaveAttribute('href', '/lancamentos?mes=2026-08');
    }
    for (const link of screen.getAllByRole('link', { name: 'Metas' })) {
      expect(link.getAttribute('href')).not.toContain('mes=');
    }
  });
});
