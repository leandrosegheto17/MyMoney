import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DadosLancamento } from '@mymoney/contrato/respostas/dados-lancamento';
import type { ResumoMes } from '@mymoney/contrato/respostas/resumo-mes';
import { lerResposta } from '../../test/apoio/fetchSimulado';
import { usePendentes } from '../ganchos/usePendentes';
import { CasaTotal } from '../componentes/inicio/CasaTotal';
import { CasaQuemPagou } from '../componentes/inicio/CasaQuemPagou';
import { EuTotal } from '../componentes/inicio/EuTotal';
import { EuContas } from '../componentes/inicio/EuContas';
import { CasaFixas } from '../componentes/inicio/CasaFixas';
import { CasaOrcamento } from '../componentes/inicio/CasaOrcamento';
import { CasaPorCategoria } from '../componentes/inicio/CasaPorCategoria';
import { CasaResultado } from '../componentes/inicio/CasaResultado';
import { CasaMetas } from '../componentes/inicio/CasaMetas';
import { EuReceitas } from '../componentes/inicio/EuReceitas';
import { EuOrcamento } from '../componentes/inicio/EuOrcamento';
import { EuPorCategoria } from '../componentes/inicio/EuPorCategoria';
import { EuCartoes } from '../componentes/inicio/EuCartoes';
import { EuMetas } from '../componentes/inicio/EuMetas';
import { Inicio } from './Inicio';

const { buscarResumoMes, buscarDadosLancamento } = vi.hoisted(() => ({
  buscarResumoMes: vi.fn(),
  buscarDadosLancamento: vi.fn(),
}));

vi.mock('../dados/consultas/resumoMes', () => ({ buscarResumoMes }));
vi.mock('../dados/consultas/contexto', async () => {
  const { lerResposta: ler } = await import('../../test/apoio/fetchSimulado');
  return { buscarContexto: vi.fn(async () => ler('contexto.json')) };
});
vi.mock('../dados/consultas/dadosLancamento', () => ({
  buscarDadosLancamento,
  lerDadosDoAparelho: vi.fn(async () => undefined),
}));
vi.mock('../ganchos/usePendentes', () => ({ usePendentes: vi.fn() }));

vi.mock('../componentes/inicio/CasaTotal', () => ({ CasaTotal: vi.fn(() => null) }));
vi.mock('../componentes/inicio/CasaQuemPagou', () => ({ CasaQuemPagou: vi.fn(() => null) }));
vi.mock('../componentes/inicio/CasaFixas', () => ({ CasaFixas: vi.fn(() => null) }));
vi.mock('../componentes/inicio/CasaOrcamento', () => ({ CasaOrcamento: vi.fn(() => null) }));
vi.mock('../componentes/inicio/CasaPorCategoria', () => ({ CasaPorCategoria: vi.fn(() => null) }));
vi.mock('../componentes/inicio/CasaResultado', () => ({ CasaResultado: vi.fn(() => null) }));
vi.mock('../componentes/inicio/CasaMetas', () => ({ CasaMetas: vi.fn(() => null) }));
vi.mock('../componentes/inicio/EuTotal', () => ({ EuTotal: vi.fn(() => null) }));
vi.mock('../componentes/inicio/EuReceitas', () => ({ EuReceitas: vi.fn(() => null) }));
vi.mock('../componentes/inicio/EuOrcamento', () => ({ EuOrcamento: vi.fn(() => null) }));
vi.mock('../componentes/inicio/EuPorCategoria', () => ({ EuPorCategoria: vi.fn(() => null) }));
vi.mock('../componentes/inicio/EuContas', () => ({ EuContas: vi.fn(() => null) }));
vi.mock('../componentes/inicio/EuCartoes', () => ({ EuCartoes: vi.fn(() => null) }));
vi.mock('../componentes/inicio/EuMetas', () => ({ EuMetas: vi.fn(() => null) }));

const resumo = lerResposta<ResumoMes>('resumo-mes.json');
const dados = lerResposta<DadosLancamento>('dados-lancamento.json');
const semFormas = lerResposta<DadosLancamento>('dados-lancamento-sem-formas.json');

function pendentes(total: number) {
  vi.mocked(usePendentes).mockReturnValue({ total, aguardando: total, falhas: 0 } as never);
}

function navegar(rota = '/?mes=2026-10') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/', element: <Inicio instalado={false} /> }], {
    initialEntries: [rota],
  });
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { cliente, router };
}

function ultimasProps(componente: unknown) {
  const chamadas = vi.mocked(componente as (p: unknown) => null).mock.calls;
  return chamadas[chamadas.length - 1]?.[0] as Record<string, unknown>;
}

