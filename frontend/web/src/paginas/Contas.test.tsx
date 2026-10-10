import { readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Contas } from './Contas';

const { buscarSimulado } = vi.hoisted(() => ({ buscarSimulado: vi.fn<() => Promise<unknown>>() }));

vi.mock('../ganchos/useContas', async (importOriginal) => {
  const { useQuery } = await import('@tanstack/react-query');
  return {
    ...(await importOriginal<typeof import('../ganchos/useContas')>()),
    useContas: () => useQuery({ queryKey: ['contas'], queryFn: buscarSimulado }),
  };
});

const lerResposta = (nome: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../.md/mockup/respostas/${nome}`, import.meta.url), 'utf8'));

const CONTA_ARQUIVADA = {
  id: '00000000-0000-4000-8000-000000000209',
  nome: 'Poupança antiga',
  saldo_inicial_centavos: 0,
  saldo_centavos: 0,
  arquivada: true,
};

function montar(dadosEmCache?: unknown) {
  const clienteConsulta = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (dadosEmCache !== undefined) clienteConsulta.setQueryData(['contas'], dadosEmCache);
  render(
    <QueryClientProvider client={clienteConsulta}>
      <MemoryRouter initialEntries={['/ajustes/contas']}>
        <Contas />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  buscarSimulado.mockReset();
});

describe('Contas (T15)', () => {
  it('lista as contas com nome, saldo e link para o detalhe', async () => {
    buscarSimulado.mockResolvedValue(lerResposta('contas.json'));
    montar();

    const nubank = await screen.findByRole('link', { name: /Nubank/ });
    expect(nubank).toHaveAttribute('href', '/ajustes/contas/00000000-0000-4000-8000-000000000201');
    expect(within(nubank).getByText('R$ 3.214,85')).toBeInTheDocument();

    const itau = screen.getByRole('link', { name: /Itaú/ });
    expect(itau).toHaveAttribute('href', '/ajustes/contas/00000000-0000-4000-8000-000000000202');
    expect(within(itau).getByText('R$ 1.090,00')).toBeInTheDocument();

    expect(screen.getByText('Só você vê as suas contas e saldos.')).toBeInTheDocument();
  });

  it('cabeçalho tem voltar para Ajustes e "Nova" com a lista', async () => {
    buscarSimulado.mockResolvedValue(lerResposta('contas.json'));
    montar();

    await screen.findByRole('link', { name: /Nubank/ });
    expect(screen.getByRole('heading', { level: 1, name: 'Contas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para Ajustes' })).toHaveAttribute('href', '/ajustes');
    expect(screen.getByRole('link', { name: /^Nova$/ })).toHaveAttribute('href', '/ajustes/contas/nova');
  });

  it('interruptor "Mostrar arquivadas" começa desligado', async () => {
    buscarSimulado.mockResolvedValue(lerResposta('contas.json'));
    montar();

    const interruptor = await screen.findByRole('switch', { name: 'Mostrar arquivadas' });
    expect(interruptor).not.toBeChecked();
  });

  it('conta arquivada some e aparece ao ligar o interruptor, marcada como "Arquivada"', async () => {
    buscarSimulado.mockResolvedValue([...(lerResposta('contas.json') as object[]), CONTA_ARQUIVADA]);
    montar();

    await screen.findByRole('link', { name: /Nubank/ });
    expect(screen.queryByRole('link', { name: /Poupança antiga/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: 'Mostrar arquivadas' }));

    const arquivada = await screen.findByRole('link', { name: /Poupança antiga/ });
    expect(within(arquivada).getByText('Arquivada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Nubank/ })).toBeInTheDocument();
  });

  it('sem nenhuma conta mostra o vazio com "Nova conta" e sem "Nova" no cabeçalho', async () => {
    buscarSimulado.mockResolvedValue(lerResposta('contas-vazio.json'));
    montar();

    expect(await screen.findByRole('heading', { name: 'Nenhuma conta cadastrada' })).toBeInTheDocument();
    expect(screen.getByText('Cadastre suas contas correntes para acompanhar o saldo. Só você vê.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nova conta' })).toHaveAttribute('href', '/ajustes/contas/nova');
    expect(screen.queryByRole('link', { name: /^Nova$/ })).not.toBeInTheDocument();
  });

  it('só arquivadas e interruptor desligado também é vazio', async () => {
    buscarSimulado.mockResolvedValue([CONTA_ARQUIVADA]);
    montar();

    expect(await screen.findByRole('heading', { name: 'Nenhuma conta cadastrada' })).toBeInTheDocument();
  });

  it('erro sem cache mostra "Tentar de novo", que refaz a consulta', async () => {
    buscarSimulado.mockRejectedValue({ tipo: 'rede' });
    montar();

    const tentar = await screen.findByRole('button', { name: /Tentar de novo/ });
    expect(screen.getByRole('heading', { name: 'Não foi possível carregar' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Nova$/ })).not.toBeInTheDocument();

    buscarSimulado.mockResolvedValue(lerResposta('contas.json'));
    fireEvent.click(tentar);

    expect(await screen.findByRole('link', { name: /Nubank/ })).toBeInTheDocument();
    expect(buscarSimulado).toHaveBeenCalledTimes(2);
  });

  it('erro com cache mostra a faixa "Mostrando dados de …" e a lista guardada', async () => {
    buscarSimulado.mockRejectedValue({ tipo: 'rede' });
    montar(lerResposta('contas.json'));

    expect(await screen.findByText(/Mostrando dados de/)).toBeInTheDocument();
    await waitFor(() => expect(buscarSimulado).toHaveBeenCalled());
    expect(screen.getByRole('link', { name: /Nubank/ })).toBeInTheDocument();
  });
});
