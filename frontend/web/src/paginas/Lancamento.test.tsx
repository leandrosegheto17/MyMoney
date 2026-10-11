import { readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAviso } from '../componentes/base/useAviso';
import { useComandosLancamento } from '../ganchos/useComandosLancamento';
import { useContexto } from '../ganchos/useContexto';
import { useDadosLancamento } from '../ganchos/useDadosLancamento';
import { useLancamento } from '../ganchos/useLancamento';
import { Lancamento } from './Lancamento';

vi.mock('../ganchos/useLancamento', () => ({ useLancamento: vi.fn() }));
vi.mock('../ganchos/useContexto', () => ({ useContexto: vi.fn() }));
vi.mock('../ganchos/useDadosLancamento', () => ({ useDadosLancamento: vi.fn() }));
vi.mock('../ganchos/useComandosLancamento', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../ganchos/useComandosLancamento')>()),
  useComandosLancamento: vi.fn(),
}));
vi.mock('../componentes/base/useAviso', () => ({ useAviso: vi.fn() }));

const RESPOSTAS = new URL('../../../../.md/mockup/respostas/', import.meta.url);
const resposta = (nome: string): unknown => JSON.parse(readFileSync(new URL(nome, RESPOSTAS), 'utf8'));

const ID = '00000000-0000-4000-8000-000000000520';
const ID_PARCELA_2 = '00000000-0000-4000-8000-000000000621';

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
    status: erro ? 'error' : temDados ? 'success' : 'pending',
    fetchStatus: 'idle',
    dataUpdatedAt: temDados ? Date.now() : 0,
    refetch: vi.fn().mockResolvedValue({}),
    ...parcial,
  };
}

// Serve tanto como função quanto como resultado do useMutation.
function comando() {
  const fn = vi.fn();
  return Object.assign(fn, { mutateAsync: fn, isPending: false });
}

let comandos: {
  editar: ReturnType<typeof comando>;
  excluir: ReturnType<typeof comando>;
  alterarDataParcela: ReturnType<typeof comando>;
};
const mostrar = vi.fn();

function SondaLocal() {
  const local = useLocation();
  return <output data-testid="local">{local.pathname}</output>;
}

function renderizar() {
  const clienteConsulta = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={clienteConsulta}>
      <MemoryRouter initialEntries={[`/lancamentos/${ID}`]}>
        <Routes>
          <Route path="/lancamentos/:id" element={<Lancamento />} />
          <Route path="/lancamentos" element={<SondaLocal />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function usarLancamento(nome: string) {
  vi.mocked(useLancamento).mockReturnValue(resultado({ data: resposta(nome) }) as never);
}

beforeEach(() => {
  comandos = { editar: comando(), excluir: comando(), alterarDataParcela: comando() };
  vi.mocked(useComandosLancamento).mockReturnValue(comandos as never);
  vi.mocked(useAviso).mockReturnValue({ mostrar } as never);
  vi.mocked(useContexto).mockReturnValue(resultado({ data: resposta('contexto.json') }) as never);
  vi.mocked(useDadosLancamento).mockReturnValue(resultado({ data: resposta('dados-lancamento.json') }) as never);
  usarLancamento('lancamento-pagador.json');
});

afterEach(() => {
  vi.clearAllMocks();
});

function mudarDescricao(texto: string) {
  fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: texto } });
}

function salvar() {
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
}

