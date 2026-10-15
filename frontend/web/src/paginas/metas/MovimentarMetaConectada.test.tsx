import { readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { dadosLancamento } = vi.hoisted(() => ({ dadosLancamento: { atual: undefined as unknown } }));

const { movimentarMeta, buscarLocaisGuardados, buscarMeta, buscarMovimentosMeta } = vi.hoisted(() => ({
  movimentarMeta: vi.fn(),
  buscarLocaisGuardados: vi.fn(),
  buscarMeta: vi.fn(),
  buscarMovimentosMeta: vi.fn(),
}));

vi.mock('../../dados/consultas/metas', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../dados/consultas/metas')>()),
  buscarMeta,
  buscarMetas: vi.fn(),
}));
vi.mock('../../dados/consultas/movimentosMeta', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../dados/consultas/movimentosMeta')>()),
  buscarMovimentosMeta,
}));
vi.mock('../../dados/consultas/locaisGuardados', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../dados/consultas/locaisGuardados')>()),
  buscarLocaisGuardados,
}));
vi.mock('../../dados/comandos/metas', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../dados/comandos/metas')>()),
  movimentarMeta,
}));
vi.mock('../../ganchos/useDadosLancamento', () => ({
  useDadosLancamento: () => ({
    data: { dados: dadosLancamento.atual, doAparelho: false, salvoEm: 0 },
    isSuccess: true,
    isPending: false,
    isLoading: false,
    isError: false,
    error: null,
    status: 'success',
  }),
}));

import { RegiaoAvisos } from '../../componentes/base/RegiaoAvisos';
import { Meta } from '../Meta';

const ID_VIAGEM = '00000000-0000-4000-8000-000000000902';
const ID_CARRO = '00000000-0000-4000-8000-000000000905';
const ID_NUBANK = '00000000-0000-4000-8000-000000000201';

function lerResposta<T>(nome: string): T {
  return JSON.parse(
    readFileSync(new URL(`../../../../../.md/mockup/respostas/${nome}.json`, import.meta.url), 'utf8'),
  ) as T;
}

function prepararViagem() {
  vi.mocked(buscarMeta).mockResolvedValue(lerResposta<unknown[]>('meta-detalhe')[0] as never);
  vi.mocked(buscarMovimentosMeta).mockResolvedValue(lerResposta('movimentos-meta'));
}

function prepararCarro() {
  vi.mocked(buscarMeta).mockResolvedValue(lerResposta<unknown[]>('meta-carro')[0] as never);
  vi.mocked(buscarMovimentosMeta).mockResolvedValue([] as never);
}

function renderizar(caminho: string) {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const roteador = createMemoryRouter([{ path: '/metas/:id', element: <Meta /> }], {
    initialEntries: [caminho],
  });
  render(
    <QueryClientProvider client={cliente}>
      <RegiaoAvisos>
        <RouterProvider router={roteador} />
      </RegiaoAvisos>
    </QueryClientProvider>,
  );
  return { roteador, usuario: userEvent.setup() };
}

