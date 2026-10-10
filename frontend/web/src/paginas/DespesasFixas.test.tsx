import { readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DespesasFixas } from './DespesasFixas';
import { useComandosFixas } from '../ganchos/useComandosFixas';
import { useDespesasFixas } from '../ganchos/useDespesasFixas';
import { useOcorrenciasMes } from '../ganchos/useOcorrenciasMes';

const { mostrarAviso } = vi.hoisted(() => ({ mostrarAviso: vi.fn() }));

vi.mock('../ganchos/useOcorrenciasMes', () => ({ useOcorrenciasMes: vi.fn() }));
vi.mock('../ganchos/useDespesasFixas', () => ({ useDespesasFixas: vi.fn(), useDespesaFixa: vi.fn() }));
vi.mock('../ganchos/useComandosFixas', () => ({ useComandosFixas: vi.fn() }));
vi.mock('../ganchos/useDadosLancamento', () => ({ useDadosLancamento: vi.fn(() => consultaCarregando()) }));
vi.mock('../ganchos/useContexto', () => ({ useContexto: vi.fn(() => consultaCarregando()) }));
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
    data: undefined,
    error: erro,
    status: 'error',
    fetchStatus: 'idle',
    isPending: false,
    isLoading: false,
    isSuccess: false,
    isError: true,
    isFetching: false,
    dataUpdatedAt: 0,
    refetch: vi.fn(),
  };
}

