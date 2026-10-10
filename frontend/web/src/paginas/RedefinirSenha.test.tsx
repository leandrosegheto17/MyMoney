import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RedefinirSenha } from './RedefinirSenha';

const simulados = vi.hoisted(() => ({
  salvarNovaSenha: vi.fn(),
  sair: vi.fn(),
  estadoRecuperacao: vi.fn(),
  mostrar: vi.fn(),
}));

vi.mock('../dados/sessao', () => ({
  salvarNovaSenha: simulados.salvarNovaSenha,
  sair: simulados.sair,
  estadoRecuperacao: simulados.estadoRecuperacao,
  entrar: vi.fn(),
  sairDeTodos: vi.fn(),
  pedirRedefinicao: vi.fn(),
  obterSessao: vi.fn(async () => null),
  ouvirSessao: vi.fn((cb: (s: null) => void) => {
    cb(null);
    return () => {};
  }),
}));

vi.mock('../dados/erros', async (original) => ({
  ...(await original<typeof import('../dados/erros')>()),
  traduzirErro: (e: unknown) => e,
}));

vi.mock('../componentes/base/useAviso', () => ({
  useAviso: () => ({ mostrar: simulados.mostrar }),
}));

const REGRA = 'Pelo menos 12 caracteres.';
const ERRO_CURTA = 'Use pelo menos 12 caracteres.';
const ERRO_CONFERE = 'As senhas não conferem.';
const VALIDA = 'senha-nova-segura';

function adiado() {
  let resolver!: () => void;
  const promessa = new Promise<void>((res) => {
    resolver = res;
  });
  return { promessa, resolver };
}

