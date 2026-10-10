import { readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Orcamento } from './Orcamento';
import { useComandosOrcamento } from '../ganchos/useComandosOrcamento';
import { useOrcamentoMes } from '../ganchos/useOrcamentoMes';

const { mostrarAviso } = vi.hoisted(() => ({ mostrarAviso: vi.fn() }));

vi.mock('../ganchos/useOrcamentoMes', () => ({ useOrcamentoMes: vi.fn() }));
vi.mock('../ganchos/useComandosOrcamento', () => ({ useComandosOrcamento: vi.fn() }));
vi.mock('../componentes/base/useAviso', () => ({ useAviso: () => ({ mostrar: mostrarAviso }) }));

const RESPOSTAS = new URL('../../../../.md/mockup/respostas/', import.meta.url);

function resposta<T = unknown>(nome: string): T {
  return JSON.parse(readFileSync(new URL(`${nome}.json`, RESPOSTAS), 'utf8'));
}

function consultaPronta<T>(data: T) {
  return {
    data,
    error: null,
    status: 'success',
    fetchStatus: 'idle',
    isPending: false,
    isLoading: false,
    isSuccess: true,
    isError: false,
    isFetching: false,
    dataUpdatedAt: Date.now(),
    refetch: vi.fn(),
  };
}

function consultaCarregando() {
  return {
    data: undefined,
    error: null,
    status: 'pending',
    fetchStatus: 'fetching',
    isPending: true,
    isLoading: true,
    isSuccess: false,
    isError: false,
    isFetching: true,
    dataUpdatedAt: 0,
    refetch: vi.fn(),
  };
}

function consultaComErro(erro: unknown) {
  return {
    ...consultaCarregando(),
    error: erro,
    status: 'error',
    fetchStatus: 'idle',
    isPending: false,
    isLoading: false,
    isError: true,
    isFetching: false,
  };
}

// Serve tanto a quem chama a função quanto a quem usa mutate/mutateAsync.
function comandoSimulado() {
  const comando = vi.fn();
  Object.assign(comando, {
    mutateAsync: comando,
    mutate: (
      argumentos: unknown,
      opcoes?: { onSuccess?: (r: unknown) => void; onError?: (e: unknown) => void; onSettled?: () => void },
    ) => {
      Promise.resolve()
        .then(() => comando(argumentos))
        .then(
          (r) => opcoes?.onSuccess?.(r),
          (e) => opcoes?.onError?.(e),
        )
        .finally(() => opcoes?.onSettled?.());
    },
    isPending: false,
    reset: vi.fn(),
  });
  return comando;
}

function Local() {
  const local = useLocation();
  return <output data-testid="local">{`${local.pathname}${local.search}`}</output>;
}

function renderizarPagina(caminho = '/orcamento?mes=2026-10') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[caminho]}>
        <Routes>
          <Route
            path="/orcamento"
            element={
              <>
                <Orcamento />
                <Local />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

type RespostaOrcamento = { sem_orcamento: Array<{ categoria_id: string; nome: string }> } & Record<string, unknown>;

const moeda = (texto: string) => texto.replace(/\./g, '\\.').replace(/R\$ /g, 'R\\$\\s');
const ID_CONTAS_DA_CASA = '00000000-0000-4000-8000-000000000404';

let comandos: Record<string, ReturnType<typeof comandoSimulado>>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-09T15:00:00Z'));
  comandos = { definirOrcamento: comandoSimulado(), copiarOrcamento: comandoSimulado() };
  vi.mocked(useComandosOrcamento).mockReturnValue(comandos as never);
  vi.mocked(useOrcamentoMes).mockReturnValue(consultaPronta(resposta('orcamento-mes')) as never);
});

afterEach(() => {
  vi.useRealTimers();
  mostrarAviso.mockReset();
});

