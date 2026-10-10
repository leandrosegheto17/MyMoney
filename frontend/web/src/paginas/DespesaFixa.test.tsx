import { readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DespesaFixa } from './DespesaFixa';
import { useCategorias } from '../ganchos/useCategorias';
import { useComandosFixas } from '../ganchos/useComandosFixas';
import { useDespesaFixa } from '../ganchos/useDespesasFixas';

const { mostrarAviso } = vi.hoisted(() => ({ mostrarAviso: vi.fn() }));

vi.mock('../ganchos/useDespesasFixas', () => ({ useDespesasFixas: vi.fn(), useDespesaFixa: vi.fn() }));
vi.mock('../ganchos/useComandosFixas', () => ({ useComandosFixas: vi.fn() }));
vi.mock('../ganchos/useCategorias', () => ({ useCategorias: vi.fn(), useCategoria: vi.fn() }));
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

function renderizarPagina(caminho: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[caminho]}>
        <Routes>
          <Route path="/fixas/nova" element={<DespesaFixa />} />
          <Route path="/fixas/:id" element={<DespesaFixa />} />
          <Route path="/fixas" element={<Local />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID_ALUGUEL = '00000000-0000-4000-8000-000000000701';
const ID_MERCADO = '00000000-0000-4000-8000-000000000401';
const CAMINHO_EDICAO = `/fixas/${ID_ALUGUEL}?mes=2026-10`;
const CAMINHO_NOVA = '/fixas/nova?mes=2026-10';

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
  const [aluguel] = resposta<unknown[]>('despesa-fixa');
  vi.mocked(useDespesaFixa).mockReturnValue(consultaPronta(aluguel) as never);
  const categorias = [
    ...resposta<unknown[]>('categorias'),
    {
      id: '00000000-0000-4000-8000-000000000499',
      nome: 'Reforma antiga',
      tipo: 'despesa',
      escopo: 'conjunto',
      variavel: false,
      arquivada: true,
    },
  ];
  vi.mocked(useCategorias).mockReturnValue(consultaPronta(categorias) as never);
});

afterEach(() => {
  vi.useRealTimers();
  mostrarAviso.mockReset();
});

async function preencherNova(usuario: ReturnType<typeof userEvent.setup>, dia = '5') {
  await usuario.type(screen.getByLabelText('Descrição'), 'Internet');
  await usuario.type(screen.getByLabelText('Valor previsto'), '11990');
  const campoDia = screen.getByLabelText('Dia de vencimento');
  await usuario.clear(campoDia);
  await usuario.type(campoDia, dia);
}

describe('DespesaFixa: edição', () => {
  it('carrega o modelo com descrição, categoria, valor, dia, título e o botão Encerrar', () => {
    renderizarPagina(CAMINHO_EDICAO);

    expect(screen.getByRole('heading', { level: 1, name: 'Despesa fixa' })).toBeInTheDocument();
    expect(screen.getByLabelText('Descrição')).toHaveValue('Aluguel');
    expect(screen.getByLabelText('Categoria da casa')).toHaveDisplayValue('Moradia');
    expect((screen.getByLabelText('Valor previsto') as HTMLInputElement).value).toMatch(/^R\$\s1\.200,00$/);
    expect(screen.getByLabelText('Dia de vencimento')).toHaveValue('10');
    expect(screen.getByText('Pode ser ajustado na hora de pagar.')).toBeInTheDocument();
    expect(screen.getByText('De 1 a 31. Em meses mais curtos, vale o último dia.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Encerrar despesa fixa' })).toBeInTheDocument();
    expect(
      screen.getByText('Encerrar para de gerar ocorrências a partir do mês seguinte. O histórico continua.'),
    ).toBeInTheDocument();
  });

  it('o select só tem categorias de despesa da casa, ativas, na ordem da API', () => {
    renderizarPagina(CAMINHO_EDICAO);

    const opcoes = within(screen.getByLabelText('Categoria da casa')).getAllByRole('option');
    expect(opcoes.map((o) => o.textContent)).toEqual([
      'Mercado',
      'Delivery/iFood do casal',
      'Moradia',
      'Contas da casa',
      'Outros da casa',
    ]);
  });

  it('modelo inexistente ou alheio mostra "não existe mais"', () => {
    vi.mocked(useDespesaFixa).mockReturnValue(
      consultaComErro({ tipo: 'regra', codigo: 'registro_invalido' }) as never,
    );
    renderizarPagina(CAMINHO_EDICAO);

    expect(screen.getByText(/Esta despesa fixa não existe mais/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Descrição')).not.toBeInTheDocument();
  });
});

describe('DespesaFixa: nova', () => {
  it('título "Nova despesa fixa", sem Encerrar e com a 1ª categoria selecionada', () => {
    renderizarPagina(CAMINHO_NOVA);

    expect(screen.getByRole('heading', { level: 1, name: 'Nova despesa fixa' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Encerrar despesa fixa' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Categoria da casa')).toHaveDisplayValue('Mercado');
  });
});

describe('DespesaFixa: validação', () => {
  it('descrição vazia mostra o erro, marca o campo e leva o foco a ele', async () => {
    const usuario = userEvent.setup();
    renderizarPagina(CAMINHO_EDICAO);

    await usuario.clear(screen.getByLabelText('Descrição'));
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    const descricao = screen.getByLabelText('Descrição');
    expect(screen.getByText('Informe a descrição.')).toBeInTheDocument();
    expect(descricao).toHaveAttribute('aria-invalid', 'true');
    expect(descricao).toHaveFocus();
    expect(comandos.salvarDespesaFixa).not.toHaveBeenCalled();
  });

  it.each(['0', '32', '3a'])('dia "%s" mostra "Use um dia de 1 a 31." e a ajuda reduzida', async (dia) => {
    const usuario = userEvent.setup();
    renderizarPagina(CAMINHO_EDICAO);

    const campoDia = screen.getByLabelText('Dia de vencimento');
    await usuario.clear(campoDia);
    await usuario.type(campoDia, dia);
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText('Use um dia de 1 a 31.')).toBeInTheDocument();
    expect(screen.getByText('Em meses mais curtos, vale o último dia.')).toBeInTheDocument();
    expect(screen.queryByText('De 1 a 31. Em meses mais curtos, vale o último dia.')).not.toBeInTheDocument();
    expect(campoDia).toHaveAttribute('aria-invalid', 'true');
    expect(campoDia).toHaveAccessibleDescription(/Use um dia de 1 a 31\.\s*Em meses mais curtos, vale o último dia\./);
    expect(comandos.salvarDespesaFixa).not.toHaveBeenCalled();
  });

  it('dia 31 é aceito', async () => {
    comandos.salvarDespesaFixa.mockResolvedValue(ID_ALUGUEL);
    const usuario = userEvent.setup();
    renderizarPagina(CAMINHO_EDICAO);

    const campoDia = screen.getByLabelText('Dia de vencimento');
    await usuario.clear(campoDia);
    await usuario.type(campoDia, '31');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(comandos.salvarDespesaFixa).toHaveBeenCalledTimes(1));
    expect(comandos.salvarDespesaFixa.mock.calls[0][0]).toMatchObject({ id: ID_ALUGUEL, diaVencimento: 31 });
    expect(screen.queryByText('Use um dia de 1 a 31.')).not.toBeInTheDocument();
  });

  it('valor zero mostra o erro do valor e não salva', async () => {
    const usuario = userEvent.setup();
    renderizarPagina(CAMINHO_NOVA);

    await usuario.type(screen.getByLabelText('Descrição'), 'Internet');
    const campoDia = screen.getByLabelText('Dia de vencimento');
    await usuario.clear(campoDia);
    await usuario.type(campoDia, '5');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText(/Informe um valor maior que zero/)).toBeInTheDocument();
    expect(comandos.salvarDespesaFixa).not.toHaveBeenCalled();
  });
});