const folha = () => screen.findByRole('dialog');
const argumentos = (i = 0) => vi.mocked(movimentarMeta).mock.calls[i][0] as Record<string, unknown>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-09T15:00:00Z'));
  dadosLancamento.atual = lerResposta('dados-lancamento');
  vi.mocked(buscarLocaisGuardados).mockResolvedValue(lerResposta('locais-guardados'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('T13 aporte', () => {
  it('abre a folha com o nome da meta, sugestões de local e conta "Nenhuma"', async () => {
    prepararViagem();
    renderizar(`/metas/${ID_VIAGEM}?movimentar=aporte`);

    const dialogo = await folha();
    expect(dialogo).toHaveAccessibleName('Viagem Nordeste');
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    const tipo = within(dialogo).getByRole('group', { name: 'Tipo de movimento' });
    expect(within(tipo).getByRole('radio', { name: 'Aporte' })).toBeChecked();
    expect(within(dialogo).getByLabelText('Valor')).toHaveValue('R$ 0,00');

    const local = within(dialogo).getByLabelText('Onde está guardado');
    expect(local).toHaveAttribute('placeholder', 'Ex.: Caixinha Nubank');
    expect(await within(dialogo).findByText('Já usados: Caixinha Nubank, CDB Banco Inter.')).toBeInTheDocument();
    const lista = document.getElementById(local.getAttribute('list') ?? '');
    expect(Array.from(lista?.querySelectorAll('option') ?? []).map((o) => o.value)).toEqual([
      'Caixinha Nubank',
      'CDB Banco Inter',
    ]);

    const conta = within(dialogo).getByLabelText('Conta de origem (opcional)');
    expect(
      within(conta)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Nenhuma', 'Nubank', 'Itaú']);
    expect((conta as HTMLSelectElement).selectedOptions[0].textContent).toBe('Nenhuma');
    expect(within(dialogo).getByText('Debita o saldo da conta. Só você vê a conta.')).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Data')).toHaveValue('2026-10-09');
    expect(screen.getByRole('button', { name: 'Confirmar aporte' })).toBeInTheDocument();
  });

  it('sem locais já usados não mostra a ajuda "Já usados"', async () => {
    prepararViagem();
    vi.mocked(buscarLocaisGuardados).mockResolvedValue([]);
    renderizar(`/metas/${ID_VIAGEM}?movimentar=aporte`);

    const dialogo = await folha();
    await waitFor(() => expect(buscarLocaisGuardados).toHaveBeenCalled());
    expect(within(dialogo).queryByText(/Já usados/)).not.toBeInTheDocument();
  });

  it('local vazio mostra erro e põe o foco no campo, sem enviar', async () => {
    prepararViagem();
    const { usuario } = renderizar(`/metas/${ID_VIAGEM}?movimentar=aporte`);

    const dialogo = await folha();
    await usuario.type(within(dialogo).getByLabelText('Valor'), '50000');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar aporte' }));

    expect(await within(dialogo).findByText('Informe onde está guardado.')).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Onde está guardado')).toHaveFocus();
    expect(movimentarMeta).not.toHaveBeenCalled();
  });

  it('valor zero mostra erro no campo de valor', async () => {
    prepararViagem();
    const { usuario } = renderizar(`/metas/${ID_VIAGEM}?movimentar=aporte`);

    const dialogo = await folha();
    await usuario.type(within(dialogo).getByLabelText('Onde está guardado'), 'Cofre');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar aporte' }));

    expect(await within(dialogo).findByText('Informe um valor maior que zero.')).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Valor')).toHaveFocus();
    expect(movimentarMeta).not.toHaveBeenCalled();
  });

  it('envia o aporte sem conta quando "Nenhuma"', async () => {
    prepararViagem();
    vi.mocked(movimentarMeta).mockResolvedValue('ok' as never);
    const { usuario } = renderizar(`/metas/${ID_VIAGEM}?movimentar=aporte`);

    const dialogo = await folha();
    await usuario.type(within(dialogo).getByLabelText('Valor'), '50000');
    await usuario.type(within(dialogo).getByLabelText('Onde está guardado'), 'Cofre');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar aporte' }));

    await waitFor(() => expect(movimentarMeta).toHaveBeenCalledTimes(1));
    const args = argumentos();
    expect(args).toMatchObject({
      metaId: ID_VIAGEM,
      tipo: 'aporte',
      valorCentavos: 50000,
      local: 'Cofre',
      data: '2026-10-09',
    });
    expect(args.contaId).toBeUndefined();
    expect(String(args.id)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('envia a conta escolhida', async () => {
    prepararViagem();
    vi.mocked(movimentarMeta).mockResolvedValue('ok' as never);
    const { usuario } = renderizar(`/metas/${ID_VIAGEM}?movimentar=aporte`);

    const dialogo = await folha();
    await usuario.type(within(dialogo).getByLabelText('Valor'), '50000');
    await usuario.type(within(dialogo).getByLabelText('Onde está guardado'), 'Caixinha Nubank');
    await usuario.selectOptions(within(dialogo).getByLabelText('Conta de origem (opcional)'), 'Nubank');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar aporte' }));

    await waitFor(() => expect(movimentarMeta).toHaveBeenCalledTimes(1));
    expect(argumentos()).toMatchObject({ contaId: ID_NUBANK, local: 'Caixinha Nubank' });
  });

  it('durante o envio o botão mostra "Confirmando…"', async () => {
    prepararViagem();
    vi.mocked(movimentarMeta).mockReturnValue(new Promise(() => {}));
    const { usuario } = renderizar(`/metas/${ID_VIAGEM}?movimentar=aporte`);

    const dialogo = await folha();
    await usuario.type(within(dialogo).getByLabelText('Valor'), '50000');
    await usuario.type(within(dialogo).getByLabelText('Onde está guardado'), 'Cofre');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar aporte' }));

    expect(await screen.findByRole('button', { name: /Confirmando…/ })).toBeInTheDocument();
  });

  it('sucesso avisa "Aporte registrado", fecha a folha e tira o parâmetro', async () => {
    prepararViagem();
    vi.mocked(movimentarMeta).mockResolvedValue('ok' as never);
    const { roteador, usuario } = renderizar(`/metas/${ID_VIAGEM}?movimentar=aporte`);

    const dialogo = await folha();
    await usuario.type(within(dialogo).getByLabelText('Valor'), '50000');
    await usuario.type(within(dialogo).getByLabelText('Onde está guardado'), 'Cofre');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar aporte' }));

    expect(await screen.findByText('Aporte registrado')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(new URLSearchParams(roteador.state.location.search).has('movimentar')).toBe(false);
  });

  it('sem rede avisa no topo, mantém valor, local e conta e reenvia com o mesmo id', async () => {
    prepararViagem();
    vi.mocked(movimentarMeta)
      .mockRejectedValueOnce({ tipo: 'rede' })
      .mockResolvedValueOnce('ok' as never);
    const { usuario } = renderizar(`/metas/${ID_VIAGEM}?movimentar=aporte`);

    const dialogo = await folha();
    await usuario.type(within(dialogo).getByLabelText('Valor'), '50000');
    await usuario.type(within(dialogo).getByLabelText('Onde está guardado'), 'Cofre');
    await usuario.selectOptions(within(dialogo).getByLabelText('Conta de origem (opcional)'), 'Nubank');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar aporte' }));

    expect(await within(dialogo).findByText(/Sem conexão/)).toBeInTheDocument();
    expect(within(dialogo).getByLabelText('Valor')).toHaveValue('R$ 500,00');
    expect(within(dialogo).getByLabelText('Onde está guardado')).toHaveValue('Cofre');
    expect(
      (within(dialogo).getByLabelText('Conta de origem (opcional)') as HTMLSelectElement).selectedOptions[0]
        .textContent,
    ).toBe('Nubank');

    await usuario.click(screen.getByRole('button', { name: /Confirmar aporte|Tentar de novo/ }));
    await waitFor(() => expect(movimentarMeta).toHaveBeenCalledTimes(2));
    expect(argumentos(1).id).toBe(argumentos(0).id);
  });
});

describe('T13 retirada', () => {
  it('mostra os locais com saldo como escolha, o 1º marcado, e textos de destino', async () => {
    prepararViagem();
    renderizar(`/metas/${ID_VIAGEM}?movimentar=retirada`);

    const dialogo = await folha();
    expect(within(dialogo).getByRole('radio', { name: 'Retirada' })).toBeChecked();
    const origem = within(dialogo).getByRole('radiogroup', { name: 'De onde sai' });
    const locais = within(origem).getAllByRole('radio');
    expect(locais).toHaveLength(2);
    expect(locais[0]).toHaveAccessibleName('Caixinha Nubank · R$ 4.200,00');
    expect(locais[0]).toBeChecked();
    expect(locais[1]).toHaveAccessibleName('CDB Banco Inter · R$ 2.000,00');
    expect(within(dialogo).getByLabelText('Conta de destino (opcional)')).toBeInTheDocument();
    expect(within(dialogo).getByText('Credita o saldo da conta. Só você vê a conta.')).toBeInTheDocument();
    expect(within(dialogo).queryByLabelText('Onde está guardado')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar retirada' })).toBeInTheDocument();
    expect(buscarLocaisGuardados).not.toHaveBeenCalled();
  });

  it('meta sem valor guardado mostra o estado vazio, sem rodapé', async () => {
    prepararCarro();
    renderizar(`/metas/${ID_CARRO}?movimentar=retirada`);

    const dialogo = await folha();
    expect(dialogo).toHaveAccessibleName('Carro novo');
    expect(
      within(dialogo).getByRole('heading', { level: 3, name: 'Não há valor guardado para retirar' }),
    ).toBeInTheDocument();
    expect(within(dialogo).getByText('Esta meta ainda não tem aportes.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirmar/ })).not.toBeInTheDocument();
    expect(within(dialogo).queryByLabelText('Valor')).not.toBeInTheDocument();
  });

  it('envia o local escolhido', async () => {
    prepararViagem();
    vi.mocked(movimentarMeta).mockResolvedValue('ok' as never);
    const { usuario } = renderizar(`/metas/${ID_VIAGEM}?movimentar=retirada`);

    const dialogo = await folha();
    await usuario.click(within(dialogo).getByRole('radio', { name: /CDB Banco Inter/ }));
    await usuario.type(within(dialogo).getByLabelText('Valor'), '30000');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar retirada' }));

    await waitFor(() => expect(movimentarMeta).toHaveBeenCalledTimes(1));
    expect(argumentos()).toMatchObject({ tipo: 'retirada', local: 'CDB Banco Inter', valorCentavos: 30000 });
    expect(await screen.findByText('Retirada registrada')).toBeInTheDocument();
  });

  it('recusa do servidor por valor acima do guardado aparece no campo de valor', async () => {
    prepararViagem();
    vi.mocked(movimentarMeta).mockRejectedValue({ tipo: 'regra', codigo: 'retirada_maior_que_guardado' });
    const { usuario } = renderizar(`/metas/${ID_VIAGEM}?movimentar=retirada`);

    const dialogo = await folha();
    await usuario.click(within(dialogo).getByRole('radio', { name: /CDB Banco Inter/ }));
    await usuario.type(within(dialogo).getByLabelText('Valor'), '250000');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar retirada' }));

    const mensagem = 'Em CDB Banco Inter há R$ 2.000,00. A retirada não pode passar disso.';
    expect(await within(dialogo).findByText(mensagem)).toBeInTheDocument();
    const valor = within(dialogo).getByLabelText('Valor');
    expect(valor).toHaveAttribute('aria-invalid', 'true');
    expect(valor).toHaveAccessibleDescription(expect.stringContaining(mensagem));
    expect(movimentarMeta).toHaveBeenCalledTimes(1);
  });
});

describe('T13 abertura e fechamento', () => {
  it('trocar o tipo no segmentado atualiza a URL', async () => {
    prepararViagem();
    const { roteador, usuario } = renderizar(`/metas/${ID_VIAGEM}?movimentar=aporte`);

    const dialogo = await folha();
    await usuario.click(within(dialogo).getByRole('radio', { name: 'Retirada' }));

    await waitFor(() => expect(new URLSearchParams(roteador.state.location.search).get('movimentar')).toBe('retirada'));
    expect(screen.getByRole('button', { name: 'Confirmar retirada' })).toBeInTheDocument();
  });

  it('valor estranho no parâmetro é retirado sem abrir a folha', async () => {
    prepararViagem();
    const { roteador } = renderizar(`/metas/${ID_VIAGEM}?movimentar=xyz`);

    await screen.findByRole('heading', { level: 1, name: 'Viagem Nordeste' });
    await waitFor(() => expect(new URLSearchParams(roteador.state.location.search).has('movimentar')).toBe(false));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Esc fecha, tira o parâmetro e devolve o foco ao botão de origem', async () => {
    prepararViagem();
    const { roteador, usuario } = renderizar(`/metas/${ID_VIAGEM}`);

    const aportar = await screen.findByRole('link', { name: 'Aportar' });
    await usuario.click(aportar);
    await folha();

    await usuario.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(new URLSearchParams(roteador.state.location.search).has('movimentar')).toBe(false);
    await waitFor(() => expect(screen.getByRole('link', { name: 'Aportar' })).toHaveFocus());
  });

  it('o X "Fechar" fecha a folha', async () => {
    prepararViagem();
    const { roteador, usuario } = renderizar(`/metas/${ID_VIAGEM}?movimentar=aporte`);

    const dialogo = await folha();
    await usuario.click(within(dialogo).getByLabelText('Fechar'));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(new URLSearchParams(roteador.state.location.search).has('movimentar')).toBe(false);
  });

  it('a conta escolhida não vai para a URL', async () => {
    prepararViagem();
    const { roteador, usuario } = renderizar(`/metas/${ID_VIAGEM}?movimentar=aporte`);

    const dialogo = await folha();
    await usuario.selectOptions(within(dialogo).getByLabelText('Conta de origem (opcional)'), 'Nubank');

    expect(roteador.state.location.search).not.toContain(ID_NUBANK);
    expect(roteador.state.location.search).not.toContain('Nubank');
  });
});
