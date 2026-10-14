import { readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegiaoAvisos } from '../componentes/base/RegiaoAvisos';
import { Categoria } from './Categoria';

const h = vi.hoisted(() => ({
  buscarCategoria: vi.fn<(id: string) => Promise<unknown>>(),
  salvarCategoria: vi.fn<(args: Record<string, unknown>) => Promise<unknown>>(),
  arquivarCategoria: vi.fn<(id: string) => Promise<unknown>>(),
  excluirCategoria: vi.fn<(id: string) => Promise<unknown>>(),
}));

vi.mock('../ganchos/useCategorias', async (importOriginal) => {
  const { useMutation, useQuery } = await import('@tanstack/react-query');
  return {
    ...(await importOriginal<typeof import('../ganchos/useCategorias')>()),
    useCategoria: (id: string) =>
      useQuery({ queryKey: ['categorias', id], queryFn: () => h.buscarCategoria(id), enabled: Boolean(id) }),
    useComandosCategoria: () => ({
      salvarCategoria: useMutation({ mutationFn: (v: Record<string, unknown>) => h.salvarCategoria(v) }),
      arquivarCategoria: useMutation({ mutationFn: (v: string) => h.arquivarCategoria(v) }),
      excluirCategoria: useMutation({ mutationFn: (v: string) => h.excluirCategoria(v) }),
    }),
  };
});

