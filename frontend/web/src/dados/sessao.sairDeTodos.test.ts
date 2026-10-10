import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarFetchSimulado, json, lerResposta, rotasAuth, USUARIO, type Rota } from '../../test/apoio/fetchSimulado';

let simulado: ReturnType<typeof criarFetchSimulado>;

const logoutGlobal = (resposta: () => Response): Rota => ({ url }) =>
  url.pathname.endsWith('/auth/v1/logout') && url.searchParams.get('scope') === 'global' ? resposta() : undefined;

async function carregar(...rotasExtras: Rota[]) {
  simulado = criarFetchSimulado(...rotasExtras, rotasAuth);
  vi.stubGlobal('fetch', simulado.fetch);
  vi.resetModules();
  const sessao = await import('./sessao');
  const cache = await import('./local/cacheDadosLancamento');
  const dados = lerResposta('dados-lancamento.json') as never;
  return { ...sessao, ...cache, dados };
}

const escopos = () => simulado.chamadasA('/auth/v1/logout').map((c) => c.url.searchParams.get('scope'));

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
  vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-falsa');
  vi.stubEnv('VITE_MODO_COMPARACAO', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('sairDeTodos', () => {
  it('revoga no servidor e só então remove a sessão local e o cache', async () => {
    const t = await carregar(logoutGlobal(() => new Response(null, { status: 204 })));
    await t.entrar('leandro@exemplo.com', 'senha-de-teste');
    await t.salvarCache(USUARIO.id, t.dados);
    const eventos: unknown[] = [];
    t.ouvirSessao((s) => eventos.push(s));
    await vi.waitFor(() => expect(eventos.length).toBeGreaterThan(0));
    eventos.length = 0;

    await t.sairDeTodos();

    expect(escopos()).toEqual(['global', 'local']);
    expect(await t.obterSessao()).toBeNull();
    expect(eventos).toEqual([null]);
    expect(await t.lerCache(USUARIO.id)).toBeUndefined();
  });

  it('rede caindo mantém a sessão, o cache e não emite SIGNED_OUT', async () => {
    const t = await carregar(
      logoutGlobal(() => {
        throw new TypeError('Failed to fetch');
      }),
    );
    await t.entrar('leandro@exemplo.com', 'senha-de-teste');
    await t.salvarCache(USUARIO.id, t.dados);
    const antes = await t.obterSessao();
    const eventos: unknown[] = [];
    t.ouvirSessao((s) => eventos.push(s));
    await vi.waitFor(() => expect(eventos.length).toBeGreaterThan(0));
    eventos.length = 0;

    await expect(t.sairDeTodos()).rejects.toEqual({ tipo: 'rede' });

    expect(escopos()).toEqual(['global']);
    expect((await t.obterSessao())?.access_token).toBe(antes?.access_token);
    expect(eventos).toEqual([]);
    expect((await t.lerCache(USUARIO.id))?.dados).toEqual(t.dados);
  });

  it('500 do Auth mantém a sessão e o cache e informa indisponibilidade', async () => {
    const t = await carregar(logoutGlobal(() => json({ message: 'erro' }, 500)));
    await t.entrar('leandro@exemplo.com', 'senha-de-teste');
    await t.salvarCache(USUARIO.id, t.dados);

    await expect(t.sairDeTodos()).rejects.toEqual({ tipo: 'indisponivel' });

    expect(escopos()).toEqual(['global']);
    expect(await t.obterSessao()).not.toBeNull();
    expect((await t.lerCache(USUARIO.id))?.dados).toEqual(t.dados);
  });

  it.each([401, 403, 404])('%i do logout global conta como sucesso e limpa o aparelho', async (status) => {
    const t = await carregar(logoutGlobal(() => json({ message: 'sem sessão' }, status)));
    await t.entrar('leandro@exemplo.com', 'senha-de-teste');
    await t.salvarCache(USUARIO.id, t.dados);

    await t.sairDeTodos();

    expect(await t.obterSessao()).toBeNull();
    expect(await t.lerCache(USUARIO.id)).toBeUndefined();
  });

  it('sem sessão não chama a rede e apaga o cache', async () => {
    const t = await carregar();
    await t.salvarCache(USUARIO.id, t.dados);

    await t.sairDeTodos();

    expect(simulado.chamadas).toEqual([]);
    expect(await t.lerCache(USUARIO.id)).toBeUndefined();
  });

  it('envia o JWT do usuário e nenhuma chave de serviço', async () => {
    const t = await carregar(logoutGlobal(() => new Response(null, { status: 204 })));
    await t.entrar('leandro@exemplo.com', 'senha-de-teste');
    const sessao = await t.obterSessao();

    await t.sairDeTodos();

    const global = simulado.chamadasA('/auth/v1/logout')[0]!;
    expect(global.cabecalhos.get('Authorization')).toBe(`Bearer ${sessao?.access_token}`);
    expect(global.cabecalhos.get('apikey')).toBe('chave-falsa');
  });
});
