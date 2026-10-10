import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Entrar } from './Entrar';

const simulados = vi.hoisted(() => ({
  entrar: vi.fn(),
  pedirRedefinicao: vi.fn(),
  mostrar: vi.fn(),
}));

vi.mock('../dados/sessao', () => ({
  entrar: simulados.entrar,
  pedirRedefinicao: simulados.pedirRedefinicao,
  sair: vi.fn(),
  sairDeTodos: vi.fn(),
  salvarNovaSenha: vi.fn(),
  obterSessao: vi.fn(async () => null),
  ouvirSessao: vi.fn((cb: (s: null) => void) => {
    cb(null);
    return () => {};
  }),
}));

// As funções de sessão já lançam o erro traduzido; a tradução vira identidade aqui.
vi.mock('../dados/erros', async (original) => ({
  ...(await original<typeof import('../dados/erros')>()),
  traduzirErro: (e: unknown) => e,
}));

vi.mock('../componentes/base/useAviso', () => ({
  useAviso: () => ({ mostrar: simulados.mostrar }),
}));

const ERRO_CREDENCIAIS = { tipo: 'regra', codigo: 'credenciais_invalidas' };
const ERRO_REDE = { tipo: 'rede' };
const MENSAGEM_NEUTRA = /Se o e-mail for de um membro, você vai receber um link/;

function adiado<T = void>() {
  let resolver!: (v: T) => void;
  let rejeitar!: (e: unknown) => void;
  const promessa = new Promise<T>((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });
  return { promessa, resolver, rejeitar };
}

function montar() {
  const consulta = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={consulta}>
      <MemoryRouter initialEntries={['/entrar']}>
        <Routes>
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/" element={<p>Página Início</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function preencher(user: ReturnType<typeof userEvent.setup>, email: string, senha: string) {
  await user.type(screen.getByLabelText('E-mail'), email);
  await user.type(screen.getByLabelText('Senha'), senha);
}

async function esperarMensagemNeutra() {
  await waitFor(() => {
    const naTela = screen.queryByText(MENSAGEM_NEUTRA) !== null;
    const emAviso = simulados.mostrar.mock.calls.some((args) => args.some((a) => MENSAGEM_NEUTRA.test(String(a))));
    expect(naTela || emAviso).toBe(true);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('T01 Entrar', () => {
  it('campos achados pelo rótulo, com o autocomplete certo', () => {
    montar();

    const email = screen.getByLabelText('E-mail');
    expect(email).toHaveAttribute('type', 'email');
    expect(email).toHaveAttribute('autocomplete', 'username');
    const senha = screen.getByLabelText('Senha');
    expect(senha).toHaveAttribute('type', 'password');
    expect(senha).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('alternar a senha muda type, aria-pressed e aria-label', async () => {
    const user = userEvent.setup();
    montar();

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('não existe "Criar conta"', () => {
    montar();

    expect(screen.queryByText(/criar conta/i)).toBeNull();
  });

  it('envio chama entrar(email, senha) uma vez', async () => {
    simulados.entrar.mockResolvedValue(undefined);
    const user = userEvent.setup();
    montar();

    await preencher(user, 'leandro@exemplo.com', 'senha-correta-123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(simulados.entrar).toHaveBeenCalledTimes(1));
    expect(simulados.entrar).toHaveBeenCalledWith('leandro@exemplo.com', 'senha-correta-123');
  });

  it('durante o envio: "Entrando…" com aria-disabled, form aria-busy e 2º envio ignorado', async () => {
    const pendente = adiado();
    simulados.entrar.mockReturnValue(pendente.promessa);
    const user = userEvent.setup();
    montar();

    await preencher(user, 'leandro@exemplo.com', 'senha-correta-123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    const ocupado = await screen.findByRole('button', { name: /Entrando…/ });
    expect(ocupado).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('form', { name: 'Entrar' })).toHaveAttribute('aria-busy', 'true');

    await user.click(ocupado);
    await user.type(screen.getByLabelText('Senha'), '{Enter}');
    expect(simulados.entrar).toHaveBeenCalledTimes(1);

    pendente.resolver();
  });

  it('credenciais erradas: alerta genérico, senha limpa e e-mail mantido', async () => {
    simulados.entrar.mockRejectedValue(ERRO_CREDENCIAIS);
    const user = userEvent.setup();
    montar();

    await preencher(user, 'leandro@exemplo.com', 'senha-errada-123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/^E-mail ou senha incorretos\.$/);
    expect(screen.getByLabelText('Senha')).toHaveValue('');
    expect(screen.getByLabelText('E-mail')).toHaveValue('leandro@exemplo.com');
    expect(screen.getByRole('button', { name: 'Entrar' })).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('o alerta fica antes do campo de e-mail', async () => {
    simulados.entrar.mockRejectedValue(ERRO_CREDENCIAIS);
    const user = userEvent.setup();
    montar();

    await preencher(user, 'leandro@exemplo.com', 'senha-errada-123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    const alerta = await screen.findByRole('alert');
    const email = screen.getByLabelText('E-mail');
    expect(alerta.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('sem rede: "Sem conexão." no alerta', async () => {
    simulados.entrar.mockRejectedValue(ERRO_REDE);
    const user = userEvent.setup();
    montar();

    await preencher(user, 'leandro@exemplo.com', 'senha-correta-123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/^Sem conexão\.$/);
  });

  it('"Esqueci minha senha" chama pedirRedefinicao e mostra a mensagem neutra', async () => {
    simulados.pedirRedefinicao.mockResolvedValue(undefined);
    const user = userEvent.setup();
    montar();

    await user.type(screen.getByLabelText('E-mail'), 'leandro@exemplo.com');
    await user.click(screen.getByText('Esqueci minha senha'));

    await waitFor(() => expect(simulados.pedirRedefinicao).toHaveBeenCalledTimes(1));
    expect(simulados.pedirRedefinicao).toHaveBeenCalledWith('leandro@exemplo.com');
    await esperarMensagemNeutra();
  });

  it('a mensagem de redefinição é a mesma para e-mail de membro e e-mail desconhecido', async () => {
    const user = userEvent.setup();

    simulados.pedirRedefinicao.mockResolvedValue(undefined);
    const primeiro = montar();
    await user.type(screen.getByLabelText('E-mail'), 'leandro@exemplo.com');
    await user.click(screen.getByText('Esqueci minha senha'));
    await esperarMensagemNeutra();
    const textoMembro = primeiro.container.textContent;
    const avisosMembro = simulados.mostrar.mock.calls.map((c) => c.join('|'));
    primeiro.unmount();
    vi.clearAllMocks();

    // A camada de dados já devolve o mesmo resultado para "usuário não existe".
    simulados.pedirRedefinicao.mockResolvedValue(undefined);
    const segundo = montar();
    await user.type(screen.getByLabelText('E-mail'), 'ninguem@exemplo.com');
    await user.click(screen.getByText('Esqueci minha senha'));
    await esperarMensagemNeutra();

    expect(segundo.container.textContent?.replace('ninguem@exemplo.com', '')).toBe(
      textoMembro?.replace('leandro@exemplo.com', ''),
    );
    expect(simulados.mostrar.mock.calls.map((c) => c.join('|'))).toEqual(avisosMembro);
  });

  it('não mostra "Criar conta" nem depois de um erro', async () => {
    simulados.entrar.mockRejectedValue(ERRO_CREDENCIAIS);
    const user = userEvent.setup();
    montar();

    await preencher(user, 'a@b.com', 'x');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    await screen.findByRole('alert');
    expect(screen.queryByText(/criar conta/i)).toBeNull();
  });
});
