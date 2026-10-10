import { readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Categorias } from './Categorias';

const { buscarSimulado } = vi.hoisted(() => ({ buscarSimulado: vi.fn<() => Promise<unknown>>() }));

vi.mock('../ganchos/useCategorias', async (importOriginal) => {
  const { useQuery } = await import('@tanstack/react-query');
  return {
    ...(await importOriginal<typeof import('../ganchos/useCategorias')>()),
    useCategorias: () => useQuery({ queryKey: ['categorias'], queryFn: buscarSimulado }),
  };
});

type Categoria = { id: string; nome: string; tipo: string; escopo: string; variavel: boolean | null; arquivada: boolean };

const lerResposta = (nome: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../.md/mockup/respostas/${nome}`, import.meta.url), 'utf8'));
const categorias = () => lerResposta('categorias.json') as Categoria[];

function montar(caminho = '/ajustes/categorias?tipo=despesa') {
  const clienteConsulta = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const roteador = createMemoryRouter([{ path: '/ajustes/categorias', element: <Categorias /> }], {
    initialEntries: [caminho],
  });
  render(
    <QueryClientProvider client={clienteConsulta}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return roteador;
}

const grupo = (nome: RegExp) => screen.getByRole('heading', { level: 2, name: nome }).closest('section')!;
const nomesDosItens = (secao: HTMLElement) =>
  within(secao)
    .getAllByRole('link')
    .map((link) => link.querySelector('[class*="titulo"]')?.textContent?.trim() ?? link.textContent?.replace('variável', '').trim());

beforeEach(() => {
  buscarSimulado.mockReset();
});

describe('Categorias (T19): despesas', () => {
  it('mostra "Da casa" e "Minhas", nessa ordem, com 5 itens cada', async () => {
    buscarSimulado.mockResolvedValue(categorias());
    montar();

    await screen.findByRole('link', { name: /Mercado/ });
    const titulos = screen.getAllByRole('heading', { level: 2 }).map((t) => t.textContent?.trim());
    expect(titulos).toEqual(['Da casa · os dois veem', 'Minhas · só você vê']);
    expect(within(grupo(/Da casa/)).getAllByRole('link')).toHaveLength(5);
    expect(within(grupo(/Minhas/)).getAllByRole('link')).toHaveLength(5);
    expect(nomesDosItens(grupo(/Da casa/))).toEqual([
      'Mercado',
      'Delivery/iFood do casal',
      'Moradia',
      'Contas da casa',
      'Outros da casa',
    ]);
  });

  it('selo "variável" só nas categorias variáveis', async () => {
    buscarSimulado.mockResolvedValue(categorias());
    montar();

    await screen.findByRole('link', { name: /Mercado/ });
    const comSelo = screen
      .getAllByRole('link')
      .filter((link) => within(link).queryByText('variável'))
      .map((link) => link.textContent?.replace('variável', '').trim());
    expect(comSelo).toEqual([
      'Mercado',
      'Delivery/iFood do casal',
      'Almoço/Alimentação fora',
      'Delivery pessoal',
      'Transporte',
      'Lazer pessoal',
    ]);
  });

  it('cada item linka para o detalhe da categoria', async () => {
    buscarSimulado.mockResolvedValue(categorias());
    montar();

    expect(await screen.findByRole('link', { name: /Mercado/ })).toHaveAttribute(
      'href',
      '/ajustes/categorias/00000000-0000-4000-8000-000000000401',
    );
  });

  it('sem parâmetro e com parâmetro inválido começa em Despesas', async () => {
    buscarSimulado.mockResolvedValue(categorias());
    montar('/ajustes/categorias');
    expect(await screen.findByRole('radio', { name: 'Despesas' })).toBeChecked();
  });

  it('parâmetro fora de despesa|receita cai em Despesas', async () => {
    buscarSimulado.mockResolvedValue(categorias());
    montar('/ajustes/categorias?tipo=xyz');
    expect(await screen.findByRole('radio', { name: 'Despesas' })).toBeChecked();
    expect(await screen.findByRole('heading', { level: 2, name: /Da casa/ })).toBeInTheDocument();
  });

  it('cabeçalho tem voltar para Ajustes e "Nova" com a lista', async () => {
    buscarSimulado.mockResolvedValue(categorias());
    montar();

    await screen.findByRole('link', { name: /Mercado/ });
    expect(screen.getByRole('link', { name: 'Voltar para Ajustes' })).toHaveAttribute('href', '/ajustes');
    expect(screen.getByRole('link', { name: /^Nova$/ })).toHaveAttribute('href', '/ajustes/categorias/nova');
  });
});

describe('Categorias (T19): receitas', () => {
  it('trocar para Receitas mostra só "Minhas", sem selo, sem nova consulta, e grava ?tipo=receita', async () => {
    buscarSimulado.mockResolvedValue(categorias());
    const roteador = montar();

    await screen.findByRole('link', { name: /Mercado/ });
    fireEvent.click(screen.getByRole('radio', { name: 'Receitas' }));

    await waitFor(() => expect(screen.queryByRole('heading', { level: 2, name: /Da casa/ })).not.toBeInTheDocument());
    expect(screen.getAllByRole('heading', { level: 2 }).map((t) => t.textContent?.trim())).toEqual([
      'Minhas · só você vê',
    ]);
    expect(nomesDosItens(grupo(/Minhas/))).toEqual(['Salário', 'Extra', 'Outros']);
    expect(screen.queryByText('variável')).not.toBeInTheDocument();
    expect(new URLSearchParams(roteador.state.location.search).get('tipo')).toBe('receita');
    expect(buscarSimulado).toHaveBeenCalledTimes(1);
  });

  it('abrir com ?tipo=receita marca Receitas', async () => {
    buscarSimulado.mockResolvedValue(categorias());
    montar('/ajustes/categorias?tipo=receita');

    expect(await screen.findByRole('radio', { name: 'Receitas' })).toBeChecked();
    expect(await screen.findByRole('link', { name: /Salário/ })).toBeInTheDocument();
  });
});

describe('Categorias (T19): estados', () => {
  it('vazio em receita mostra o texto do mockup e "Nova categoria", com o seletor visível', async () => {
    buscarSimulado.mockResolvedValue(lerResposta('categorias-vazio.json'));
    montar('/ajustes/categorias?tipo=receita');

    expect(await screen.findByRole('heading', { name: 'Nenhuma categoria de receita ativa' })).toBeInTheDocument();
    expect(
      screen.getByText('Todas foram arquivadas. Crie uma nova ou mostre as arquivadas para reativar.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nova categoria' })).toHaveAttribute('href', '/ajustes/categorias/nova');
    expect(screen.getByRole('group', { name: 'Tipo de categoria' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Nova$/ })).not.toBeInTheDocument();
  });

  it('vazio em despesa troca o texto para "despesa"', async () => {
    buscarSimulado.mockResolvedValue(categorias().filter((c) => c.tipo === 'receita'));
    montar();

    expect(await screen.findByRole('heading', { name: 'Nenhuma categoria de despesa ativa' })).toBeInTheDocument();
  });

  it('carregando mantém o seletor de tipo visível', () => {
    buscarSimulado.mockReturnValue(new Promise(() => {}));
    montar();

    expect(screen.getByRole('group', { name: 'Tipo de categoria' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Despesas' })).toBeChecked();
  });

  it('arquivada some e volta, marcada "Arquivada", com o interruptor', async () => {
    const lista = categorias().map((c) => (c.nome === 'Moradia' ? { ...c, arquivada: true } : c));
    buscarSimulado.mockResolvedValue(lista);
    montar();

    await screen.findByRole('link', { name: /Mercado/ });
    expect(screen.queryByRole('link', { name: /Moradia/ })).not.toBeInTheDocument();
    const interruptor = screen.getByRole('switch', { name: 'Mostrar arquivadas' });
    expect(interruptor).not.toBeChecked();

    fireEvent.click(interruptor);

    const moradia = await screen.findByRole('link', { name: /Moradia/ });
    expect(within(moradia).getByText('Arquivada')).toBeInTheDocument();
  });

  it('erro sem cache mostra "Tentar de novo", que refaz a consulta', async () => {
    buscarSimulado.mockRejectedValue({ tipo: 'rede' });
    montar();

    const tentar = await screen.findByRole('button', { name: /Tentar de novo/ });
    buscarSimulado.mockResolvedValue(categorias());
    fireEvent.click(tentar);

    expect(await screen.findByRole('link', { name: /Mercado/ })).toBeInTheDocument();
    expect(buscarSimulado).toHaveBeenCalledTimes(2);
  });
});
