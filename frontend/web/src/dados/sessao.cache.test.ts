import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { createStore, get, set } from 'idb-keyval';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarFetchSimulado, lerResposta, rotasAuth, USUARIO, type Rota } from '../../test/apoio/fetchSimulado';

let simulado: ReturnType<typeof criarFetchSimulado>;

async function carregar(...rotasExtras: Rota[]) {
  simulado = criarFetchSimulado(...rotasExtras, rotasAuth);
  vi.stubGlobal('fetch', simulado.fetch);
  vi.resetModules();
  const sessao = await import('./sessao');
  const cache = await import('./local/cacheDadosLancamento');
  return { ...sessao, ...cache };
}

const armazemFila = () => createStore('mymoney-fila', 'itens');
const ITEM_FILA = { id: 'item-1', dono: USUARIO.id, situacao: 'aguardando' };

beforeEach(async () => {
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

describe('sair e o cache de dados do lançamento', () => {
  it('sair() apaga o cache e não apaga a fila do membro', async () => {
    const { entrar, sair, salvarCache, lerCache } = await carregar();
    await entrar('leandro@exemplo.com', 'senha-de-teste');
    await salvarCache(USUARIO.id, lerResposta('dados-lancamento.json') as never);
    await set(ITEM_FILA.id, ITEM_FILA, armazemFila());

    await sair();

    expect(await lerCache(USUARIO.id)).toBeUndefined();
    expect(await get(ITEM_FILA.id, armazemFila())).toEqual(ITEM_FILA);
  });

  it('sairDeTodos() com sucesso também apaga o cache e mantém a fila', async () => {
    const { entrar, sairDeTodos, salvarCache, lerCache } = await carregar();
    await entrar('leandro@exemplo.com', 'senha-de-teste');
    await salvarCache(USUARIO.id, lerResposta('dados-lancamento.json') as never);
    await set(ITEM_FILA.id, ITEM_FILA, armazemFila());

    await sairDeTodos();

    expect(await lerCache(USUARIO.id)).toBeUndefined();
    expect(await get(ITEM_FILA.id, armazemFila())).toEqual(ITEM_FILA);
  });

  it('sairDeTodos() com a rede falhando mantém o cache', async () => {
    const logoutSemRede: Rota = ({ url }) => {
      if (url.pathname.endsWith('/auth/v1/logout')) throw new TypeError('Failed to fetch');
      return undefined;
    };
    const { entrar, sairDeTodos, salvarCache, lerCache } = await carregar(logoutSemRede);
    await entrar('leandro@exemplo.com', 'senha-de-teste');
    await salvarCache(USUARIO.id, lerResposta('dados-lancamento.json') as never);

    await expect(sairDeTodos()).rejects.toEqual({ tipo: 'rede' });

    expect((await lerCache(USUARIO.id))?.dados).toEqual(lerResposta('dados-lancamento.json'));
  });
});
