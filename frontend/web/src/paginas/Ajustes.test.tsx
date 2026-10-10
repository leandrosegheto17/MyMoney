import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Ajustes } from './Ajustes';

declare const __VERSAO_APP__: string;

const simulados = vi.hoisted(() => ({
  sair: vi.fn(),
  sairDeTodos: vi.fn(),
  mostrar: vi.fn(),
}));

const contexto = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../../.md/mockup/respostas/contexto.json', import.meta.url)), 'utf8'),
);

vi.mock('../dados/sessao', () => ({
  sair: simulados.sair,
  sairDeTodos: simulados.sairDeTodos,
  entrar: vi.fn(),
  pedirRedefinicao: vi.fn(),
  salvarNovaSenha: vi.fn(),
  obterSessao: vi.fn(async () => null),
  ouvirSessao: vi.fn(() => () => {}),
}));

vi.mock('../dados/consultas/contexto', () => ({
  buscarContexto: vi.fn(async () => contexto),
}));

vi.mock('../dados/erros', async (original) => ({
  ...(await original<typeof import('../dados/erros')>()),
  traduzirErro: (e: unknown) => e,
}));

vi.mock('../componentes/base/useAviso', () => ({
  useAviso: () => ({ mostrar: simulados.mostrar }),
}));

const TEXTO_DIALOGO =
  'Você vai precisar entrar de novo com e-mail e senha em todos os aparelhos, inclusive neste. Lançamentos aguardando envio continuam guardados no aparelho.';