function montar() {
  const consulta = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={consulta}>
      <MemoryRouter initialEntries={['/redefinir-senha']}>
        <Routes>
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/entrar" element={<p>Página Entrar</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const campoSenha = () => screen.getByLabelText('Nova senha');
const campoConfirma = () => screen.getByLabelText('Repita a nova senha');

async function enviar(user: ReturnType<typeof userEvent.setup>, senha: string, confirma: string) {
  if (senha) await user.type(campoSenha(), senha);
  if (confirma) await user.type(campoConfirma(), confirma);
  await user.click(screen.getByRole('button', { name: 'Salvar senha' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  simulados.estadoRecuperacao.mockResolvedValue('pronta');
  simulados.sair.mockResolvedValue(undefined);
});

describe('T01b Redefinir senha', () => {
  it('formulário com título, campos new-password e link para Entrar', () => {
    montar();

    expect(screen.getByRole('heading', { level: 1, name: 'Nova senha' })).toBeInTheDocument();
    expect(campoSenha()).toHaveAttribute('type', 'password');
    expect(campoSenha()).toHaveAttribute('autocomplete', 'new-password');
    expect(campoConfirma()).toHaveAttribute('type', 'password');
    expect(campoConfirma()).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByRole('link', { name: 'Voltar para Entrar' })).toHaveAttribute('href', '/entrar');
    expect(screen.queryByRole('button', { name: /Mostrar senha/ })).toBeNull();
  });

  it('regra de 12 caracteres visível e ligada ao campo antes de qualquer erro', () => {
    montar();

    expect(screen.getByText(REGRA)).toBeVisible();
    expect(campoSenha()).toHaveAccessibleDescription(REGRA);
    expect(campoSenha()).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('11 caracteres: erro no campo, sem a regra, foco na senha e nada enviado', async () => {
    const user = userEvent.setup();
    montar();

    await enviar(user, '12345678901', '12345678901');

    expect(campoSenha()).toHaveAttribute('aria-invalid', 'true');
    expect(campoSenha()).toHaveAccessibleDescription(ERRO_CURTA);
    expect(screen.queryByText(REGRA)).toBeNull();
    expect(campoSenha()).toHaveFocus();
    expect(simulados.salvarNovaSenha).not.toHaveBeenCalled();
  });

  it('senhas diferentes: erro na confirmação', async () => {
    const user = userEvent.setup();
    montar();

    await enviar(user, VALIDA, `${VALIDA}x`);

    expect(campoConfirma()).toHaveAttribute('aria-invalid', 'true');
    expect(campoConfirma()).toHaveAccessibleDescription(ERRO_CONFERE);
    expect(campoSenha()).not.toHaveAttribute('aria-invalid', 'true');
    expect(campoConfirma()).toHaveFocus();
    expect(simulados.salvarNovaSenha).not.toHaveBeenCalled();
  });

  it('os dois erros juntos (estado do mockup), foco na senha', async () => {
    const user = userEvent.setup();
    montar();

    await enviar(user, '12345678', '123456789');

    expect(campoSenha()).toHaveAccessibleDescription(ERRO_CURTA);
    expect(campoConfirma()).toHaveAccessibleDescription(ERRO_CONFERE);
    expect(campoSenha()).toHaveFocus();
    expect(simulados.salvarNovaSenha).not.toHaveBeenCalled();
  });

  it('válido: "Salvando…" e uma só chamada', async () => {
    const pendente = adiado();
    simulados.salvarNovaSenha.mockReturnValue(pendente.promessa);
    const user = userEvent.setup();
    montar();

    await enviar(user, VALIDA, VALIDA);

    const ocupado = await screen.findByRole('button', { name: /Salvando…/ });
    expect(ocupado).toHaveAttribute('aria-disabled', 'true');
    await user.click(ocupado);
    expect(simulados.salvarNovaSenha).toHaveBeenCalledTimes(1);
    expect(simulados.salvarNovaSenha).toHaveBeenCalledWith(VALIDA);

    pendente.resolver();
  });

  it('sucesso: sai localmente, avisa "Senha alterada" e vai para /entrar', async () => {
    simulados.salvarNovaSenha.mockResolvedValue(undefined);
    const user = userEvent.setup();
    montar();

    await enviar(user, VALIDA, VALIDA);

    expect(await screen.findByText('Página Entrar')).toBeInTheDocument();
    expect(simulados.sair).toHaveBeenCalledTimes(1);
    expect(simulados.salvarNovaSenha.mock.invocationCallOrder[0]).toBeLessThan(
      simulados.sair.mock.invocationCallOrder[0],
    );
    expect(simulados.mostrar).toHaveBeenCalledWith('sucesso', expect.stringMatching(/^Senha alterada/));
  });

  it('Auth recusa por link expirado: aviso de link expirado no topo', async () => {
    simulados.salvarNovaSenha.mockRejectedValue({ tipo: 'regra', codigo: 'link_expirado' });
    const user = userEvent.setup();
    montar();

    await enviar(user, VALIDA, VALIDA);

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/expir/i);
    expect(alerta.compareDocumentPosition(campoSenha()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(simulados.sair).not.toHaveBeenCalled();
    expect(screen.queryByText('Página Entrar')).toBeNull();
  });

  it('link expirado na URL: aviso aparece ao abrir a tela', async () => {
    simulados.estadoRecuperacao.mockResolvedValue('expirado');
    montar();

    expect(await screen.findByRole('alert')).toHaveTextContent(/expir/i);
    expect(screen.getByRole('link', { name: 'Voltar para Entrar' })).toHaveAttribute('href', '/entrar');
  });

  it('sem rede: "Sem conexão." no topo e campos mantidos', async () => {
    simulados.salvarNovaSenha.mockRejectedValue({ tipo: 'rede' });
    const user = userEvent.setup();
    montar();

    await enviar(user, VALIDA, VALIDA);

    expect(await screen.findByRole('alert')).toHaveTextContent(/^Sem conexão\.$/);
    expect(campoSenha()).toHaveValue(VALIDA);
    expect(campoConfirma()).toHaveValue(VALIDA);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar senha' })).toBeInTheDocument());
  });
});
