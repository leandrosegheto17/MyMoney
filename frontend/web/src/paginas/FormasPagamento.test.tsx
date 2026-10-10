import { readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormasPagamento } from './FormasPagamento';

const { buscarSimulado } = vi.hoisted(() => ({ buscarSimulado: vi.fn<() => Promise<unknown>>() }));

vi.mock('../ganchos/useFormasPagamento', async (importOriginal) => {
  const { useQuery } = await import('@tanstack/react-query');
  return {
    ...(await importOriginal<typeof import('../ganchos/useFormasPagamento')>()),
    useFormasPagamento: () => useQuery({ queryKey: ['formas_pagamento'], queryFn: buscarSimulado }),
  };
});

type Forma = Record<string, unknown> & { id: string; tipo: string; arquivada: boolean };

const lerResposta = (nome: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../.md/mockup/respostas/${nome}`, import.meta.url), 'utf8'));
const formas = () => lerResposta('formas-pagamento.json') as Forma[];

const ID_PIX = '00000000-0000-4000-8000-000000000301';
const ID_DEBITO = '00000000-0000-4000-8000-000000000302';
const ID_XP = '00000000-0000-4000-8000-000000000303';

function montar(dadosEmCache?: unknown) {
  const clienteConsulta = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (dadosEmCache !== undefined) clienteConsulta.setQueryData(['formas_pagamento'], dadosEmCache);
  const resultado = render(
    <QueryClientProvider client={clienteConsulta}>
      <MemoryRouter initialEntries={['/ajustes/formas']}>
        <FormasPagamento />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return resultado;
}

const grupo = (id: string) => {
  const titulo = document.getElementById(id);
  if (!titulo) throw new Error(`grupo ${id} não encontrado`);
  return titulo.closest('section') ?? titulo.parentElement!;
};

beforeEach(() => {
  buscarSimulado.mockReset();
});

describe('FormasPagamento (T17)', () => {
  it('agrupa por tipo na ordem Pix, Débito, Crédito com os ids do mockup', async () => {
    buscarSimulado.mockResolvedValue(formas());
    montar();

    await screen.findByRole('link', { name: /Pix Nubank/ });
    const titulos = screen.getAllByRole('heading', { level: 2 }).map((t) => t.textContent?.trim());
    expect(titulos).toEqual(['Pix', 'Débito', 'Crédito']);
    expect(document.getElementById('g-pix')).toHaveTextContent('Pix');
    expect(document.getElementById('g-deb')).toHaveTextContent('Débito');
    expect(document.getElementById('g-cred')).toHaveTextContent('Crédito');
    expect(screen.getByText('Só você vê as suas formas de pagamento.')).toBeInTheDocument();
  });

  it('Pix e Débito mostram "conta {nome}" e linkam para o detalhe', async () => {
    buscarSimulado.mockResolvedValue(formas());
    montar();

    const pix = await screen.findByRole('link', { name: /Pix Nubank/ });
    expect(pix).toHaveAttribute('href', `/ajustes/formas/${ID_PIX}`);
    expect(within(pix).getByText('conta Nubank')).toBeInTheDocument();
    expect(within(grupo('g-pix')).getByRole('link')).toBe(pix);

    const debito = within(grupo('g-deb')).getByRole('link', { name: /Débito Itaú/ });
    expect(debito).toHaveAttribute('href', `/ajustes/formas/${ID_DEBITO}`);
    expect(within(debito).getByText('conta Itaú')).toBeInTheDocument();
  });

  it('"Preferida" aparece só no Pix Nubank, com a estrela escondida da tecnologia assistiva', async () => {
    buscarSimulado.mockResolvedValue(formas());
    montar();

    const pix = await screen.findByRole('link', { name: /Pix Nubank/ });
    expect(within(pix).getByText('Preferida')).toBeInTheDocument();
    expect(screen.getAllByText('Preferida')).toHaveLength(1);
    for (const svg of pix.querySelectorAll('svg')) expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('crédito mostra "vence dia 10", "Neste mês" e "Próximos meses" vindos da view', async () => {
    buscarSimulado.mockResolvedValue(formas());
    montar();

    const xp = await screen.findByRole('link', { name: /Cartão de crédito XP/ });
    expect(xp).toHaveAttribute('href', `/ajustes/formas/${ID_XP}`);
    expect(within(grupo('g-cred')).getByRole('link')).toBe(xp);
    expect(within(xp).getByText('vence dia 10')).toBeInTheDocument();
    expect(within(xp).getByText('Neste mês R$ 1.284,60')).toBeInTheDocument();
    expect(within(xp).getByText('Próximos meses R$ 2.150,00')).toBeInTheDocument();
  });

  it('forma arquivada não aparece e o grupo sem itens some', async () => {
    const lista = formas().map((f) => (f.id === ID_DEBITO ? { ...f, arquivada: true } : f));
    buscarSimulado.mockResolvedValue(lista);
    montar();

    await screen.findByRole('link', { name: /Pix Nubank/ });
    expect(screen.queryByRole('link', { name: /Débito Itaú/ })).not.toBeInTheDocument();
    expect(document.getElementById('g-deb')).toBeNull();
    expect(screen.getAllByRole('heading', { level: 2 }).map((t) => t.textContent?.trim())).toEqual(['Pix', 'Crédito']);
  });

  it('cabeçalho tem voltar para Ajustes e "Nova" com a lista', async () => {
    buscarSimulado.mockResolvedValue(formas());
    montar();

    await screen.findByRole('link', { name: /Pix Nubank/ });
    expect(screen.getByRole('link', { name: 'Voltar para Ajustes' })).toHaveAttribute('href', '/ajustes');
    expect(screen.getByRole('link', { name: /^Nova$/ })).toHaveAttribute('href', '/ajustes/formas/nova');
  });

  it('sem formas mostra o vazio com "Nova forma" e sem "Nova" no cabeçalho', async () => {
    buscarSimulado.mockResolvedValue(lerResposta('formas-vazio.json'));
    montar();

    expect(await screen.findByRole('heading', { name: 'Nenhuma forma de pagamento' })).toBeInTheDocument();
    expect(
      screen.getByText('Cadastre um Pix, um débito ou um cartão de crédito para começar a lançar.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nova forma' })).toHaveAttribute('href', '/ajustes/formas/nova');
    expect(screen.queryByRole('link', { name: /^Nova$/ })).not.toBeInTheDocument();
  });

  it('só formas arquivadas também é vazio', async () => {
    buscarSimulado.mockResolvedValue(formas().map((f) => ({ ...f, arquivada: true })));
    montar();

    expect(await screen.findByRole('heading', { name: 'Nenhuma forma de pagamento' })).toBeInTheDocument();
  });

  it('erro sem cache mostra "Tentar de novo", que refaz a consulta', async () => {
    buscarSimulado.mockRejectedValue({ tipo: 'rede' });
    montar();

    const tentar = await screen.findByRole('button', { name: /Tentar de novo/ });
    buscarSimulado.mockResolvedValue(formas());
    fireEvent.click(tentar);

    expect(await screen.findByRole('link', { name: /Pix Nubank/ })).toBeInTheDocument();
    expect(buscarSimulado).toHaveBeenCalledTimes(2);
  });

  it('erro com cache mostra a faixa "Mostrando dados de …" e a lista guardada', async () => {
    buscarSimulado.mockRejectedValue({ tipo: 'rede' });
    montar(formas());

    expect(await screen.findByText(/Mostrando dados de/)).toBeInTheDocument();
    await waitFor(() => expect(buscarSimulado).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: /Pix Nubank/ })).toBeInTheDocument();
  });
});
