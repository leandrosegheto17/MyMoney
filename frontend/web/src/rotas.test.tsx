import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
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

function arquivosDe(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivosDe(caminho) : [caminho];
  });
}

describe('rotas', () => {
  it('a rota / renderiza a Início com o seletor de mês e o <main>', async () => {
    montar('/?mes=2026-10');
    expect(await screen.findByRole('main')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Outubro de 2026' })).toBeInTheDocument();
  });

  it('a rota /ensaio-teclado existe e renderiza a página de ensaio', async () => {
    montar('/ensaio-teclado');
    expect(await screen.findByRole('heading', { name: 'Ensaio do teclado' })).toBeInTheDocument();
  });

  it('ensaio-teclado só aparece em paginas/ensaioTeclado/ e em rotas.tsx (fora da navegação)', () => {
    const raizSrc = fileURLToPath(new URL('.', import.meta.url));
    const ocorrencias = arquivosDe(raizSrc)
      .filter((arquivo) => !/\.test\.tsx?$/.test(arquivo))
      .filter((arquivo) => readFileSync(arquivo, 'utf8').includes('ensaio-teclado'))
      .map((arquivo) => relative(raizSrc, arquivo).split(sep).join('/'))
      .filter((rel) => rel !== 'rotas.tsx' && !rel.startsWith('paginas/ensaioTeclado/'));
    expect(ocorrencias).toEqual([]);
  });
});
