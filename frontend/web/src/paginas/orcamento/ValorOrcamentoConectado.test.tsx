import { readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Orcamento } from '../Orcamento';
import { useComandosOrcamento } from '../../ganchos/useComandosOrcamento';
import { useOrcamentoMes } from '../../ganchos/useOrcamentoMes';

const { mostrarAviso } = vi.hoisted(() => ({ mostrarAviso: vi.fn() }));

vi.mock('../../ganchos/useOrcamentoMes', () => ({ useOrcamentoMes: vi.fn() }));
vi.mock('../../ganchos/useComandosOrcamento', () => ({ useComandosOrcamento: vi.fn() }));
vi.mock('../../componentes/base/useAviso', () => ({ useAviso: () => ({ mostrar: mostrarAviso }) }));

const RESPOSTAS = new URL('../../../../../.md/mockup/respostas/', import.meta.url);

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

function renderizarPagina(caminho: string) {
  const clienteConsulta = new QueryClient();
  const espiaInvalidar = vi.spyOn(clienteConsulta, 'invalidateQueries');
  render(
    <QueryClientProvider client={clienteConsulta}>
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
  return { espiaInvalidar };
}

const ID_CONTAS_DA_CASA = '00000000-0000-4000-8000-000000000404';
const ID_MERCADO = '00000000-0000-4000-8000-000000000401';
const CAMINHO_CONTAS = `/orcamento?mes=2026-10&escopo=casa&editar=${ID_CONTAS_DA_CASA}`;
const SEM_CONEXAO = /^Sem conexão\./;

const valorDe = (campo: HTMLElement) => (campo as HTMLInputElement).value;

let comandos: Record<string, ReturnType<typeof comandoSimulado>>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-09T15:00:00Z'));
  comandos = { definirOrcamento: comandoSimulado(), copiarOrcamento: comandoSimulado() };
  vi.mocked(useComandosOrcamento).mockReturnValue(comandos as never);
  vi.mocked(useOrcamentoMes).mockImplementation(((mes: string) =>
    consultaPronta(resposta(mes === '2026-11' ? 'orcamento-mes-vazio' : 'orcamento-mes'))) as never);
});

afterEach(() => {
  vi.useRealTimers();
  mostrarAviso.mockReset();
});

function folha(nome = 'Orçamento de Contas da casa') {
  return screen.getByRole('dialog', { name: nome });
}

async function digitarValor(usuario: ReturnType<typeof userEvent.setup>, digitos: string) {
  const campo = within(folha()).getByLabelText('Valor orçado');
  await usuario.clear(campo);
  if (digitos) await usuario.type(campo, digitos);
}

