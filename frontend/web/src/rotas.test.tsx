import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { rotas } from './rotas';

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
  it('a rota provisória / renderiza o <main> com "MyMoney"', async () => {
    montar('/');
    const principal = await screen.findByRole('main');
    expect(principal).toHaveTextContent('MyMoney');
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
