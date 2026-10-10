import { readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useContexto } from '../ganchos/useContexto';
import { useDadosLancamento } from '../ganchos/useDadosLancamento';
import { useLancamentosMes } from '../ganchos/useLancamentosMes';
import { usePendentes } from '../ganchos/usePendentes';
import { Lancamentos } from './Lancamentos';

vi.mock('../ganchos/useLancamentosMes', () => ({ useLancamentosMes: vi.fn() }));
vi.mock('../ganchos/useContexto', () => ({ useContexto: vi.fn() }));
vi.mock('../ganchos/useDadosLancamento', () => ({ useDadosLancamento: vi.fn() }));
vi.mock('../ganchos/usePendentes', () => ({ usePendentes: vi.fn() }));

const RESPOSTAS = new URL('../../../../.md/mockup/respostas/', import.meta.url);
const resposta = (nome: string): unknown => JSON.parse(readFileSync(new URL(nome, RESPOSTAS), 'utf8'));

// Forma mínima de um UseQueryResult para os estados de leitura.
function resultado(parcial: Record<string, unknown>) {
  const temDados = parcial.data !== undefined;
  const erro = parcial.error ?? null;
  return {
    data: undefined,
    error: erro,
    isPending: !temDados && !erro,
    isLoading: !temDados && !erro,
    isError: Boolean(erro),
    isSuccess: temDados && !erro,
    isFetching: false,
    isPlaceholderData: false,
    status: erro ? 'error' : temDados ? 'success' : 'pending',
    fetchStatus: 'idle',
    dataUpdatedAt: temDados ? Date.now() : 0,
    refetch: vi.fn().mockResolvedValue({}),
    ...parcial,
  };
}

function SondaLocal() {
  const local = useLocation();
  return <output data-testid="local">{local.pathname + local.search}</output>;
}