describe('Orcamento: mês com orçamento', () => {
  it('mostra o mês no h1 e o escopo Casa marcado', () => {
    renderizarPagina();

    expect(screen.getByRole('heading', { level: 1, name: 'Orçamento de Outubro de 2026' })).toBeInTheDocument();
    const escopo = screen.getByRole('group', { name: 'Escopo do orçamento' });
    expect(within(escopo).getByRole('radio', { name: 'Casa' })).toBeChecked();
    expect(useOrcamentoMes).toHaveBeenCalledWith('2026-10', 'conjunto');
  });

  it('cartão total com selo, realizado de orçado, %, barra e resultado parcial', () => {
    renderizarPagina();

    const titulo = screen.getByRole('heading', { name: /Orçamento da casa/ });
    expect(titulo).toHaveTextContent('Dentro');
    const cartao = titulo.closest('section') as HTMLElement;
    expect(cartao).toHaveTextContent(new RegExp(moeda('R$ 2.418,70 de R$ 4.300,00')));
    expect(cartao).toHaveTextContent('56%');
    expect(within(cartao).getByRole('progressbar', { name: 'Orçamento da casa' })).toHaveAttribute(
      'aria-valuenow',
      '56',
    );
    expect(cartao).toHaveTextContent('Resultado da casa');
    expect(cartao).toHaveTextContent('parcial');
    expect(cartao).toHaveTextContent(new RegExp(moeda('R$ 1.881,30')));
  });

  it('lista as 5 categorias na ordem da API com o link de edição', () => {
    renderizarPagina();

    const porCategoria = screen.getByRole('region', { name: 'Por categoria' });
    const links = within(porCategoria).getAllByRole('link', { name: /^Editar orçamento de / });
    expect(links.map((a) => a.getAttribute('aria-label')?.split(':')[0])).toEqual([
      'Editar orçamento de Contas da casa',
      'Editar orçamento de Delivery/iFood do casal',
      'Editar orçamento de Mercado',
      'Editar orçamento de Outros da casa',
      'Editar orçamento de Moradia',
    ]);
    const contas = within(porCategoria).getByRole('link', {
      name: new RegExp(`^${moeda('Editar orçamento de Contas da casa: R$ 332,50 de R$ 300,00, 111%, estourado')}$`),
    });
    expect(contas).toHaveAttribute('href', `/orcamento?mes=2026-10&escopo=casa&editar=${ID_CONTAS_DA_CASA}`);
    expect(contas).toHaveTextContent('Estourado');
  });

  it('sem categorias sem orçamento mostra a linha de tudo orçado', () => {
    renderizarPagina();

    expect(screen.getByText('Todas as categorias de despesa da casa têm orçamento em outubro.')).toBeInTheDocument();
  });

  it('com categorias sem orçamento mostra a seção recolhida com "Definir" para cada uma', () => {
    const dados = resposta<RespostaOrcamento>('orcamento-mes');
    dados.sem_orcamento = [
      { categoria_id: '00000000-0000-4000-8000-000000000406', nome: 'Pets' },
      { categoria_id: '00000000-0000-4000-8000-000000000407', nome: 'Jardim' },
    ];
    vi.mocked(useOrcamentoMes).mockReturnValue(consultaPronta(dados) as never);
    renderizarPagina();

    expect(screen.getByText(/Sem orçamento/)).toBeInTheDocument();
    expect(
      screen.queryByText('Todas as categorias de despesa da casa têm orçamento em outubro.'),
    ).not.toBeInTheDocument();
    const definir = screen.getAllByRole('link', { name: /Definir/, hidden: true });
    expect(definir).toHaveLength(2);
    expect(definir[0].getAttribute('href')).toContain('editar=00000000-0000-4000-8000-000000000406');
    expect(definir[1].getAttribute('href')).toContain('editar=00000000-0000-4000-8000-000000000407');
  });
});

describe('Orcamento: escopo na URL', () => {
  it('trocar para Eu grava escopo=eu e busca o escopo individual', async () => {
    const usuario = userEvent.setup();
    renderizarPagina();

    await usuario.click(screen.getByRole('radio', { name: 'Eu' }));

    expect(screen.getByTestId('local')).toHaveTextContent('escopo=eu');
    expect(screen.getByTestId('local')).toHaveTextContent('mes=2026-10');
    expect(useOrcamentoMes).toHaveBeenLastCalledWith('2026-10', 'individual');
  });

  it('escopo desconhecido na URL vale Casa', () => {
    renderizarPagina('/orcamento?mes=2026-10&escopo=xyz');

    expect(screen.getByRole('radio', { name: 'Casa' })).toBeChecked();
    expect(useOrcamentoMes).toHaveBeenLastCalledWith('2026-10', 'conjunto');
  });
});