describe('DespesaFixa: salvar', () => {
  it('sem rede avisa e mantém os campos; a nova tentativa usa o mesmo id e volta à T06 do mês', async () => {
    comandos.salvarDespesaFixa.mockRejectedValueOnce({ tipo: 'rede' }).mockResolvedValueOnce('ok');
    const usuario = userEvent.setup();
    renderizarPagina(CAMINHO_NOVA);

    await preencherNova(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mostrarAviso).toHaveBeenCalledWith('erro', expect.any(String)));
    expect(screen.getByLabelText('Descrição')).toHaveValue('Internet');
    expect(screen.getByLabelText('Dia de vencimento')).toHaveValue('5');
    expect(screen.queryByTestId('local')).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(comandos.salvarDespesaFixa).toHaveBeenCalledTimes(2));
    const [primeira, segunda] = comandos.salvarDespesaFixa.mock.calls.map((c) => c[0]);
    expect(primeira.id).toMatch(UUID);
    expect(segunda.id).toBe(primeira.id);
    expect(segunda).toEqual({
      id: primeira.id,
      descricao: 'Internet',
      categoriaId: ID_MERCADO,
      valorPrevistoCentavos: 11990,
      diaVencimento: 5,
    });
    await waitFor(() => expect(mostrarAviso).toHaveBeenCalledWith('sucesso', 'Despesa fixa salva'));
    expect(await screen.findByTestId('local')).toHaveTextContent(/^\/fixas\?mes=2026-10$/);
  });
});

describe('DespesaFixa: encerrar', () => {
  it('abre o diálogo; Cancelar não chama o comando', async () => {
    const usuario = userEvent.setup();
    renderizarPagina(CAMINHO_EDICAO);

    await usuario.click(screen.getByRole('button', { name: 'Encerrar despesa fixa' }));
    await usuario.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));

    expect(comandos.encerrarDespesaFixa).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('confirmar chama encerrarDespesaFixa com o id do modelo, avisa e volta à T06', async () => {
    comandos.encerrarDespesaFixa.mockResolvedValue(undefined);
    const usuario = userEvent.setup();
    renderizarPagina(CAMINHO_EDICAO);

    await usuario.click(screen.getByRole('button', { name: 'Encerrar despesa fixa' }));
    await usuario.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /Encerrar/ }));

    await waitFor(() => expect(comandos.encerrarDespesaFixa).toHaveBeenCalledTimes(1));
    expect(comandos.encerrarDespesaFixa.mock.calls[0][0]).toBe(ID_ALUGUEL);
    await waitFor(() => expect(mostrarAviso).toHaveBeenCalledWith('sucesso', expect.any(String)));
    expect(await screen.findByTestId('local')).toHaveTextContent(/^\/fixas/);
  });

  it('modelo já encerrado não mostra o botão Encerrar', () => {
    const [aluguel] = resposta<Array<Record<string, unknown>>>('despesa-fixa');
    vi.mocked(useDespesaFixa).mockReturnValue(
      consultaPronta({ ...aluguel, encerrada_em: '2026-09-30' }) as never,
    );
    renderizarPagina(CAMINHO_EDICAO);

    expect(screen.getByLabelText('Descrição')).toHaveValue('Aluguel');
    expect(screen.queryByRole('button', { name: 'Encerrar despesa fixa' })).not.toBeInTheDocument();
  });
});