describe('Lancamento (T05): leitura', () => {
  it('lê o id da rota', () => {
    renderizar();
    expect(useLancamento).toHaveBeenCalledWith(ID);
  });

  it('cabeçalho "Lançamento" com "Voltar para Lançamentos"', () => {
    renderizar();
    expect(screen.getByRole('heading', { level: 1, name: 'Lançamento' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para Lançamentos' })).toBeInTheDocument();
  });

  it('registro_invalido na leitura: "Este lançamento não existe mais" + Voltar', () => {
    vi.mocked(useLancamento).mockReturnValue(
      resultado({ error: { tipo: 'regra', codigo: 'registro_invalido' } }) as never,
    );
    renderizar();
    const alerta = screen.getByRole('alert');
    expect(alerta).toHaveTextContent('Este lançamento não existe mais');
    expect(alerta).toHaveTextContent('Ele pode ter sido excluído.');
    expect(within(alerta).getByRole('link', { name: 'Voltar para Lançamentos' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).toBeNull();
  });

  it('rede na leitura: estado de erro padrão com "Tentar de novo"', () => {
    const erro = resultado({ error: { tipo: 'rede' } });
    vi.mocked(useLancamento).mockReturnValue(erro as never);
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }));
    expect(erro.refetch).toHaveBeenCalled();
  });
});

describe('Lancamento (T05): salvar', () => {
  it('envia só os campos alterados', async () => {
    comandos.editar.mockResolvedValue({});
    renderizar();
    mudarDescricao('Geladeira inox');
    salvar();
    await waitFor(() => expect(comandos.editar).toHaveBeenCalledTimes(1));
    const [argumentos] = comandos.editar.mock.calls[0] as [
      { id: string; campos: Record<string, unknown>; confirmarDescarte?: boolean },
    ];
    expect(argumentos.id).toBe(ID);
    expect(argumentos.campos).toEqual({ descricao: 'Geladeira inox' });
    expect(argumentos.confirmarDescarte ?? false).toBe(false);
  });

  it('sucesso: aviso "Alterações salvas" e volta à T04', async () => {
    comandos.editar.mockResolvedValue({});
    renderizar();
    mudarDescricao('Geladeira inox');
    salvar();
    await waitFor(() => expect(mostrar).toHaveBeenCalledWith('sucesso', 'Alterações salvas'));
    expect(await screen.findByTestId('local')).toHaveTextContent('/lancamentos');
  });

  it('confirmar_descarte_ajustes abre o diálogo I-21 sem citar o valor total quando ele não muda', async () => {
    comandos.editar.mockRejectedValueOnce({ tipo: 'regra', codigo: 'confirmar_descarte_ajustes' });
    renderizar();
    mudarDescricao('Geladeira inox');
    salvar();

    const dialogo = await screen.findByRole('alertdialog', { name: 'Descartar ajuste de data?' });
    expect(dialogo).toHaveTextContent(
      'A parcela 3/3 teve a data ajustada à mão (17/11). Ao alterar a compra, as 3 parcelas são recalculadas pelo vencimento do cartão e esse ajuste será descartado.',
    );
    expect(within(dialogo).getByRole('button', { name: 'Recalcular e salvar' })).toBeInTheDocument();
  });

  it('"Recalcular e salvar" reenvia com confirmarDescarte true', async () => {
    comandos.editar.mockRejectedValueOnce({ tipo: 'regra', codigo: 'confirmar_descarte_ajustes' });
    comandos.editar.mockResolvedValueOnce({});
    renderizar();
    mudarDescricao('Geladeira inox');
    salvar();
    const dialogo = await screen.findByRole('alertdialog');

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Recalcular e salvar' }));

    await waitFor(() => expect(comandos.editar).toHaveBeenCalledTimes(2));
    expect(comandos.editar.mock.calls[1][0]).toMatchObject({ id: ID, confirmarDescarte: true });
    await waitFor(() => expect(mostrar).toHaveBeenCalledWith('sucesso', 'Alterações salvas'));
  });

  it('Cancelar no diálogo não reenvia e mantém o formulário', async () => {
    comandos.editar.mockRejectedValueOnce({ tipo: 'regra', codigo: 'confirmar_descarte_ajustes' });
    renderizar();
    mudarDescricao('Geladeira inox');
    salvar();
    const dialogo = await screen.findByRole('alertdialog');

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(comandos.editar).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Descrição')).toHaveValue('Geladeira inox');
  });

  it('sem rede: aviso de erro no topo e valores mantidos', async () => {
    comandos.editar.mockRejectedValue({ tipo: 'rede' });
    renderizar();
    mudarDescricao('Geladeira inox');
    salvar();

    expect(await screen.findByRole('alert')).toHaveTextContent(/Sem conexão/);
    expect(screen.getByLabelText('Descrição')).toHaveValue('Geladeira inox');
    expect(screen.queryByTestId('local')).toBeNull();
  });

  it('mensagem crua do servidor nunca aparece', async () => {
    comandos.editar.mockRejectedValue({ tipo: 'desconhecido' });
    renderizar();
    mudarDescricao('Geladeira inox');
    salvar();
    const alerta = await screen.findByRole('alert');
    expect(alerta).not.toHaveTextContent(/P0001|desconhecido/);
  });

  it('registro_invalido ao salvar leva a "Este lançamento não existe mais"', async () => {
    comandos.editar.mockRejectedValue({ tipo: 'regra', codigo: 'registro_invalido' });
    renderizar();
    mudarDescricao('Geladeira inox');
    salvar();
    expect(await screen.findByText('Este lançamento não existe mais')).toBeInTheDocument();
  });
});

describe('Lancamento (T05): alterar data de parcela', () => {
  function escolherData(k: number, data: string) {
    const botao = screen.getByRole('button', { name: `Alterar data da parcela ${k} de 3` });
    fireEvent.click(botao);
    const campo = (botao.closest('li') as HTMLElement).querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(campo, { target: { value: data } });
  }

  it('sucesso: aviso "Data da parcela alterada" e o que foi digitado no formulário continua', async () => {
    comandos.alterarDataParcela.mockResolvedValue(undefined);
    renderizar();
    mudarDescricao('Geladeira inox');

    await act(async () => escolherData(2, '2026-11-05'));

    await waitFor(() =>
      expect(comandos.alterarDataParcela).toHaveBeenCalledWith(
        expect.objectContaining({ parcelaId: ID_PARCELA_2, data: '2026-11-05' }),
      ),
    );
    await waitFor(() => expect(mostrar).toHaveBeenCalledWith('sucesso', 'Data da parcela alterada'));
    expect(screen.getByLabelText('Descrição')).toHaveValue('Geladeira inox');
    expect(comandos.editar).not.toHaveBeenCalled();
  });

  it('sem rede: avisa o erro e a data exibida não muda', async () => {
    comandos.alterarDataParcela.mockRejectedValue({ tipo: 'rede' });
    renderizar();

    await act(async () => escolherData(2, '2026-11-05'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Sem conexão/);
    const linha = screen.getByRole('button', { name: 'Alterar data da parcela 2 de 3' }).closest('li') as HTMLElement;
    expect(linha).toHaveTextContent('10/10/2026');
    expect(linha).not.toHaveTextContent('05/11/2026');
  });

  it('outro membro não vê "Alterar data"', () => {
    usarLancamento('lancamento-outro-membro.json');
    vi.mocked(useContexto).mockReturnValue(resultado({ data: resposta('contexto-ana.json') }) as never);
    renderizar();
    expect(screen.queryByRole('button', { name: /Alterar data/ })).toBeNull();
  });
});
