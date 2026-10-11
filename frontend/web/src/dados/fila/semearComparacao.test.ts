import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import usuario from '../../../../../.md/mockup/respostas/auth-usuario.json';
import filaMockup from '../../../../../.md/mockup/respostas/fila-offline.json';
import { gravarItem, lerTodos, removerItem } from './armazem';
import { semearFilaDeComparacao } from './semearComparacao';
import type { ItemFila } from './tipos';

const itemMockup = filaMockup[0] as unknown as ItemFila;
const resposta = (corpo: unknown) => vi.fn().mockResolvedValue({ ok: true, json: async () => corpo });

beforeEach(async () => {
  for (const i of await lerTodos()) await removerItem(i.id);
  vi.stubEnv('VITE_MODO_COMPARACAO', 'sessao-falsa');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('semearFilaDeComparacao', () => {
  it('grava os itens da resposta com o dono da sessão falsa, trocando o que havia', async () => {
    await gravarItem({ ...itemMockup, id: 'antigo' });
    vi.stubGlobal('fetch', resposta(filaMockup));
    await semearFilaDeComparacao();
    const itens = await lerTodos();
    expect(itens.map((i) => i.id)).toEqual([itemMockup.id]);
    expect(itens[0].dono).toBe(usuario.id);
  });

  it('deixa a fila vazia quando a resposta é vazia', async () => {
    await gravarItem({ ...itemMockup, id: 'antigo' });
    vi.stubGlobal('fetch', resposta([]));
    await semearFilaDeComparacao();
    expect(await lerTodos()).toEqual([]);
  });

  it('não faz nada fora do modo sessao-falsa', async () => {
    vi.stubEnv('VITE_MODO_COMPARACAO', '');
    const f = resposta(filaMockup);
    vi.stubGlobal('fetch', f);
    await semearFilaDeComparacao();
    expect(f).not.toHaveBeenCalled();
  });
});
