import { readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegiaoAvisos } from '../componentes/base/RegiaoAvisos';
import { Conta } from './Conta';

const h = vi.hoisted(() => ({
  buscarConta: vi.fn<(id: string) => Promise<unknown>>(),
  previa: vi.fn<(contaId: string | undefined, valor: number | undefined) => unknown>(),
  salvarConta: vi.fn<(args: Record<string, unknown>) => Promise<unknown>>(),
  arquivarConta: vi.fn<(id: string) => Promise<unknown>>(),
  excluirConta: vi.fn<(id: string) => Promise<unknown>>(),
  ajustarSaldo: vi.fn<(args: Record<string, unknown>) => Promise<unknown>>(),
}));

vi.mock('../ganchos/useContas', async (importOriginal) => {
  const { useMutation, useQuery } = await import('@tanstack/react-query');
  return {
    ...(await importOriginal<typeof import('../ganchos/useContas')>()),
    useConta: (id: string) =>
      useQuery({ queryKey: ['contas', id], queryFn: () => h.buscarConta(id), enabled: Boolean(id) }),
    usePreviaAjuste: (contaId: string | undefined, valor: number | undefined) => h.previa(contaId, valor),
    useComandosConta: () => ({
      salvarConta: useMutation({ mutationFn: h.salvarConta }),
      arquivarConta: useMutation({ mutationFn: h.arquivarConta }),
      excluirConta: useMutation({ mutationFn: h.excluirConta }),
      ajustarSaldo: useMutation({ mutationFn: h.ajustarSaldo }),
    }),
  };
});

