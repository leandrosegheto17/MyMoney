import { readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegiaoAvisos } from '../componentes/base/RegiaoAvisos';
import { FormaPagamento } from './FormaPagamento';

const h = vi.hoisted(() => ({
  buscarForma: vi.fn<(id: string) => Promise<unknown>>(),
  buscarContas: vi.fn<() => Promise<unknown>>(),
  buscarContexto: vi.fn<() => Promise<unknown>>(),
  salvarForma: vi.fn<(args: Record<string, unknown>) => Promise<unknown>>(),
  definirPreferida: vi.fn<(args: { id: string; preferida: boolean }) => Promise<unknown>>(),
  arquivarForma: vi.fn<(id: string) => Promise<unknown>>(),
  excluirForma: vi.fn<(id: string) => Promise<unknown>>(),
}));

vi.mock('../ganchos/useFormasPagamento', async (importOriginal) => {
  const { useMutation, useQuery } = await import('@tanstack/react-query');
  return {
    ...(await importOriginal<typeof import('../ganchos/useFormasPagamento')>()),
    useForma: (id: string) =>
      useQuery({ queryKey: ['formas_pagamento', id], queryFn: () => h.buscarForma(id), enabled: Boolean(id) }),
    useComandosForma: () => ({
      salvarForma: useMutation({ mutationFn: (v: never) => h.salvarForma(v) }),
      definirPreferida: useMutation({ mutationFn: (v: never) => h.definirPreferida(v) }),
      arquivarForma: useMutation({ mutationFn: (v: never) => h.arquivarForma(v) }),
      excluirForma: useMutation({ mutationFn: (v: never) => h.excluirForma(v) }),
    }),
  };
});
vi.mock('../ganchos/useContas', async (importOriginal) => {
  const { useQuery } = await import('@tanstack/react-query');
  return {
    ...(await importOriginal<typeof import('../ganchos/useContas')>()),
    useContas: () => useQuery({ queryKey: ['contas'], queryFn: h.buscarContas }),
  };
});
vi.mock('../ganchos/useContexto', async () => {
  const { useQuery } = await import('@tanstack/react-query');
  return { useContexto: () => useQuery({ queryKey: ['contexto'], queryFn: h.buscarContexto }) };
});