const lerResposta = (nome: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../.md/mockup/respostas/${nome}`, import.meta.url), 'utf8'));

const ID_MERCADO = '00000000-0000-4000-8000-000000000401';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const mercado = (extra: Record<string, unknown> = {}) => ({
  ...(lerResposta('categoria-mercado.json') as object[])[0],
  pode_excluir: true,
  ...extra,
});

function montar(caminho: string) {
  const clienteConsulta = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const roteador = createMemoryRouter(
    [
      { path: '/ajustes/categorias', element: <p>Página de categorias</p> },
      { path: '/ajustes/categorias/nova', element: <Categoria /> },
      { path: '/ajustes/categorias/:id', element: <Categoria /> },
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

const botaoEnviar = () => screen.getByRole('button', { name: /^(Salvar|Criar categoria)$/ });
const interruptorVariavel = () => screen.queryByRole('switch', { name: /Gasto variável/ });

beforeEach(() => {
  vi.clearAllMocks();
  h.buscarCategoria.mockResolvedValue(mercado());
  h.salvarCategoria.mockResolvedValue(ID_MERCADO);
});

describe('Categoria (T20): edição', () => {
  it('mostra "Despesa", o selo "Da casa", a ajuda dos dois e o interruptor marcado, sem rádios', async () => {
    montar(`/ajustes/categorias/${ID_MERCADO}`);

    expect(await screen.findByLabelText('Nome')).toHaveValue('Mercado');
    expect(screen.getByText(/Despesa/)).toBeInTheDocument();
    expect(screen.getByText('Da casa')).toBeInTheDocument();
    expect(screen.getByText('Escolhidos na criação. Mudanças no nome valem para os dois.')).toBeInTheDocument();
    expect(interruptorVariavel()).toBeChecked();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('categoria individual não fala "valem para os dois"', async () => {
    h.buscarCategoria.mockResolvedValue(
      mercado({ id: '00000000-0000-4000-8000-000000000411', nome: 'Almoço/Alimentação fora', escopo: 'individual' }),
    );
    montar('/ajustes/categorias/00000000-0000-4000-8000-000000000411');

    expect(await screen.findByText('Minha')).toBeInTheDocument();
    expect(screen.queryByText(/valem para os dois/)).not.toBeInTheDocument();
  });

  it('receita em edição não mostra o interruptor "Gasto variável"', async () => {
    h.buscarCategoria.mockResolvedValue(
      mercado({
        id: '00000000-0000-4000-8000-000000000421',
        nome: 'Salário',
        tipo: 'receita',
        escopo: 'individual',
        variavel: null,
      }),
    );
    montar('/ajustes/categorias/00000000-0000-4000-8000-000000000421');

    expect(await screen.findByLabelText('Nome')).toHaveValue('Salário');
    expect(interruptorVariavel()).not.toBeInTheDocument();
  });

  it('salvar mantém tipo e escopo atuais e, com sucesso, avisa "Categoria salva" e volta à lista do tipo', async () => {
    const { usuario, roteador } = montar(`/ajustes/categorias/${ID_MERCADO}`);

    const nome = await screen.findByLabelText('Nome');
    await usuario.clear(nome);
    await usuario.type(nome, 'Supermercado');
    await usuario.click(botaoEnviar());

    expect(await screen.findByText('Página de categorias')).toBeInTheDocument();
    expect(h.salvarCategoria).toHaveBeenCalledWith(
      expect.objectContaining({
        p_id: ID_MERCADO,
        p_nome: 'Supermercado',
        p_tipo: 'despesa',
        p_escopo: 'conjunto',
        p_variavel: true,
      }),
    );
    expect(new URLSearchParams(roteador.state.location.search).get('tipo')).toBe('despesa');
    expect(await screen.findByText('Categoria salva')).toBeInTheDocument();
  });

  it('nome vazio mostra erro no campo com foco e não salva', async () => {
    const { usuario } = montar(`/ajustes/categorias/${ID_MERCADO}`);

    const nome = await screen.findByLabelText('Nome');
    await usuario.clear(nome);
    await usuario.click(botaoEnviar());

    expect(nome).toHaveAttribute('aria-invalid', 'true');
    expect(nome).toHaveFocus();
    expect(h.salvarCategoria).not.toHaveBeenCalled();
  });

  it('"Arquivar" arquiva e volta à lista', async () => {
    h.arquivarCategoria.mockResolvedValue(undefined);
    const { usuario } = montar(`/ajustes/categorias/${ID_MERCADO}`);

    await usuario.click(await screen.findByRole('button', { name: 'Arquivar' }));

    await waitFor(() => expect(h.arquivarCategoria).toHaveBeenCalledWith(ID_MERCADO));
    expect(await screen.findByText('Página de categorias')).toBeInTheDocument();
  });
});

describe('Categoria (T20): categoria nova', () => {
  it('título "Nova categoria" com rádios de Tipo e Escopo', async () => {
    montar('/ajustes/categorias/nova');

    expect(await screen.findByRole('heading', { level: 1, name: 'Nova categoria' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Despesa' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Receita' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Da casa' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Minha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar categoria' })).toBeInTheDocument();
  });

  it('Receita marca "Minha", desabilita "Da casa" e esconde o interruptor; voltar a Despesa reexibe', async () => {
    const { usuario } = montar('/ajustes/categorias/nova');

    await usuario.click(await screen.findByRole('radio', { name: 'Receita' }));

    expect(screen.getByRole('radio', { name: 'Minha' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Da casa' })).toBeDisabled();
    expect(interruptorVariavel()).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('radio', { name: 'Despesa' }));

    expect(screen.getByRole('radio', { name: 'Da casa' })).toBeEnabled();
    expect(interruptorVariavel()).toBeInTheDocument();
  });

  it('envia p_tipo e p_escopo com os valores do contrato', async () => {
    const { usuario } = montar('/ajustes/categorias/nova');

    await usuario.type(await screen.findByLabelText('Nome'), 'Pet');
    await usuario.click(screen.getByRole('radio', { name: 'Despesa' }));
    await usuario.click(screen.getByRole('radio', { name: 'Da casa' }));
    await usuario.click(botaoEnviar());

    await waitFor(() => expect(h.salvarCategoria).toHaveBeenCalledTimes(1));
    expect(h.salvarCategoria.mock.calls[0][0]).toMatchObject({
      p_nome: 'Pet',
      p_tipo: 'despesa',
      p_escopo: 'conjunto',
    });
  });

  it('receita é enviada como individual', async () => {
    const { usuario } = montar('/ajustes/categorias/nova');

    await usuario.type(await screen.findByLabelText('Nome'), 'Freela');
    await usuario.click(screen.getByRole('radio', { name: 'Receita' }));
    await usuario.click(botaoEnviar());

    await waitFor(() => expect(h.salvarCategoria).toHaveBeenCalledTimes(1));
    const args = h.salvarCategoria.mock.calls[0][0];
    expect(args).toMatchObject({ p_tipo: 'receita', p_escopo: 'individual' });
    expect(args.p_variavel ?? null).toBeNull();
  });

  it('nome repetido mostra o erro do mockup no campo, com foco', async () => {
    h.salvarCategoria.mockRejectedValue({ tipo: 'regra', codigo: 'nome_repetido' });
    const { usuario } = montar('/ajustes/categorias/nova');

    await usuario.type(await screen.findByLabelText('Nome'), 'Mercado');
    await usuario.click(screen.getByRole('radio', { name: 'Despesa' }));
    await usuario.click(screen.getByRole('radio', { name: 'Da casa' }));
    await usuario.click(botaoEnviar());

    const nome = screen.getByLabelText('Nome');
    await waitFor(() => expect(nome).toHaveAttribute('aria-invalid', 'true'));
    expect(nome).toHaveAccessibleDescription(/Já existe uma categoria da casa com esse nome\./);
    expect(nome).toHaveFocus();
  });

  it('sem rede avisa, mantém os campos e o reenvio usa o mesmo id', async () => {
    h.salvarCategoria.mockRejectedValue({ tipo: 'rede' });
    const { usuario } = montar('/ajustes/categorias/nova');

    await usuario.type(await screen.findByLabelText('Nome'), 'Pet');
    await usuario.click(screen.getByRole('radio', { name: 'Despesa' }));
    await usuario.click(botaoEnviar());

    await waitFor(() => expect(alertaCom('Sem conexão. Tente de novo')).toBeDefined());
    expect(screen.getByLabelText('Nome')).toHaveValue('Pet');
    expect(screen.queryByText('Página de categorias')).not.toBeInTheDocument();

    await usuario.click(botaoEnviar());
    await waitFor(() => expect(h.salvarCategoria).toHaveBeenCalledTimes(2));
    const [primeira, segunda] = h.salvarCategoria.mock.calls.map(([args]) => args);
    expect(primeira.p_id).toMatch(UUID);
    expect(segunda.p_id).toBe(primeira.p_id);
  });
});

describe('Categoria (T20): excluir', () => {
  it('categoria_em_uso mostra o aviso e "Arquivar categoria", que arquiva', async () => {
    h.excluirCategoria.mockRejectedValue({ tipo: 'regra', codigo: 'categoria_em_uso' });
    h.arquivarCategoria.mockResolvedValue(undefined);
    const { usuario } = montar(`/ajustes/categorias/${ID_MERCADO}`);

    await usuario.click(await screen.findByRole('button', { name: /Excluir/ }));
    const dialogo = await screen.findByRole('alertdialog');
    await usuario.click(
      within(dialogo)
        .getAllByRole('button')
        .find((b) => !/Cancelar/.test(b.textContent ?? ''))!,
    );

    await waitFor(() => expect(h.excluirCategoria).toHaveBeenCalledWith(ID_MERCADO));
    await waitFor(() => expect(alertaCom(/Esta categoria tem lançamentos/)).toBeDefined());
    await usuario.click(screen.getByRole('button', { name: 'Arquivar categoria' }));

    await waitFor(() => expect(h.arquivarCategoria).toHaveBeenCalledWith(ID_MERCADO));
  });

  it('"Cancelar" no aviso de em uso volta ao formulário sem arquivar', async () => {
    h.excluirCategoria.mockRejectedValue({ tipo: 'regra', codigo: 'categoria_em_uso' });
    const { usuario } = montar(`/ajustes/categorias/${ID_MERCADO}`);

    await usuario.click(await screen.findByRole('button', { name: /Excluir/ }));
    const dialogo = await screen.findByRole('alertdialog');
    await usuario.click(
      within(dialogo)
        .getAllByRole('button')
        .find((b) => !/Cancelar/.test(b.textContent ?? ''))!,
    );
    await screen.findByRole('button', { name: 'Arquivar categoria' });
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(await screen.findByRole('button', { name: 'Salvar' })).toBeInTheDocument();
    expect(h.arquivarCategoria).not.toHaveBeenCalled();
  });

  it('cancelar no diálogo não exclui', async () => {
    const { usuario } = montar(`/ajustes/categorias/${ID_MERCADO}`);

    await usuario.click(await screen.findByRole('button', { name: /Excluir/ }));
    await usuario.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));

    expect(h.excluirCategoria).not.toHaveBeenCalled();
  });
});
