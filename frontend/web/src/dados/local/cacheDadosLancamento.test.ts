import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { createStore, get, set } from 'idb-keyval';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lerResposta } from '../../../test/apoio/fetchSimulado';

const A = '00000000-0000-4000-8000-0000000000a1';
const B = '00000000-0000-4000-8000-0000000000b1';

async function carregar() {
  vi.resetModules();
  return import('./cacheDadosLancamento');
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe('cacheDadosLancamento', () => {
  it('guarda e lê a resposta do mesmo usuário, com a hora em que foi salva', async () => {
    const { salvarCache, lerCache } = await carregar();
    const dados = lerResposta('dados-lancamento.json');
    const antes = Date.now();

    await salvarCache(A, dados as never);
    const lido = await lerCache(A);

    expect(lido).toMatchObject({ dados });
    expect(lido?.salvoEm).toBeGreaterThanOrEqual(antes);
    expect(lido?.salvoEm).toBeLessThanOrEqual(Date.now());
  });

  it('outro usuário no mesmo aparelho não lê o cache do primeiro', async () => {
    const { salvarCache, lerCache } = await carregar();

    await salvarCache(A, lerResposta('dados-lancamento.json') as never);

    expect(await lerCache(B)).toBeUndefined();
  });

  it('sem nada salvo devolve undefined', async () => {
    const { lerCache } = await carregar();
    expect(await lerCache(A)).toBeUndefined();
  });

  it('nova gravação sobrescreve a anterior', async () => {
    const { salvarCache, lerCache } = await carregar();

    await salvarCache(A, lerResposta('dados-lancamento.json') as never);
    await salvarCache(A, lerResposta('dados-lancamento-sem-formas.json') as never);

    expect((await lerCache(A))?.dados).toEqual(lerResposta('dados-lancamento-sem-formas.json'));
  });

  it('apagarCache limpa o cache', async () => {
    const { salvarCache, lerCache, apagarCache } = await carregar();

    await salvarCache(A, lerResposta('dados-lancamento.json') as never);
    await apagarCache();

    expect(await lerCache(A)).toBeUndefined();
  });

  it('apagarCache não toca no banco da fila', async () => {
    const { salvarCache, apagarCache } = await carregar();
    const armazemFila = createStore('mymoney-fila', 'itens');
    await set('item-1', { id: 'item-1', dono: A }, armazemFila);

    await salvarCache(A, lerResposta('dados-lancamento.json') as never);
    await apagarCache();

    expect(await get('item-1', armazemFila)).toEqual({ id: 'item-1', dono: A });
  });
});