describe('Folha de valor do orçamento: abertura', () => {
  it('abre para a categoria do ?editar= com mês, escopo, realizado e o valor orçado', () => {
    renderizarPagina(CAMINHO_CONTAS);

    const dialogo = folha();
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveTextContent(/Outubro de 2026 · Casa · realizado R\$\s332,50/);
    expect(valorDe(within(dialogo).getByLabelText('Valor orçado'))).toMatch(/^R\$\s300,00$/);
    expect(within(dialogo).getByRole('button', { name: 'Remover orçamento desta categoria' })).toBeInTheDocument();
    expect(within(dialogo).getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  it('categoria sem orçamento abre sem "Remover"', () => {
    renderizarPagina(`/orcamento?mes=2026-11&escopo=casa&editar=${ID_MERCADO}`);

    const dialogo = folha('Orçamento de Mercado');
    expect(within(dialogo).getByLabelText('Valor orçado')).toBeInTheDocument();
    expect(
      within(dialogo).queryByRole('button', { name: 'Remover orçamento desta categoria' }),
    ).not.toBeInTheDocument();
  });

  it('id estranho não abre e tira o parâmetro', async () => {
    renderizarPagina('/orcamento?mes=2026-10&escopo=casa&editar=xyz');

    await waitFor(() => expect(screen.getByTestId('local')).not.toHaveTextContent('editar='));
    expect(screen.getByTestId('local')).toHaveTextContent('mes=2026-10');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('fechar pelo X tira o parâmetro', async () => {
    const usuario = userEvent.setup();
    renderizarPagina(CAMINHO_CONTAS);

    await usuario.click(within(folha()).getByRole('button', { name: 'Fechar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('local')).not.toHaveTextContent('editar=');
  });
});

describe('Folha de valor do orçamento: salvar e remover', () => {
  it('salvar envia mês, categoria e valor; sucesso avisa e tira o parâmetro', async () => {
    comandos.definirOrcamento.mockResolvedValue(undefined);
    const usuario = userEvent.setup();
    renderizarPagina(CAMINHO_CONTAS);

    await digitarValor(usuario, '45000');
    await usuario.click(within(folha()).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(comandos.definirOrcamento).toHaveBeenCalledTimes(1));
    expect(comandos.definirOrcamento.mock.calls[0][0]).toEqual({
      mes: '2026-10',
      categoriaId: ID_CONTAS_DA_CASA,
      valorCentavos: 45000,
    });
    await waitFor(() => expect(mostrarAviso).toHaveBeenCalledWith('sucesso', expect.any(String)));
    await waitFor(() => expect(screen.getByTestId('local')).not.toHaveTextContent('editar='));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('remover envia valor nulo', async () => {
    comandos.definirOrcamento.mockResolvedValue(undefined);
    const usuario = userEvent.setup();
    renderizarPagina(CAMINHO_CONTAS);

    await usuario.click(within(folha()).getByRole('button', { name: 'Remover orçamento desta categoria' }));

    await waitFor(() => expect(comandos.definirOrcamento).toHaveBeenCalledTimes(1));
    expect(comandos.definirOrcamento.mock.calls[0][0]).toEqual({
      mes: '2026-10',
      categoriaId: ID_CONTAS_DA_CASA,
      valorCentavos: null,
    });
    await waitFor(() => expect(mostrarAviso).toHaveBeenCalledWith('sucesso', expect.any(String)));
  });

  it('valor apagado mostra erro no campo e não chama', async () => {
    const usuario = userEvent.setup();
    renderizarPagina(CAMINHO_CONTAS);

    await digitarValor(usuario, '');
    await usuario.click(within(folha()).getByRole('button', { name: 'Salvar' }));

    expect(within(folha()).getByText(/Informe um valor maior que zero/)).toBeInTheDocument();
    expect(within(folha()).getByLabelText('Valor orçado')).toHaveAttribute('aria-invalid', 'true');
    expect(comandos.definirOrcamento).not.toHaveBeenCalled();
  });
});

describe('Folha de valor do orçamento: erros', () => {
  it('sem rede: aviso de topo, valor mantido, "Tentar de novo" reenvia', async () => {
    comandos.definirOrcamento.mockRejectedValueOnce({ tipo: 'rede' }).mockResolvedValueOnce(undefined);
    const usuario = userEvent.setup();
    renderizarPagina(CAMINHO_CONTAS);

    await digitarValor(usuario, '45000');
    await usuario.click(within(folha()).getByRole('button', { name: 'Salvar' }));

    const alerta = await within(folha()).findByRole('alert');
    expect(alerta).toHaveTextContent(SEM_CONEXAO);
    expect(valorDe(within(folha()).getByLabelText('Valor orçado'))).toMatch(/450,00$/);
    expect(screen.getByTestId('local')).toHaveTextContent(`editar=${ID_CONTAS_DA_CASA}`);

    await usuario.click(within(folha()).getByRole('button', { name: 'Tentar de novo' }));

    await waitFor(() => expect(comandos.definirOrcamento).toHaveBeenCalledTimes(2));
    expect(comandos.definirOrcamento.mock.calls[1][0]).toEqual(comandos.definirOrcamento.mock.calls[0][0]);
    expect(comandos.definirOrcamento.mock.calls[1][0]).toMatchObject({ valorCentavos: 45000 });
  });

  it('valor_invalido do servidor aparece no campo', async () => {
    comandos.definirOrcamento.mockRejectedValue({ tipo: 'regra', codigo: 'valor_invalido' });
    const usuario = userEvent.setup();
    renderizarPagina(CAMINHO_CONTAS);

    await digitarValor(usuario, '45000');
    await usuario.click(within(folha()).getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(within(folha()).getByLabelText('Valor orçado')).toHaveAttribute('aria-invalid', 'true'),
    );
    expect(mostrarAviso).not.toHaveBeenCalledWith('sucesso', expect.anything());
  });

  it('registro_invalido mostra o aviso de topo e invalida orcamento_mes', async () => {
    comandos.definirOrcamento.mockRejectedValue({ tipo: 'regra', codigo: 'registro_invalido' });
    const usuario = userEvent.setup();
    const { espiaInvalidar } = renderizarPagina(CAMINHO_CONTAS);

    await usuario.click(within(folha()).getByRole('button', { name: 'Salvar' }));

    expect(await within(folha()).findByRole('alert')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        espiaInvalidar.mock.calls.some(
          ([filtro]) => (filtro as { queryKey?: readonly unknown[] } | undefined)?.queryKey?.[0] === 'orcamento_mes',
        ),
      ).toBe(true),
    );
  });
});