// Serve tanto a quem chama a função quanto a quem usa mutate/mutateAsync.
function comandoSimulado() {
  const comando = vi.fn();
  Object.assign(comando, {
    mutateAsync: comando,
    mutate: (argumentos: unknown, opcoes?: { onSuccess?: (r: unknown) => void; onError?: (e: unknown) => void; onSettled?: () => void }) => {
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

function renderizarPagina(caminho = '/fixas?mes=2026-10') {
  const clienteConsulta = new QueryClient();
  return render(
    <QueryClientProvider client={clienteConsulta}>
      <MemoryRouter initialEntries={[caminho]}>
        <Routes>
          <Route
            path="/fixas"
            element={
              <>
                <DespesasFixas />
                <Local />
              </>
            }
          />
          <Route path="*" element={<Local />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const moeda = (texto: string) => new RegExp(`R\\$\\s${texto.replace(/\./g, '\\.')}`);
const ID_OCORRENCIA_ALUGUEL = '00000000-0000-4000-8000-000000000801';
const ID_OCORRENCIA_AGUA = '00000000-0000-4000-8000-000000000806';
const ID_ALUGUEL = '00000000-0000-4000-8000-000000000701';

let comandos: Record<string, ReturnType<typeof comandoSimulado>>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-09T15:00:00Z'));
  comandos = {
    salvarDespesaFixa: comandoSimulado(),
    encerrarDespesaFixa: comandoSimulado(),
    pagarOcorrencia: comandoSimulado(),
    desfazerPagamento: comandoSimulado(),
  };
  vi.mocked(useComandosFixas).mockReturnValue(comandos as never);
  vi.mocked(useOcorrenciasMes).mockReturnValue(consultaPronta(resposta('ocorrencias-mes')) as never);
  vi.mocked(useDespesasFixas).mockReturnValue(consultaPronta(resposta('despesas-fixas')) as never);
});

afterEach(() => {
  vi.useRealTimers();
  mostrarAviso.mockReset();
});

function cartaoOcorrencias() {
  const titulo = screen.getByRole('heading', { name: /Pagas: 4 de 7/ });
  return titulo.closest('section') as HTMLElement;
}

function itemDe(descricao: string) {
  const itens = within(cartaoOcorrencias()).getAllByRole('listitem');
  const item = itens.find((li) => within(li).queryByText(descricao, { exact: true }));
  if (!item) throw new Error(`item ${descricao} não encontrado`);
  return item;
}

describe('DespesasFixas: ocorrências do mês', () => {
  it('mostra o seletor de mês e o título com pagas, total e previsto a pagar da API', () => {
    renderizarPagina();

    expect(screen.getByText('Outubro de 2026')).toBeInTheDocument();
    const titulo = screen.getByRole('heading', { name: /Pagas: 4 de 7/ });
    expect(titulo).toHaveTextContent('Previsto a pagar');
    expect(titulo).toHaveTextContent(moeda('1.540,00'));
    expect(useOcorrenciasMes).toHaveBeenCalledWith('2026-10');
  });

  it('mantém a ordem da API: Internet atrasada primeiro, com "venceu 05/10"', () => {
    renderizarPagina();

    const itens = within(cartaoOcorrencias()).getAllByRole('listitem');
    expect(itens).toHaveLength(7);
    expect(itens[0]).toHaveTextContent('Internet');
    expect(itens[0]).toHaveTextContent('Contas da casa · venceu 05/10');
    expect(itens[0]).toHaveTextContent('Atrasada');
    expect(itens[0]).toHaveTextContent(moeda('119,90'));
    expect(itens[1]).toHaveTextContent('Moradia · vence 10/10');
    expect(itens[1]).toHaveTextContent('Pendente');
  });

  it('paga pelo outro membro mostra o valor efetivo e "Paga por Ana", sem ação', () => {
    renderizarPagina();

    const luz = itemDe('Luz');
    expect(luz).toHaveTextContent(moeda('187,40'));
    expect(luz).toHaveTextContent('Paga por Ana');
    expect(within(luz).queryByRole('button')).not.toBeInTheDocument();
    expect(within(luz).queryByRole('link')).not.toBeInTheDocument();
  });

  it('paga por mim mostra "Paga por você" e o botão "Desfazer pagamento: Água"', () => {
    renderizarPagina();

    const agua = itemDe('Água');
    expect(agua).toHaveTextContent(moeda('95,10'));
    expect(agua).toHaveTextContent('Paga por você');
    const botao = within(agua).getByRole('button', { name: 'Desfazer pagamento: Água' });
    expect(botao).toHaveTextContent('Desfazer pagamento');
  });

  it('"Marcar como paga" aponta para a folha da ocorrência no mesmo mês', () => {
    renderizarPagina();

    const link = screen.getByRole('link', { name: 'Marcar como paga: Aluguel' });
    expect(link).toHaveTextContent('Marcar como paga');
    expect(link).toHaveAttribute('href', `/fixas?mes=2026-10&pagar=${ID_OCORRENCIA_ALUGUEL}`);
    expect(screen.getByRole('link', { name: 'Marcar como paga: Internet' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Marcar como paga: Luz' })).not.toBeInTheDocument();
  });

  it('trocar o mês pelo seletor grava ?mes= e busca o novo mês', async () => {
    const usuario = userEvent.setup();
    renderizarPagina();

    await usuario.click(screen.getByRole('button', { name: 'Próximo mês: novembro de 2026' }));

    expect(screen.getByTestId('local')).toHaveTextContent('mes=2026-11');
    expect(useOcorrenciasMes).toHaveBeenLastCalledWith('2026-11');
  });
});

describe('DespesasFixas: desfazer pagamento', () => {
  it('abre o diálogo; Cancelar não chama o comando', async () => {
    const usuario = userEvent.setup();
    renderizarPagina();

    await usuario.click(screen.getByRole('button', { name: 'Desfazer pagamento: Água' }));
    const dialogo = screen.getByRole('alertdialog');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    expect(comandos.desfazerPagamento).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('confirmar chama desfazerPagamento com a ocorrência e mostra o aviso de sucesso', async () => {
    comandos.desfazerPagamento.mockResolvedValue(undefined);
    const usuario = userEvent.setup();
    renderizarPagina();

    await usuario.click(screen.getByRole('button', { name: 'Desfazer pagamento: Água' }));
    const dialogo = screen.getByRole('alertdialog');
    await usuario.click(within(dialogo).getByRole('button', { name: /desfazer/i }));

    await waitFor(() => expect(comandos.desfazerPagamento).toHaveBeenCalledTimes(1));
    expect(comandos.desfazerPagamento.mock.calls[0][0]).toBe(ID_OCORRENCIA_AGUA);
    await waitFor(() => expect(mostrarAviso).toHaveBeenCalledWith('sucesso', expect.any(String)));
  });

  it('erro de rede avisa e a lista continua igual', async () => {
    comandos.desfazerPagamento.mockRejectedValue({ tipo: 'rede' });
    const usuario = userEvent.setup();
    renderizarPagina();

    await usuario.click(screen.getByRole('button', { name: 'Desfazer pagamento: Água' }));
    await usuario.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /desfazer/i }));

    await waitFor(() => expect(mostrarAviso).toHaveBeenCalledWith('erro', expect.any(String)));
    expect(mostrarAviso).not.toHaveBeenCalledWith('sucesso', expect.anything());
    expect(itemDe('Água')).toHaveTextContent('Paga por você');
    expect(within(cartaoOcorrencias()).getAllByRole('listitem')).toHaveLength(7);
  });
});

describe('DespesasFixas: modelos', () => {
  it('lista os modelos ativos na ordem da API com link para o modelo e "Nova despesa fixa"', () => {
    renderizarPagina();

    const modelos = screen.getByRole('region', { name: 'Modelos' });
    const links = within(modelos).getAllByRole('link');
    const aluguel = links.find((a) => a.textContent?.includes('Aluguel'));
    expect(aluguel).toHaveTextContent('Moradia · dia 10');
    expect(aluguel).toHaveTextContent(moeda('1.200,00'));
    expect(aluguel?.getAttribute('href')).toMatch(new RegExp(`^/fixas/${ID_ALUGUEL}`));
    const nova = within(modelos).getByRole('link', { name: /Nova despesa fixa/ });
    expect(nova.getAttribute('href')).toMatch(/^\/fixas\/nova/);
  });

  it('modelo encerrado não aparece', () => {
    const fixas = resposta<Array<{ descricao: string }>>('despesas-fixas').map((f) =>
      f.descricao === 'Gás' ? { ...f, encerrada_em: '2026-09-30' } : f,
    );
    vi.mocked(useDespesasFixas).mockReturnValue(consultaPronta(fixas) as never);
    renderizarPagina();

    const modelos = screen.getByRole('region', { name: 'Modelos' });
    expect(within(modelos).queryByText('Gás')).not.toBeInTheDocument();
    expect(within(modelos).getByText('Condomínio')).toBeInTheDocument();
  });
});

describe('DespesasFixas: estados', () => {
  it('vazio: sem modelos e sem ocorrências mostra o estado vazio com "Nova despesa fixa"', () => {
    vi.mocked(useOcorrenciasMes).mockReturnValue(consultaPronta(resposta('ocorrencias-mes-vazio')) as never);
    vi.mocked(useDespesasFixas).mockReturnValue(consultaPronta(resposta('despesas-fixas-vazio')) as never);
    renderizarPagina();

    expect(screen.getByRole('heading', { name: 'Nenhuma despesa fixa cadastrada' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Cadastre as contas que se repetem todo mês (aluguel, luz, internet). O app cria uma ocorrência por mês e avisa quando atrasar.',
      ),
    ).toBeInTheDocument();
    const nova = screen.getByRole('link', { name: /Nova despesa fixa/ });
    expect(nova.getAttribute('href')).toMatch(/^\/fixas\/nova/);
    expect(screen.queryByRole('heading', { name: /Pagas:/ })).not.toBeInTheDocument();
  });

  it('carregando: mostra o texto de carregamento depois do atraso', async () => {
    vi.mocked(useOcorrenciasMes).mockReturnValue(consultaCarregando() as never);
    renderizarPagina();

    expect(await screen.findByText('Carregando as despesas fixas…', {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Pagas:/ })).not.toBeInTheDocument();
  });

  it('erro sem cache: estado de erro com "Tentar de novo" e sem a seção Modelos', async () => {
    const consulta = consultaComErro({ tipo: 'rede' });
    vi.mocked(useOcorrenciasMes).mockReturnValue(consulta as never);
    const usuario = userEvent.setup();
    renderizarPagina();

    expect(screen.getByRole('heading', { name: 'Não foi possível carregar' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Modelos' })).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /Tentar de novo/ }));
    expect(consulta.refetch).toHaveBeenCalled();
  });
});