function montar({ instalado = true, consulta = novoCliente() } = {}) {
  const aoInstalar = vi.fn();
  render(
    <QueryClientProvider client={consulta}>
      <MemoryRouter initialEntries={['/ajustes']}>
        <Routes>
          <Route path="/ajustes" element={<Ajustes instalado={instalado} aoInstalar={aoInstalar} />} />
          <Route path="/entrar" element={<p>Página Entrar</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { consulta, aoInstalar };
}

function novoCliente() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

// O mockup usa <a>; a implementação pode usar botão para as ações de sessão.
function acao(nome: string) {
  return screen.queryByRole('button', { name: nome }) ?? screen.getByRole('link', { name: nome });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('T14 Ajustes', () => {
  it('cabeçalho com voltar para o Início e título', () => {
    montar();

    expect(screen.getByRole('heading', { level: 1, name: 'Ajustes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para Início' })).toHaveAttribute('href', '/');
  });

  it('grupos Cadastros, Aplicativo e Sessão', () => {
    montar();

    for (const nome of ['Cadastros', 'Aplicativo', 'Sessão']) {
      expect(screen.getByRole('region', { name: nome })).toBeInTheDocument();
    }
  });

  it('Cadastros: 4 links com o href certo', () => {
    montar();
    const cadastros = within(screen.getByRole('region', { name: 'Cadastros' }));

    expect(cadastros.getByRole('link', { name: /Contas/ })).toHaveAttribute('href', '/ajustes/contas');
    expect(cadastros.getByRole('link', { name: /Formas de pagamento/ })).toHaveAttribute('href', '/ajustes/formas');
    expect(cadastros.getByRole('link', { name: /Categorias/ })).toHaveAttribute('href', '/ajustes/categorias');
    expect(cadastros.getByRole('link', { name: /Despesas fixas/ })).toHaveAttribute('href', '/fixas');
    expect(cadastros.getAllByRole('link')).toHaveLength(4);
  });

  it('"Instalar o app" aparece quando não instalado e chama aoInstalar', async () => {
    const user = userEvent.setup();
    const { aoInstalar } = montar({ instalado: false });

    const instalar = within(screen.getByRole('region', { name: 'Aplicativo' })).getByRole('button', {
      name: /Instalar o app/,
    });
    await user.click(instalar);
    expect(aoInstalar).toHaveBeenCalledTimes(1);
  });

  it('"Instalar o app" mostra a seta e as ações de sessão não', () => {
    montar({ instalado: false });

    const instalar = screen.getByRole('button', { name: /Instalar o app/ });
    expect(instalar.querySelector('svg:not([aria-hidden="false"])')).not.toBeNull();
    expect(instalar.querySelectorAll('svg')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Sair deste aparelho/ }).querySelectorAll('svg')).toHaveLength(1);
  });

  it('"Instalar o app" some quando já instalado', () => {
    montar({ instalado: true });

    expect(screen.queryByText('Instalar o app')).toBeNull();
  });

  it('mostra a versão do build', () => {
    montar();

    const aplicativo = within(screen.getByRole('region', { name: 'Aplicativo' }));
    expect(aplicativo.getByText('Versão')).toBeInTheDocument();
    expect(aplicativo.getByText(__VERSAO_APP__)).toBeInTheDocument();
  });

  it('"Sair deste aparelho" sai localmente, limpa o cache e vai para /entrar', async () => {
    simulados.sair.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { consulta } = montar();
    consulta.setQueryData(['dado-do-membro'], { valor: 1 });

    await user.click(acao('Sair deste aparelho'));

    expect(await screen.findByText('Página Entrar')).toBeInTheDocument();
    expect(simulados.sair).toHaveBeenCalledTimes(1);
    expect(simulados.sairDeTodos).not.toHaveBeenCalled();
    expect(consulta.getQueryData(['dado-do-membro'])).toBeUndefined();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('"Sair deste aparelho" sem rede: ainda limpa o cache e vai para /entrar', async () => {
    simulados.sair.mockRejectedValue({ tipo: 'rede' });
    const user = userEvent.setup();
    const { consulta } = montar();
    consulta.setQueryData(['dado-do-membro'], { valor: 1 });

    await user.click(acao('Sair deste aparelho'));

    expect(await screen.findByText('Página Entrar')).toBeInTheDocument();
    expect(consulta.getQueryData(['dado-do-membro'])).toBeUndefined();
  });

  it('"Sair de todos os aparelhos" abre o alertdialog com título e texto exatos', async () => {
    const user = userEvent.setup();
    montar();

    await user.click(acao('Sair de todos os aparelhos'));

    const dialogo = await screen.findByRole('alertdialog', { name: 'Sair de todos os aparelhos?' });
    expect(dialogo).toHaveAccessibleDescription(TEXTO_DIALOGO);
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(within(dialogo).getByRole('button', { name: 'Sair de todos' })).toBeInTheDocument();
    expect(simulados.sairDeTodos).not.toHaveBeenCalled();
  });

  it('Cancelar fecha o diálogo sem chamar nada', async () => {
    const user = userEvent.setup();
    montar();

    await user.click(acao('Sair de todos os aparelhos'));
    const dialogo = await screen.findByRole('alertdialog');
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(simulados.sairDeTodos).not.toHaveBeenCalled();
    expect(simulados.sair).not.toHaveBeenCalled();
  });

  it('confirmar chama sairDeTodos uma vez e vai para /entrar', async () => {
    simulados.sairDeTodos.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { consulta } = montar();
    consulta.setQueryData(['dado-do-membro'], { valor: 1 });

    await user.click(acao('Sair de todos os aparelhos'));
    const dialogo = await screen.findByRole('alertdialog');
    await user.click(within(dialogo).getByRole('button', { name: 'Sair de todos' }));

    expect(await screen.findByText('Página Entrar')).toBeInTheDocument();
    expect(simulados.sairDeTodos).toHaveBeenCalledTimes(1);
    expect(simulados.sair).not.toHaveBeenCalled();
    expect(consulta.getQueryData(['dado-do-membro'])).toBeUndefined();
  });

  it('sem rede: fecha o diálogo, avisa "Sem conexão. Tente de novo" e continua em Ajustes', async () => {
    simulados.sairDeTodos.mockRejectedValue({ tipo: 'rede' });
    const user = userEvent.setup();
    const { consulta } = montar();
    consulta.setQueryData(['dado-do-membro'], { valor: 1 });

    await user.click(acao('Sair de todos os aparelhos'));
    const dialogo = await screen.findByRole('alertdialog');
    await user.click(within(dialogo).getByRole('button', { name: 'Sair de todos' }));

    await waitFor(() =>
      expect(simulados.mostrar).toHaveBeenCalledWith('erro', expect.stringMatching(/^Sem conexão\. Tente de novo/)),
    );
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByRole('heading', { level: 1, name: 'Ajustes' })).toBeInTheDocument();
    expect(screen.queryByText('Página Entrar')).toBeNull();
    expect(consulta.getQueryData(['dado-do-membro'])).toEqual({ valor: 1 });
  });

  it('itens de sessão sem style inline (cor via classe)', () => {
    montar();

    const sessao = screen.getByRole('region', { name: 'Sessão' });
    expect(sessao.querySelector('[style]')).toBeNull();
  });
});