describe('Orcamento: mês vazio', () => {
  beforeEach(() => {
    vi.mocked(useOrcamentoMes).mockReturnValue(consultaPronta(resposta('orcamento-mes-vazio')) as never);
  });

  it('oferece copiar do mês anterior com o resumo do que será copiado', () => {
    renderizarPagina('/orcamento?mes=2026-11');

    expect(screen.getByRole('heading', { name: 'Sem orçamento da casa em novembro' })).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(
          `^${moeda('Copie os valores de outubro (R$ 4.300,00 em 5 categorias) e ajuste o que mudar.').replace(/[()]/g, '\\$&')}$`,
        ),
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar de outubro' })).toBeInTheDocument();
  });

  it('"Copiar de outubro" chama copiarOrcamento com o mês e o escopo da API e avisa', async () => {
    comandos.copiarOrcamento.mockResolvedValue(5);
    const usuario = userEvent.setup();
    renderizarPagina('/orcamento?mes=2026-11');

    await usuario.click(screen.getByRole('button', { name: 'Copiar de outubro' }));

    await waitFor(() => expect(comandos.copiarOrcamento).toHaveBeenCalledTimes(1));
    expect(comandos.copiarOrcamento.mock.calls[0][0]).toEqual({ mes: '2026-11', escopo: 'conjunto' });
    await waitFor(() => expect(mostrarAviso).toHaveBeenCalledWith('sucesso', expect.any(String)));
  });

  it('no escopo Eu a cópia vai com individual', async () => {
    comandos.copiarOrcamento.mockResolvedValue(5);
    const usuario = userEvent.setup();
    renderizarPagina('/orcamento?mes=2026-11&escopo=eu');

    await usuario.click(screen.getByRole('button', { name: 'Copiar de outubro' }));

    await waitFor(() => expect(comandos.copiarOrcamento).toHaveBeenCalledTimes(1));
    expect(comandos.copiarOrcamento.mock.calls[0][0]).toEqual({ mes: '2026-11', escopo: 'individual' });
  });

  it('erro de rede na cópia avisa e o estado continua igual', async () => {
    comandos.copiarOrcamento.mockRejectedValue({ tipo: 'rede' });
    const usuario = userEvent.setup();
    renderizarPagina('/orcamento?mes=2026-11');

    await usuario.click(screen.getByRole('button', { name: 'Copiar de outubro' }));

    await waitFor(() => expect(mostrarAviso).toHaveBeenCalledWith('erro', expect.any(String)));
    expect(mostrarAviso).not.toHaveBeenCalledWith('sucesso', expect.anything());
    expect(screen.getByRole('button', { name: 'Copiar de outubro' })).toBeEnabled();
    expect(screen.getByRole('heading', { name: 'Sem orçamento da casa em novembro' })).toBeInTheDocument();
  });
});

describe('Orcamento: estados de leitura', () => {
  it('carregando mostra o texto de carregamento com o segmentado visível', async () => {
    vi.mocked(useOrcamentoMes).mockReturnValue(consultaCarregando() as never);
    renderizarPagina();

    expect(screen.getByRole('radio', { name: 'Casa' })).toBeInTheDocument();
    expect(await screen.findByText('Carregando o orçamento…', {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it('erro sem cache mostra o estado de erro com "Tentar de novo"', async () => {
    const consulta = consultaComErro({ tipo: 'rede' });
    vi.mocked(useOrcamentoMes).mockReturnValue(consulta as never);
    const usuario = userEvent.setup();
    renderizarPagina();

    expect(screen.getByRole('heading', { name: 'Não foi possível carregar' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /Tentar de novo/ }));
    expect(consulta.refetch).toHaveBeenCalled();
  });
});