const lerResposta = (nome: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../.md/mockup/respostas/${nome}`, import.meta.url), 'utf8'));

const ID_NUBANK = '00000000-0000-4000-8000-000000000201';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// "Excluir só aparece sem vínculos" ainda não tem campo decidido no contrato; o dado de teste o habilita.
const nubank = () => ({ ...(lerResposta('conta-nubank.json') as object[])[0], pode_excluir: true });

function montar(caminho: string) {
  const clienteConsulta = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const roteador = createMemoryRouter(
    [
      { path: '/ajustes/contas', element: <p>Página de contas</p> },
      { path: '/ajustes/contas/nova', element: <Conta /> },
      { path: '/ajustes/contas/:id', element: <Conta /> },
    ],
    { initialEntries: [caminho] },
  );
  render(
    <QueryClientProvider client={clienteConsulta}>
      <RegiaoAvisos>
        <RouterProvider router={roteador} />
      </RegiaoAvisos>
    </QueryClientProvider>,
  );
  return { roteador, usuario: userEvent.setup() };
}

const alertaCom = (texto: string | RegExp) =>
  screen
    .getAllByRole('alert')
    .find((el) => (typeof texto === 'string' ? el.textContent?.includes(texto) : texto.test(el.textContent ?? '')));

beforeEach(() => {
  vi.clearAllMocks();
  h.buscarConta.mockResolvedValue(nubank());
  h.previa.mockImplementation((_id, valor) => ({
    data: valor ? -1230 : undefined,
    isFetching: false,
    isError: false,
    error: null,
  }));
});

describe('Conta (T16): edição', () => {
  it('mostra nome e saldo inicial editáveis e o saldo atual só leitura', async () => {
    montar(`/ajustes/contas/${ID_NUBANK}`);

    expect(await screen.findByLabelText('Nome')).toHaveValue('Nubank');
    expect(screen.getByLabelText('Saldo inicial')).toHaveValue('R$ 2.500,00');
    expect(screen.getByRole('heading', { name: 'Saldo atual' })).toBeInTheDocument();
    const saldoAtual = screen.getByText('R$ 3.214,85');
    expect(saldoAtual.closest('input, textarea, select')).toBeNull();
    expect(screen.queryByDisplayValue('R$ 3.214,85')).not.toBeInTheDocument();
  });

  it('nome vazio mostra erro no campo, foca nele e não salva', async () => {
    const { usuario } = montar(`/ajustes/contas/${ID_NUBANK}`);

    const nome = await screen.findByLabelText('Nome');
    await usuario.clear(nome);
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(nome).toHaveAttribute('aria-invalid', 'true');
    expect(nome).toHaveFocus();
    expect(h.salvarConta).not.toHaveBeenCalled();
  });

  it('salvar envia o id da conta e, com sucesso, avisa "Conta salva" e volta à lista', async () => {
    h.salvarConta.mockResolvedValue(ID_NUBANK);
    const { usuario } = montar(`/ajustes/contas/${ID_NUBANK}`);

    const nome = await screen.findByLabelText('Nome');
    await usuario.clear(nome);
    await usuario.type(nome, 'Nubank PJ');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Página de contas')).toBeInTheDocument();
    expect(h.salvarConta).toHaveBeenCalledWith(
      expect.objectContaining({ p_id: ID_NUBANK, p_nome: 'Nubank PJ', p_saldo_inicial_centavos: 250000 }),
    );
    expect(await screen.findByText('Conta salva')).toBeInTheDocument();
  });

  it('id inexistente ou alheio mostra "Esta conta não existe mais"', async () => {
    h.buscarConta.mockRejectedValue({ tipo: 'regra', codigo: 'registro_invalido' });
    montar(`/ajustes/contas/${ID_NUBANK}`);

    expect(await screen.findByText(/Esta conta não existe mais/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument();
  });

  it('"Arquivar" arquiva a conta e volta à lista', async () => {
    h.arquivarConta.mockResolvedValue(undefined);
    const { usuario } = montar(`/ajustes/contas/${ID_NUBANK}`);

    await usuario.click(await screen.findByRole('button', { name: 'Arquivar' }));

    await waitFor(() => expect(h.arquivarConta).toHaveBeenCalledWith(ID_NUBANK));
    expect(await screen.findByText('Página de contas')).toBeInTheDocument();
  });
});

describe('Conta (T16): conta nova', () => {
  it('mostra só o formulário com o título "Nova conta"', async () => {
    montar('/ajustes/contas/nova');

    expect(await screen.findByRole('heading', { level: 1, name: 'Nova conta' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('');
    expect(screen.queryByRole('heading', { name: 'Saldo atual' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Informar saldo real' })).not.toBeInTheDocument();
    expect(h.buscarConta).not.toHaveBeenCalled();
  });

  it('sem rede avisa em role=alert, mantém os campos e não navega; o reenvio usa o mesmo id', async () => {
    h.salvarConta.mockRejectedValue({ tipo: 'rede' });
    const { usuario } = montar('/ajustes/contas/nova');

    const nome = await screen.findByLabelText('Nome');
    await usuario.type(nome, 'Inter');
    await usuario.click(screen.getByRole('button', { name: /Salvar|Criar/ }));

    await waitFor(() => expect(alertaCom('Sem conexão. Tente de novo')).toBeDefined());
    expect(screen.getByLabelText('Nome')).toHaveValue('Inter');
    expect(screen.queryByText('Página de contas')).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /Salvar|Criar/ }));
    await waitFor(() => expect(h.salvarConta).toHaveBeenCalledTimes(2));

    const [primeira, segunda] = h.salvarConta.mock.calls.map(([args]) => args);
    expect(primeira.p_id).toMatch(UUID);
    expect(segunda.p_id).toBe(primeira.p_id);
    expect(primeira.p_saldo_inicial_centavos).toBe(0);
  });
});

describe('Conta (T16): informar saldo real', () => {
  it('ao digitar, pede a prévia ao servidor e mostra a diferença devolvida em role=status', async () => {
    const { usuario } = montar(`/ajustes/contas/${ID_NUBANK}`);

    const campo = await screen.findByLabelText('Saldo que aparece no banco');
    await usuario.type(campo, '320255');

    await waitFor(() => expect(h.previa).toHaveBeenLastCalledWith(ID_NUBANK, 320255));
    const nota = await screen.findByText(/Não conta como receita nem despesa/);
    const status = nota.closest('[role="status"]');
    expect(status).not.toBeNull();
    expect(status).toHaveTextContent('Ajuste de − R$ 12,30');
    expect(h.ajustarSaldo).not.toHaveBeenCalled();
  });

  it('"Ajustar saldo" grava sem simular', async () => {
    h.ajustarSaldo.mockResolvedValue(-1230);
    const { usuario } = montar(`/ajustes/contas/${ID_NUBANK}`);

    const campo = await screen.findByLabelText('Saldo que aparece no banco');
    await usuario.type(campo, '320255');
    await usuario.click(screen.getByRole('button', { name: 'Ajustar saldo' }));

    await waitFor(() => expect(h.ajustarSaldo).toHaveBeenCalledTimes(1));
    const [args] = h.ajustarSaldo.mock.calls[0];
    expect(args).toMatchObject({ contaId: ID_NUBANK, saldoRealCentavos: 320255 });
    expect(args.simular).not.toBe(true);
  });
});

describe('Conta (T16): excluir', () => {
  it('pede confirmação antes de excluir; cancelar no diálogo não exclui', async () => {
    const { usuario } = montar(`/ajustes/contas/${ID_NUBANK}`);

    await usuario.click(await screen.findByRole('button', { name: /Excluir/ }));
    const dialogo = await screen.findByRole('alertdialog');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    expect(h.excluirConta).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('em_uso mostra o aviso e oferece "Arquivar conta"; "Cancelar" volta ao formulário', async () => {
    h.excluirConta.mockRejectedValue({ tipo: 'regra', codigo: 'em_uso' });
    h.arquivarConta.mockResolvedValue(undefined);
    const { usuario } = montar(`/ajustes/contas/${ID_NUBANK}`);

    await usuario.click(await screen.findByRole('button', { name: /Excluir/ }));
    const dialogo = await screen.findByRole('alertdialog');
    const confirmar = within(dialogo)
      .getAllByRole('button')
      .find((b) => !/Cancelar/.test(b.textContent ?? ''));
    await usuario.click(confirmar!);

    await waitFor(() => expect(h.excluirConta).toHaveBeenCalledWith(ID_NUBANK));
    await waitFor(() => expect(alertaCom(/Esta conta tem lançamentos/)).toBeDefined());
    expect(alertaCom(/Arquive para tirá-la das opções/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Arquivar conta' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(await screen.findByRole('button', { name: 'Salvar' })).toBeInTheDocument();
    expect(alertaCom(/Esta conta tem lançamentos/)).toBeUndefined();
    expect(h.arquivarConta).not.toHaveBeenCalled();
  });

  it('"Arquivar conta" no aviso de em_uso arquiva', async () => {
    h.excluirConta.mockRejectedValue({ tipo: 'regra', codigo: 'em_uso' });
    h.arquivarConta.mockResolvedValue(undefined);
    const { usuario } = montar(`/ajustes/contas/${ID_NUBANK}`);

    await usuario.click(await screen.findByRole('button', { name: /Excluir/ }));
    const dialogo = await screen.findByRole('alertdialog');
    await usuario.click(
      within(dialogo)
        .getAllByRole('button')
        .find((b) => !/Cancelar/.test(b.textContent ?? ''))!,
    );
    await usuario.click(await screen.findByRole('button', { name: 'Arquivar conta' }));

    await waitFor(() => expect(h.arquivarConta).toHaveBeenCalledWith(ID_NUBANK));
  });

  it('excluir sem rede avisa e mantém a tela', async () => {
    h.excluirConta.mockRejectedValue({ tipo: 'rede' });
    const { usuario } = montar(`/ajustes/contas/${ID_NUBANK}`);

    await usuario.click(await screen.findByRole('button', { name: /Excluir/ }));
    const dialogo = await screen.findByRole('alertdialog');
    await usuario.click(
      within(dialogo)
        .getAllByRole('button')
        .find((b) => !/Cancelar/.test(b.textContent ?? ''))!,
    );

    await waitFor(() => expect(alertaCom('Sem conexão. Tente de novo')).toBeDefined());
    expect(screen.getByLabelText('Nome')).toHaveValue('Nubank');
    expect(screen.queryByText('Página de contas')).not.toBeInTheDocument();
  });
});