const lerResposta = (nome: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../.md/mockup/respostas/${nome}`, import.meta.url), 'utf8'));

const ID_XP = '00000000-0000-4000-8000-000000000303';
const ID_ITAU = '00000000-0000-4000-8000-000000000202';
const ID_NUBANK = '00000000-0000-4000-8000-000000000201';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ERRO_DIA = /Informe o dia de vencimento do cartão \(1 a 31\)\./;

const formaXp = (extra: Record<string, unknown> = {}) => ({
  ...(lerResposta('forma-xp.json') as object[])[0],
  pode_excluir: true,
  ...extra,
});

function montar(caminho: string) {
  const clienteConsulta = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const roteador = createMemoryRouter(
    [
      { path: '/ajustes/formas', element: <p>Página de formas</p> },
      { path: '/ajustes/formas/nova', element: <FormaPagamento /> },
      { path: '/ajustes/formas/:id', element: <FormaPagamento /> },
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

const botaoEnviar = () => screen.getByRole('button', { name: /^(Salvar|Criar forma)$/ });

async function novaCredito(usuario: ReturnType<typeof userEvent.setup>, nome = 'Cartão Nubank') {
  await usuario.type(await screen.findByLabelText('Nome'), nome);
  await usuario.click(screen.getByRole('radio', { name: 'Crédito' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  h.buscarForma.mockResolvedValue(formaXp());
  h.buscarContas.mockResolvedValue(lerResposta('contas.json'));
  h.buscarContexto.mockResolvedValue(lerResposta('contexto.json'));
  h.salvarForma.mockResolvedValue(ID_XP);
  h.definirPreferida.mockResolvedValue(undefined);
});

describe('FormaPagamento (T18): edição de crédito', () => {
  it('mostra o tipo só leitura, o dia, a conta de pagamento e nenhum rádio de tipo', async () => {
    montar(`/ajustes/formas/${ID_XP}`);

    expect(await screen.findByLabelText('Nome')).toHaveValue('Cartão de crédito XP');
    expect(screen.getByText('Crédito')).toBeInTheDocument();
    expect(screen.getByText('O tipo é escolhido na criação e não muda depois.')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Dia de vencimento')).toHaveValue('10');
    await waitFor(() =>
      expect(screen.getByLabelText('Conta de pagamento padrão (opcional)')).toHaveDisplayValue('Itaú'),
    );
    expect(screen.getByRole('switch', { name: /Preferida no lançamento rápido/ })).not.toBeChecked();
  });

  it('quadro do cartão mostra os totais da view e o mês corrente', async () => {
    montar(`/ajustes/formas/${ID_XP}`);

    const titulo = await screen.findByRole('heading', { level: 2, name: 'Cartão de crédito XP' });
    const quadro = titulo.closest('section')!;
    expect(within(quadro).getByText('R$ 1.284,60')).toBeInTheDocument();
    expect(within(quadro).getByText('R$ 2.150,00')).toBeInTheDocument();
    expect(await within(quadro).findByText(/outubro/)).toBeInTheDocument();
    expect(within(quadro).getByText('Próximos meses')).toBeInTheDocument();
    expect(within(quadro).getByRole('link', { name: 'Registrar pagamento do cartão' })).toHaveAttribute(
      'href',
      expect.stringContaining('pagamento=1'),
    );
  });

  it('?pagamento=1 não quebra a página', async () => {
    montar(`/ajustes/formas/${ID_XP}?pagamento=1`);

    expect(await screen.findByLabelText('Nome')).toHaveValue('Cartão de crédito XP');
    expect(screen.getByRole('heading', { level: 2, name: 'Cartão de crédito XP' })).toBeInTheDocument();
  });

  it('salvar envia o tipo atual, sem mudar, e com sucesso avisa "Forma salva" e volta à lista', async () => {
    const { usuario } = montar(`/ajustes/formas/${ID_XP}`);

    await screen.findByLabelText('Nome');
    await usuario.click(botaoEnviar());

    expect(await screen.findByText('Página de formas')).toBeInTheDocument();
    expect(h.salvarForma).toHaveBeenCalledWith(
      expect.objectContaining({ p_id: ID_XP, p_tipo: 'credito', p_dia_vencimento: 10, p_conta_id: ID_ITAU }),
    );
    expect(await screen.findByText('Forma salva')).toBeInTheDocument();
  });

  it('preferida inalterada não chama definirPreferida', async () => {
    const { usuario } = montar(`/ajustes/formas/${ID_XP}`);

    await screen.findByLabelText('Nome');
    await usuario.click(botaoEnviar());

    await waitFor(() => expect(h.salvarForma).toHaveBeenCalled());
    await screen.findByText('Página de formas');
    expect(h.definirPreferida).not.toHaveBeenCalled();
  });

  it('ligar a preferida chama definirPreferida(id, true) depois de salvarForma', async () => {
    const { usuario } = montar(`/ajustes/formas/${ID_XP}`);

    await usuario.click(await screen.findByRole('switch', { name: /Preferida no lançamento rápido/ }));
    await usuario.click(botaoEnviar());

    await waitFor(() => expect(h.definirPreferida).toHaveBeenCalledTimes(1));
    expect(h.definirPreferida.mock.calls[0][0]).toEqual({ id: ID_XP, preferida: true });
    expect(h.salvarForma.mock.invocationCallOrder[0]).toBeLessThan(h.definirPreferida.mock.invocationCallOrder[0]);
  });

  it('desligar a preferida chama definirPreferida(id, false)', async () => {
    h.buscarForma.mockResolvedValue(formaXp({ preferida: true }));
    const { usuario } = montar(`/ajustes/formas/${ID_XP}`);

    const interruptor = await screen.findByRole('switch', { name: /Preferida no lançamento rápido/ });
    expect(interruptor).toBeChecked();
    await usuario.click(interruptor);
    await usuario.click(botaoEnviar());

    await waitFor(() => expect(h.definirPreferida).toHaveBeenCalledTimes(1));
    expect(h.definirPreferida.mock.calls[0][0]).toEqual({ id: ID_XP, preferida: false });
  });

  it('falha ao definir a preferida avisa e mantém a tela', async () => {
    h.definirPreferida.mockRejectedValue({ tipo: 'rede' });
    const { usuario } = montar(`/ajustes/formas/${ID_XP}`);

    await usuario.click(await screen.findByRole('switch', { name: /Preferida no lançamento rápido/ }));
    await usuario.click(botaoEnviar());

    await waitFor(() => expect(alertaCom('Sem conexão. Tente de novo')).toBeDefined());
    expect(screen.queryByText('Página de formas')).not.toBeInTheDocument();
  });
});

describe('FormaPagamento (T18): forma nova', () => {
  it('oferece o tipo em rádios Pix, Débito e Crédito e o título "Nova forma"', async () => {
    montar('/ajustes/formas/nova');

    expect(await screen.findByRole('heading', { level: 1, name: 'Nova forma' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio').map((r) => r.closest('label')?.textContent?.trim())).toEqual([
      'Pix',
      'Débito',
      'Crédito',
    ]);
    expect(screen.getByRole('button', { name: 'Criar forma' })).toBeInTheDocument();
  });

  it('Pix sem conta de origem mostra erro no campo, foca nele e não salva', async () => {
    const { usuario } = montar('/ajustes/formas/nova');

    await usuario.type(await screen.findByLabelText('Nome'), 'Pix Inter');
    await usuario.click(screen.getByRole('radio', { name: 'Pix' }));
    await usuario.click(botaoEnviar());

    const conta = screen.getByLabelText('Conta de origem');
    expect(conta).toHaveAttribute('aria-invalid', 'true');
    expect(conta).toHaveFocus();
    expect(conta).toHaveAccessibleDescription(/Escolha a conta de origem\./);
    expect(h.salvarForma).not.toHaveBeenCalled();
  });

  it('Débito oferece como conta de origem só as contas ativas e envia a escolhida', async () => {
    h.buscarContas.mockResolvedValue([
      ...(lerResposta('contas.json') as object[]),
      {
        id: '00000000-0000-4000-8000-000000000209',
        nome: 'Antiga',
        saldo_inicial_centavos: 0,
        saldo_centavos: 0,
        arquivada: true,
      },
    ]);
    const { usuario } = montar('/ajustes/formas/nova');

    await usuario.type(await screen.findByLabelText('Nome'), 'Débito Nubank');
    await usuario.click(screen.getByRole('radio', { name: 'Débito' }));
    const conta = screen.getByLabelText('Conta de origem');
    await waitFor(() => expect(within(conta).getByRole('option', { name: 'Nubank' })).toBeInTheDocument());
    expect(within(conta).queryByRole('option', { name: 'Antiga' })).not.toBeInTheDocument();

    await usuario.selectOptions(conta, 'Nubank');
    await usuario.click(botaoEnviar());

    await waitFor(() =>
      expect(h.salvarForma).toHaveBeenCalledWith(
        expect.objectContaining({ p_tipo: 'debito', p_conta_id: ID_NUBANK, p_nome: 'Débito Nubank' }),
      ),
    );
  });

  it.each(['', '0', '32'])('Crédito com dia "%s" mostra o erro do dia e não salva', async (dia) => {
    const { usuario } = montar('/ajustes/formas/nova');

    await novaCredito(usuario);
    const campoDia = screen.getByLabelText('Dia de vencimento');
    if (dia) await usuario.type(campoDia, dia);
    await usuario.click(botaoEnviar());

    expect(campoDia).toHaveAttribute('aria-invalid', 'true');
    expect(campoDia).toHaveAccessibleDescription(ERRO_DIA);
    expect(campoDia).toHaveFocus();
    expect(h.salvarForma).not.toHaveBeenCalled();
  });

  it('Crédito mostra a nota de mudança de dia', async () => {
    const { usuario } = montar('/ajustes/formas/nova');

    await novaCredito(usuario);

    expect(
      screen.getByText('De 1 a 31. Mudar o dia vale para compras novas: as parcelas já lançadas não mudam.'),
    ).toBeInTheDocument();
  });

  it('Crédito sem conta de pagamento salva com p_conta_id nulo', async () => {
    const { usuario } = montar('/ajustes/formas/nova');

    await novaCredito(usuario);
    await usuario.type(screen.getByLabelText('Dia de vencimento'), '10');
    expect(screen.getByLabelText('Conta de pagamento padrão (opcional)')).toHaveDisplayValue('Nenhuma');
    await usuario.click(botaoEnviar());

    await waitFor(() => expect(h.salvarForma).toHaveBeenCalledTimes(1));
    expect(h.salvarForma.mock.calls[0][0]).toMatchObject({
      p_nome: 'Cartão Nubank',
      p_tipo: 'credito',
      p_dia_vencimento: 10,
      p_conta_id: null,
    });
  });

  it('sem rede avisa, mantém os campos e o reenvio usa o mesmo id', async () => {
    h.salvarForma.mockRejectedValue({ tipo: 'rede' });
    const { usuario } = montar('/ajustes/formas/nova');

    await novaCredito(usuario);
    await usuario.type(screen.getByLabelText('Dia de vencimento'), '10');
    await usuario.click(botaoEnviar());

    await waitFor(() => expect(alertaCom('Sem conexão. Tente de novo')).toBeDefined());
    expect(screen.getByLabelText('Nome')).toHaveValue('Cartão Nubank');
    expect(screen.getByLabelText('Dia de vencimento')).toHaveValue('10');
    expect(screen.queryByText('Página de formas')).not.toBeInTheDocument();

    await usuario.click(botaoEnviar());
    await waitFor(() => expect(h.salvarForma).toHaveBeenCalledTimes(2));
    const [primeira, segunda] = h.salvarForma.mock.calls.map(([args]) => args);
    expect(primeira.p_id).toMatch(UUID);
    expect(segunda.p_id).toBe(primeira.p_id);
  });
});

describe('FormaPagamento (T18): excluir', () => {
  it('em_uso mostra o aviso e "Arquivar forma", que arquiva', async () => {
    h.excluirForma.mockRejectedValue({ tipo: 'regra', codigo: 'em_uso' });
    h.arquivarForma.mockResolvedValue(undefined);
    const { usuario } = montar(`/ajustes/formas/${ID_XP}`);

    await usuario.click(await screen.findByRole('button', { name: /Excluir/ }));
    const dialogo = await screen.findByRole('alertdialog');
    await usuario.click(
      within(dialogo)
        .getAllByRole('button')
        .find((b) => !/Cancelar/.test(b.textContent ?? ''))!,
    );

    await waitFor(() => expect(h.excluirForma).toHaveBeenCalledWith(ID_XP));
    await waitFor(() => expect(alertaCom(/Esta forma tem lançamentos/)).toBeDefined());
    await usuario.click(screen.getByRole('button', { name: 'Arquivar forma' }));

    await waitFor(() => expect(h.arquivarForma).toHaveBeenCalledWith(ID_XP));
  });

  it('cancelar no diálogo não exclui', async () => {
    const { usuario } = montar(`/ajustes/formas/${ID_XP}`);

    await usuario.click(await screen.findByRole('button', { name: /Excluir/ }));
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));

    expect(h.excluirForma).not.toHaveBeenCalled();
  });
});
