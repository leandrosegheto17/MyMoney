import type { Session } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarFetchSimulado, rotasAuth, USUARIO } from '../../test/apoio/fetchSimulado';

let simulado: ReturnType<typeof criarFetchSimulado>;

async function carregarCom(modo: string) {
  vi.stubEnv('VITE_MODO_COMPARACAO', modo);
  simulado = criarFetchSimulado(rotasAuth);
  vi.stubGlobal('fetch', simulado.fetch);
  vi.resetModules();
  return import('./sessao');
}

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://comparacao.invalid');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-de-comparacao');
});

const DateOriginal = globalThis.Date;

afterEach(() => {
  globalThis.Date = DateOriginal;
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('modoComparacao', () => {
  it('lê o modo da variável', async () => {
    vi.stubEnv('VITE_MODO_COMPARACAO', 'sessao-falsa');
    vi.resetModules();
    expect((await import('./modoComparacao')).modoComparacao()).toBe('sessao-falsa');

    vi.stubEnv('VITE_MODO_COMPARACAO', 'sem-sessao');
    vi.resetModules();
    expect((await import('./modoComparacao')).modoComparacao()).toBe('sem-sessao');

    vi.stubEnv('VITE_MODO_COMPARACAO', '');
    vi.resetModules();
    expect((await import('./modoComparacao')).modoComparacao()).toBeNull();
  });

  it('a sessão falsa usa o usuário de auth-usuario.json e não expira tão cedo', async () => {
    const { sessaoFalsa } = await import('./modoComparacao');
    const sessao = sessaoFalsa();
    expect(sessao.user).toEqual(USUARIO);
    expect(sessao.user.id).toBe('00000000-0000-4000-8000-0000000000a1');
    expect(sessao.access_token).toBeTruthy();
    expect(sessao.expires_at! * 1000).toBeGreaterThan(Date.now() + 24 * 3600 * 1000);
  });
});

describe('sessão em modo sessao-falsa', () => {
  it('obterSessao devolve o usuário falso sem chamar o Auth', async () => {
    const { obterSessao } = await carregarCom('sessao-falsa');
    const sessao = await obterSessao();
    expect(sessao?.user.id).toBe('00000000-0000-4000-8000-0000000000a1');
    expect(simulado.chamadasA('/auth/v1/')).toEqual([]);
  });

  it('ouvirSessao emite a sessão falsa', async () => {
    const { ouvirSessao } = await carregarCom('sessao-falsa');
    const recebidas: Array<Session | null> = [];
    const cancelar = ouvirSessao((s) => recebidas.push(s));
    await vi.waitFor(() => expect(recebidas.at(-1)?.user.id).toBe(USUARIO.id));
    cancelar();
    expect(simulado.chamadasA('/auth/v1/')).toEqual([]);
  });
});

describe('sessão em modo sem-sessao', () => {
  it('obterSessao devolve null e ouvirSessao emite null, sem nenhuma chamada', async () => {
    const { obterSessao, ouvirSessao } = await carregarCom('sem-sessao');
    expect(await obterSessao()).toBeNull();

    const recebidas: Array<Session | null> = [];
    const cancelar = ouvirSessao((s) => recebidas.push(s));
    await vi.waitFor(() => expect(recebidas).toContain(null));
    cancelar();

    expect(simulado.chamadas).toEqual([]);
  });
});

describe('sem a variável', () => {
  it('o comportamento normal continua: entrar chama o Auth', async () => {
    const { entrar, obterSessao } = await carregarCom('');
    expect(await obterSessao()).toBeNull();
    await entrar('leandro@exemplo.com', 'senha-de-teste');
    expect(simulado.chamadasA('/auth/v1/token')).toHaveLength(1);
    expect((await obterSessao())?.user.id).toBe(USUARIO.id);
  });
});

describe('relógio do modo', () => {
  it('com o modo ligado, hojeEmSaoPaulo devolve 2026-10-09', async () => {
    vi.stubEnv('VITE_MODO_COMPARACAO', 'sem-sessao');
    vi.resetModules();
    await import('./modoComparacao');
    const { hojeEmSaoPaulo } = await import('../formatacao/data');
    expect(hojeEmSaoPaulo()).toBe('2026-10-09');
    expect(new Date(2020, 0, 1).getFullYear()).toBe(2020);
  });

  it('sem o modo, a data real', async () => {
    vi.stubEnv('VITE_MODO_COMPARACAO', '');
    vi.resetModules();
    await import('./modoComparacao');
    const { hojeEmSaoPaulo } = await import('../formatacao/data');
    expect(hojeEmSaoPaulo()).toBe(hojeEmSaoPaulo(new DateOriginal()));
    expect(globalThis.Date).toBe(DateOriginal);
  });
});