function renderizar(rota = '/lancamentos?mes=2026-10') {
  const clienteConsulta = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={clienteConsulta}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route
            path="/lancamentos"
            element={
              <>
                <Lancamentos />
                <SondaLocal />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(useContexto).mockReturnValue(resultado({ data: resposta('contexto.json') }) as never);
  vi.mocked(useDadosLancamento).mockReturnValue(resultado({ data: resposta('dados-lancamento.json') }) as never);
  vi.mocked(usePendentes).mockReturnValue({ total: 0, aguardando: 0, falhas: 0, itens: [] } as never);
  vi.mocked(useLancamentosMes).mockReturnValue(resultado({ data: resposta('lancamentos-mes.json') }) as never);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('Lancamentos (T04): lista do mês', () => {
  it('o mês da URL chega ao gancho, com filtros vazios', () => {
    renderizar('/lancamentos?mes=2026-09');
    expect(useLancamentosMes).toHaveBeenCalledWith('2026-09', {});
  });

  it('seletor de mês com o prefixo oculto "Lançamentos de "', () => {
    renderizar();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Lançamentos de Outubro de 2026');
  });

  it('sucesso: total da API, grupos por dia e 15 linhas', () => {
    renderizar();
    expect(screen.getByText('R$ 846,30')).toBeInTheDocument();
    expect(screen.getByText(/· 15 lançamentos/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Sábado, 10 de outubro' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /R\$/ })).toHaveLength(15);
  });

  it('a página não soma: mostra o total que veio, mesmo diferente da soma dos itens', () => {
    const lista = resposta('lancamentos-mes.json') as Record<string, unknown>;
    vi.mocked(useLancamentosMes).mockReturnValue(
      resultado({ data: { ...lista, total_filtrado_centavos: 100, quantidade: 99 } }) as never,
    );
    renderizar();
    expect(screen.getByText('R$ 1,00')).toBeInTheDocument();
    expect(screen.getByText(/· 99 lançamentos/)).toBeInTheDocument();
  });

  it('carregando: nada aos 299 ms, esqueleto e "Carregando os lançamentos…" aos 300 ms', () => {
    vi.useFakeTimers();
    vi.mocked(useLancamentosMes).mockReturnValue(resultado({}) as never);
    renderizar();

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(screen.queryByText('Carregando os lançamentos…')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Carregando os lançamentos…');
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
  });

  it('carregando: os filtros já aparecem', () => {
    vi.useFakeTimers();
    vi.mocked(useLancamentosMes).mockReturnValue(resultado({}) as never);
    renderizar();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByRole('group', { name: 'Filtros' })).toBeInTheDocument();
  });

  it('erro sem cache: só o estado de erro, e "Tentar de novo" refaz a leitura', () => {
    const erro = resultado({ error: { tipo: 'rede' } });
    vi.mocked(useLancamentosMes).mockReturnValue(erro as never);
    renderizar();

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar');
    expect(screen.queryByRole('group', { name: 'Filtros' })).toBeNull();
    expect(screen.queryByText(/Total filtrado/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }));
    expect(erro.refetch).toHaveBeenCalled();
  });

  it('erro com cache: mantém a lista e mostra a faixa "Mostrando dados de …"', () => {
    vi.mocked(useLancamentosMes).mockReturnValue(
      resultado({ data: resposta('lancamentos-mes.json'), error: { tipo: 'rede' }, isError: true }) as never,
    );
    renderizar();
    expect(screen.getByText(/Mostrando dados de \d{2}:\d{2}/)).toBeInTheDocument();
    expect(screen.getByText('R$ 846,30')).toBeInTheDocument();
  });

  it('mês sem lançamentos e sem filtro: "Nenhum lançamento em outubro"', () => {
    vi.mocked(useLancamentosMes).mockReturnValue(
      resultado({
        data: { mes: '2026-10-01', filtros: {}, total_filtrado_centavos: 0, quantidade: 0, itens: [] },
      }) as never,
    );
    renderizar();
    expect(screen.getByRole('heading', { name: 'Nenhum lançamento em outubro' })).toBeInTheDocument();
    expect(screen.queryByText('Nenhum lançamento com esses filtros')).toBeNull();
  });
});

describe('Lancamentos (T04): filtros e fila', () => {
  it('os filtros da URL chegam ao gancho no formato da API', () => {
    renderizar('/lancamentos?mes=2026-10&escopo=casa&forma=00000000-0000-4000-8000-000000000302&variavel=1');
    expect(useLancamentosMes).toHaveBeenLastCalledWith(
      '2026-10',
      expect.objectContaining({
        escopo: 'conjunto',
        formaId: '00000000-0000-4000-8000-000000000302',
        variavel: true,
      }),
    );
  });

  it('vazio com filtro: "Nenhum lançamento com esses filtros" e "Limpar filtros" tira os filtros da URL', () => {
    vi.mocked(useLancamentosMes).mockReturnValue(resultado({ data: resposta('lancamentos-mes-vazio.json') }) as never);
    renderizar('/lancamentos?mes=2026-10&escopo=casa&forma=00000000-0000-4000-8000-000000000302');

    expect(screen.getByRole('heading', { name: 'Nenhum lançamento com esses filtros' })).toBeInTheDocument();
    expect(screen.getByText('Em outubro, você não pagou despesas da casa com o Débito Itaú.')).toBeInTheDocument();

    const regiaoVazio = screen.getByRole('heading', { name: 'Nenhum lançamento com esses filtros' })
      .parentElement as HTMLElement;
    const limpar = Array.from(regiaoVazio.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Limpar filtros',
    ) as HTMLButtonElement;
    fireEvent.click(limpar);

    expect(screen.getByTestId('local')).toHaveTextContent('/lancamentos?mes=2026-10');
    expect(screen.getByTestId('local').textContent).not.toMatch(/escopo|forma/);
  });

  it('itens da fila aparecem em "Aguardando envio (fora do total)" sem mudar o total', () => {
    vi.mocked(usePendentes).mockReturnValue({
      total: 1,
      aguardando: 1,
      falhas: 0,
      itens: [
        {
          id: 'item-1',
          dono: '00000000-0000-4000-8000-0000000000a1',
          args: {
            p_id: '00000000-0000-4000-8000-000000000999',
            p_valor_centavos: 1250,
            p_categoria_id: '00000000-0000-4000-8000-000000000411',
            p_forma_id: '00000000-0000-4000-8000-000000000301',
            p_parcelas: 1,
            p_data: '2026-10-09',
            p_descricao: 'Padaria',
          },
          exibicao: { categoria_nome: 'Almoço/Alimentação fora', forma_nome: 'Pix Nubank' },
          criadoEm: '2026-10-09T12:00:00-03:00',
          situacao: 'aguardando',
        },
      ],
    } as never);
    renderizar();

    expect(screen.getByRole('heading', { name: 'Aguardando envio (fora do total)' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Padaria.*aguardando envio/ })).toBeInTheDocument();
    expect(screen.getByText('R$ 846,30')).toBeInTheDocument();
    expect(screen.getByText(/· 15 lançamentos/)).toBeInTheDocument();
  });
});
