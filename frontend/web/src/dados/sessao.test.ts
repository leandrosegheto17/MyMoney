import type { Session } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarFetchSimulado, json, rotasAuth, USUARIO, type Rota } from '../../test/apoio/fetchSimulado';

type ModuloSessao = typeof import('./sessao');

let simulado: ReturnType<typeof criarFetchSimulado>;

async function carregar(...rotasExtras: Rota[]): Promise<ModuloSessao> {
  simulado = criarFetchSimulado(...rotasExtras, rotasAuth);
  vi.stubGlobal('fetch', simulado.fetch);
  vi.resetModules();
  return import('./sessao');
}

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-falsa');
  vi.stubEnv('VITE_MODO_COMPARACAO', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function tokenGuardado(): string | null {
  for (let i = 0; i < localStorage.length; i++) {
    const chave = localStorage.key(i)!;
    if (/^sb-.+-auth-token$/.test(chave)) return localStorage.getItem(chave);
  }
  return null;
}

describe('entrar', () => {
  it('faz POST /auth/v1/token?grant_type=password e persiste a sessão', async () => {
    const { entrar, obterSessao } = await carregar();
    await entrar('leandro@exemplo.com', 'senha-de-teste');

    const [chamada] = simulado.chamadasA('/auth/v1/token');
    expect(chamada.metodo).toBe('POST');
    expect(chamada.url.searchParams.get('grant_type')).toBe('password');
    expect(chamada.corpo).toMatchObject({ email: 'leandro@exemplo.com', password: 'senha-de-teste' });

    expect(tokenGuardado()).toContain('token-de-acesso-falso');
    const sessao = await obterSessao();
    expect(sessao?.user.id).toBe(USUARIO.id);
  });

  it('credenciais erradas rejeitam com o código genérico', async () => {
    const { entrar } = await carregar(({ url }) =>
      url.pathname.endsWith('/auth/v1/token')
        ? json({ code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400)
        : undefined,
    );
    await expect(entrar('x@exemplo.com', 'errada')).rejects.toEqual({
      tipo: 'regra',
      codigo: 'credenciais_invalidas',
    });
  });

  it('falha de rede rejeita com { tipo: "rede" }', async () => {
    const { entrar } = await carregar(() => {
      throw new TypeError('Failed to fetch');
    });
    await expect(entrar('x@exemplo.com', 'senha')).rejects.toEqual({ tipo: 'rede' });
  });
});

describe('sair', () => {
  it('sair() encerra só esta sessão (scope=local)', async () => {
    const { entrar, sair, obterSessao } = await carregar();
    await entrar('leandro@exemplo.com', 'senha-de-teste');
    await sair();

    const [chamada] = simulado.chamadasA('/auth/v1/logout');
    expect(chamada.url.searchParams.get('scope')).toBe('local');
    expect(await obterSessao()).toBeNull();
  });

  it('sairDeTodos() encerra todas as sessões (scope=global)', async () => {
    const { entrar, sairDeTodos, obterSessao } = await carregar();
    await entrar('leandro@exemplo.com', 'senha-de-teste');
    await sairDeTodos();

    const [chamada] = simulado.chamadasA('/auth/v1/logout');
    expect(chamada.url.searchParams.get('scope')).toBe('global');
    expect(await obterSessao()).toBeNull();
  });
});

describe('pedirRedefinicao', () => {
  it('envia redirect_to terminando em /redefinir-senha', async () => {
    const { pedirRedefinicao } = await carregar();
    await pedirRedefinicao('leandro@exemplo.com');

    const [chamada] = simulado.chamadasA('/auth/v1/recover');
    expect(chamada.metodo).toBe('POST');
    expect(chamada.url.searchParams.get('redirect_to')).toMatch(/\/redefinir-senha$/);
    expect(chamada.corpo).toMatchObject({ email: 'leandro@exemplo.com' });
  });

  it('dá o mesmo resultado para e-mail existente e para usuário não encontrado', async () => {
    const existente = await (await carregar()).pedirRedefinicao('leandro@exemplo.com');
    const inexistente = await (
      await carregar(({ url }) =>
        url.pathname.endsWith('/auth/v1/recover')
          ? json({ code: 404, error_code: 'user_not_found', msg: 'User not found' }, 404)
          : undefined,
      )
    ).pedirRedefinicao('ninguem@exemplo.com');
    expect(inexistente).toEqual(existente);
  });

  it('falha de rede não é escondida', async () => {
    const { pedirRedefinicao } = await carregar(() => {
      throw new TypeError('Failed to fetch');
    });
    await expect(pedirRedefinicao('leandro@exemplo.com')).rejects.toEqual({ tipo: 'rede' });
  });
});

describe('salvarNovaSenha', () => {
  it('faz PUT /auth/v1/user com a nova senha', async () => {
    const { entrar, salvarNovaSenha } = await carregar();
    await entrar('leandro@exemplo.com', 'senha-de-teste');
    await salvarNovaSenha('nova-senha-forte');

    const [chamada] = simulado.chamadasA('/auth/v1/user').filter((c) => c.metodo === 'PUT');
    expect(chamada).toBeDefined();
    expect(chamada.corpo).toMatchObject({ password: 'nova-senha-forte' });
  });
});

describe('ouvirSessao', () => {
  it('emite null sem sessão, a sessão ao entrar e null ao sair; o cancelamento para de notificar', async () => {
    const { entrar, sair, ouvirSessao } = await carregar();
    const recebidas: Array<Session | null> = [];
    const cancelar = ouvirSessao((s) => recebidas.push(s));

    await vi.waitFor(() => expect(recebidas.at(-1)).toBeNull());

    await entrar('leandro@exemplo.com', 'senha-de-teste');
    await vi.waitFor(() => expect(recebidas.at(-1)?.user.id).toBe(USUARIO.id));

    await sair();
    await vi.waitFor(() => expect(recebidas.at(-1)).toBeNull());

    cancelar();
    const quantas = recebidas.length;
    await entrar('leandro@exemplo.com', 'senha-de-teste');
    await new Promise((r) => setTimeout(r, 20));
    expect(recebidas).toHaveLength(quantas);
  });
});