beforeEach(() => {
  vi.mocked(buscarResumoMes).mockResolvedValue(resumo as never);
  vi.mocked(buscarDadosLancamento).mockResolvedValue({ dados, doAparelho: false, salvoEm: Date.now() } as never);
  pendentes(0);
  vi.stubGlobal(
    'matchMedia',
    (consulta: string) =>
      ({
        matches: false,
        media: consulta,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('Inicio: consulta', () => {
  it('chama resumo_mes com o mês da URL', async () => {
    navegar('/?mes=2026-09');

    await waitFor(() => expect(buscarResumoMes).toHaveBeenCalledWith('2026-09'));
  });
});

describe('Inicio: carregando', () => {
  it('nada antes de 300 ms; depois aria-busy e o anúncio', async () => {
    vi.mocked(buscarResumoMes).mockImplementation(() => new Promise(() => {}));
    navegar();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    expect(await screen.findByText('Carregando o resumo de outubro…', {}, { timeout: 1000 })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
  });
});

describe('Inicio: erro', () => {
  it('503 sem cache: "Servidor indisponível" e o texto do mockup', async () => {
    vi.mocked(buscarResumoMes).mockRejectedValue({ tipo: 'indisponivel' });
    navegar();

    expect(await screen.findByRole('heading', { name: 'Servidor indisponível' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Não foi possível carregar o resumo de outubro. Seus lançamentos de despesa ficam guardados no aparelho e serão enviados quando o servidor voltar.',
      ),
    ).toBeInTheDocument();
  });

  it('"Tentar de novo" refaz a consulta', async () => {
    const user = userEvent.setup();
    vi.mocked(buscarResumoMes).mockRejectedValue({ tipo: 'indisponivel' });
    navegar();
    await screen.findByRole('heading', { name: 'Servidor indisponível' });
    const antes = vi.mocked(buscarResumoMes).mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    await waitFor(() => expect(vi.mocked(buscarResumoMes).mock.calls.length).toBe(antes + 1));
  });

  it('erro com cache: faixa "Mostrando dados de HH:mm" e o conteúdo', async () => {
    const { cliente } = navegar();
    await screen.findByRole('heading', { name: /^Casa/ });

    vi.mocked(buscarResumoMes).mockRejectedValue({ tipo: 'rede' });
    await act(() => cliente.refetchQueries({ queryKey: ['resumo_mes'] }));

    expect(await screen.findByText(/Mostrando dados de \d{2}:\d{2}/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Casa/ })).toBeInTheDocument();
  });
});

describe('Inicio: cabeçalho e faixas', () => {
  it('seletor de mês e engrenagem de Ajustes', async () => {
    navegar();

    expect(await screen.findByRole('heading', { level: 1, name: 'Outubro de 2026' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ajustes' })).toBeInTheDocument();
  });

  it('fila vazia: sem o ícone de pendentes nem a faixa', async () => {
    navegar();
    await screen.findByRole('heading', { name: /^Casa/ });

    expect(screen.queryByRole('link', { name: /^Envios pendentes/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/aguardando envio/)).not.toBeInTheDocument();
  });

  it('com 2 itens: "Envios pendentes: 2" e a faixa no plural', async () => {
    pendentes(2);
    navegar();

    expect(await screen.findByRole('link', { name: 'Envios pendentes: 2' })).toBeInTheDocument();
    expect(screen.getByText(/2 lançamentos aguardando envio/)).toBeInTheDocument();
  });

  it('com 1 item: faixa no singular', async () => {
    pendentes(1);
    navegar();

    expect(
      await screen.findByText('1 lançamento aguardando envio. Ele fica guardado no aparelho.'),
    ).toBeInTheDocument();
  });

  it('sem rede: faixa offline', async () => {
    const espiao = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      navegar();
      expect(await screen.findByText(/^Sem conexão\./)).toBeInTheDocument();
    } finally {
      espiao.mockRestore();
    }
  });
});

describe('Inicio: blocos', () => {
  it('h2 "Casa" e "Eu · Leandro"', async () => {
    navegar();

    expect(await screen.findByRole('heading', { level: 2, name: 'Casa' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Eu · Leandro' })).toBeInTheDocument();
  });

  it('cada arquivo-filho recebe a fatia do resumo e o mês', async () => {
    navegar();
    await waitFor(() => expect(CasaTotal).toHaveBeenCalled());

    expect(ultimasProps(CasaTotal)).toMatchObject({ conjunto: resumo.conjunto, mes: '2026-10', mesVazio: false });
    expect(ultimasProps(CasaQuemPagou)).toMatchObject({ conjunto: resumo.conjunto, mes: '2026-10' });
    expect(ultimasProps(EuTotal)).toMatchObject({ individual: resumo.individual, mes: '2026-10', mesVazio: false });
    expect(ultimasProps(EuContas)).toMatchObject({ individual: resumo.individual, mes: '2026-10' });
    expect(ultimasProps(CasaQuemPagou)).not.toHaveProperty('individual');
    expect(ultimasProps(EuContas)).not.toHaveProperty('conjunto');
  });

  it('com resumo do mês, os 14 filhos são renderizados', async () => {
    navegar();
    await waitFor(() => expect(CasaTotal).toHaveBeenCalled());

    const filhos = [
      CasaTotal,
      CasaQuemPagou,
      CasaFixas,
      CasaOrcamento,
      CasaPorCategoria,
      CasaResultado,
      CasaMetas,
      EuTotal,
      EuReceitas,
      EuOrcamento,
      EuPorCategoria,
      EuContas,
      EuCartoes,
      EuMetas,
    ];
    filhos.forEach((f) => expect(f).toHaveBeenCalled());
  });
});

describe('Inicio: primeiros passos', () => {
  it('sem conta nem forma, mostra "Primeiros passos"', async () => {
    vi.mocked(buscarDadosLancamento).mockResolvedValue({
      dados: semFormas,
      doAparelho: false,
      salvoEm: Date.now(),
    } as never);
    navegar();

    expect(await screen.findByRole('region', { name: 'Primeiros passos' })).toBeInTheDocument();
  });

  it('com conta e forma, não mostra', async () => {
    navegar();
    await screen.findByRole('heading', { level: 2, name: 'Casa' });
    await waitFor(() => expect(buscarDadosLancamento).toHaveBeenCalled());

    expect(screen.queryByRole('region', { name: 'Primeiros passos' })).not.toBeInTheDocument();
  });
});
