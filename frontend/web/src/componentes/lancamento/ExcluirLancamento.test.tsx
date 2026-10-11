import { readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAviso } from '../base/useAviso';
import { useComandosLancamento } from '../../ganchos/useComandosLancamento';
import { useContexto } from '../../ganchos/useContexto';
import { useDadosLancamento } from '../../ganchos/useDadosLancamento';
import { useLancamento } from '../../ganchos/useLancamento';
import { Lancamento } from '../../paginas/Lancamento';

// O botão Excluir é encaixado pela página: o teste roda pela página com o comando simulado.
vi.mock('../../ganchos/useLancamento', () => ({ useLancamento: vi.fn() }));
vi.mock('../../ganchos/useContexto', () => ({ useContexto: vi.fn() }));
vi.mock('../../ganchos/useDadosLancamento', () => ({ useDadosLancamento: vi.fn() }));
vi.mock('../../ganchos/useComandosLancamento', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../ganchos/useComandosLancamento')>()),
  useComandosLancamento: vi.fn(),
}));
vi.mock('../base/useAviso', () => ({ useAviso: vi.fn() }));

const RESPOSTAS = new URL('../../../../../.md/mockup/respostas/', import.meta.url);
const resposta = (nome: string): unknown => JSON.parse(readFileSync(new URL(nome, RESPOSTAS), 'utf8'));

const ID = '00000000-0000-4000-8000-000000000520';
const TITULO = 'Excluir esta compra e as 3 parcelas?';
const TEXTO = 'Geladeira nova, R$ 1.950,00 em 3x. A exclusão vale para os dois e não pode ser desfeita.';

function resultado(parcial: Record<string, unknown>) {
  const temDados = parcial.data !== undefined;
  return {
    data: undefined,
    error: null,
    isPending: !temDados,
    isLoading: !temDados,
    isError: false,
    isSuccess: temDados,
    isFetching: false,
    status: temDados ? 'success' : 'pending',
    fetchStatus: 'idle',
    dataUpdatedAt: temDados ? Date.now() : 0,
    refetch: vi.fn().mockResolvedValue({}),
    ...parcial,
  };
}

function comando() {
  const fn = vi.fn();
  return Object.assign(fn, { mutateAsync: fn, isPending: false });
}

let excluir: ReturnType<typeof comando>;
const mostrar = vi.fn();

function SondaLocal() {
  const local = useLocation();
  return <output data-testid="local">{local.pathname + local.search}</output>;
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

function abrirDialogo() {
  fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
  return screen.getByRole('alertdialog', { name: TITULO });
}

beforeEach(() => {
  excluir = comando();
  vi.mocked(useComandosLancamento).mockReturnValue({
    editar: comando(),
    excluir,
    alterarDataParcela: comando(),
  } as never);
  vi.mocked(useAviso).mockReturnValue({ mostrar } as never);
  vi.mocked(useContexto).mockReturnValue(resultado({ data: resposta('contexto.json') }) as never);
  vi.mocked(useDadosLancamento).mockReturnValue(resultado({ data: resposta('dados-lancamento.json') }) as never);
  vi.mocked(useLancamento).mockReturnValue(resultado({ data: resposta('lancamento-pagador.json') }) as never);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ExcluirLancamento', () => {
  it('botão "Excluir" do tipo button, com o ícone lixo', () => {
    renderizar();
    const botao = screen.getByRole('button', { name: 'Excluir' });
    expect(botao).toHaveAttribute('type', 'button');
    expect(botao.querySelector('use')?.getAttribute('href')).toBe('#i-lixo');
  });

  it('o outro membro também vê "Excluir" na conjunta', () => {
    vi.mocked(useLancamento).mockReturnValue(resultado({ data: resposta('lancamento-outro-membro.json') }) as never);
    vi.mocked(useContexto).mockReturnValue(resultado({ data: resposta('contexto-ana.json') }) as never);
    renderizar();
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument();
  });

  it('clicar abre o alertdialog com título e descrição do mockup, sem chamar o comando', () => {
    renderizar();
    const dialogo = abrirDialogo();
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAccessibleDescription(TEXTO);
    expect(excluir).not.toHaveBeenCalled();
  });

  it('foco inicial em "Cancelar"', async () => {
    renderizar();
    const dialogo = abrirDialogo();
    await waitFor(() => expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus());
  });

  it('Cancelar fecha sem chamar o comando', async () => {
    renderizar();
    const dialogo = abrirDialogo();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(excluir).not.toHaveBeenCalled();
  });

  it('Esc fecha sem chamar o comando', async () => {
    renderizar();
    const dialogo = abrirDialogo();
    fireEvent.keyDown(dialogo, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(excluir).not.toHaveBeenCalled();
  });

  it('confirmar chama o comando 1 vez, mesmo com duplo clique', async () => {
    excluir.mockReturnValue(new Promise(() => {}));
    renderizar();
    const dialogo = abrirDialogo();
    const confirmar = within(dialogo).getByRole('button', { name: 'Excluir' });
    fireEvent.click(confirmar);
    fireEvent.click(confirmar);
    await waitFor(() => expect(excluir).toHaveBeenCalledTimes(1));
    expect(excluir).toHaveBeenCalledWith(ID);
  });

  it('sucesso: aviso "Excluído" e volta à lista', async () => {
    excluir.mockResolvedValue(undefined);
    renderizar();
    fireEvent.click(within(abrirDialogo()).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(mostrar).toHaveBeenCalledWith('sucesso', 'Excluído'));
    expect(await screen.findByTestId('local')).toHaveTextContent(/^\/lancamentos(\?mes=\d{4}-\d{2})?$/);
  });

  it('sem rede: fecha o diálogo, avisa "Sem conexão. Tente de novo" e a tela continua', async () => {
    excluir.mockRejectedValue({ tipo: 'rede' });
    renderizar();
    fireEvent.click(within(abrirDialogo()).getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão. Tente de novo');
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument();
    expect(screen.queryByTestId('local')).toBeNull();
  });

  it('registro_invalido (excluído pelo outro): "Este lançamento não existe mais" + Voltar', async () => {
    excluir.mockRejectedValue({ tipo: 'regra', codigo: 'registro_invalido' });
    renderizar();
    fireEvent.click(within(abrirDialogo()).getByRole('button', { name: 'Excluir' }));
    expect(await screen.findByText('Este lançamento não existe mais')).toBeInTheDocument();
    expect(within(screen.getByRole('alert')).getByRole('link', { name: 'Voltar para Lançamentos' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).toBeNull();
  });
});
