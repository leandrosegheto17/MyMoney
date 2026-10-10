import { describe, expect, it } from 'vitest';
import categorias from '../../../.md/mockup/respostas/categorias.json';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

const MERCADO = '00000000-0000-4000-8000-000000000401';
const INDIVIDUAL_DE_A = '00000000-0000-4000-8000-000000000411';
const SALARIO = '00000000-0000-4000-8000-000000000421';

interface LinhaCategoria {
  id: string;
  tipo: string;
  variavel: boolean | null;
  pode_excluir: boolean;
}

describe('api.categorias', () => {
  it('A lê as 5 conjuntas e as 8 individuais, no formato de categorias.json', async () => {
    const { data, error } = await (await comoA()).from('categorias').select();
    expect(error).toBeNull();
    const linhas = data as unknown as LinhaCategoria[];
    expect(linhas).toHaveLength(13);
    mesmaForma(linhas, categorias);
    const despesa = linhas.find((l) => l.id === MERCADO);
    expect(typeof despesa?.variavel).toBe('boolean');
    expect(linhas.find((l) => l.id === SALARIO)?.variavel).toBeNull();
    for (const l of linhas) expect(typeof l.pode_excluir).toBe('boolean');
  });

  it('B não recebe as individuais de A por lista, id nem contagem', async () => {
    const b = await comoB();
    const lista = await b.from('categorias').select('id');
    expect(lista.error).toBeNull();
    const ids = (lista.data as unknown as { id: string }[]).map((l) => l.id);
    expect(ids).toContain(MERCADO);
    expect(ids).not.toContain(INDIVIDUAL_DE_A);
    expect(ids).not.toContain(SALARIO);

    const um = await b.from('categorias').select().eq('id', INDIVIDUAL_DE_A);
    expect(um.error).toBeNull();
    expect(um.data).toEqual([]);

    const todas = await b.from('categorias').select('id', { count: 'exact', head: true });
    expect(todas.error).toBeNull();
    expect(todas.count).toBe(ids.length);
  });

  it('a view não aceita insert, update nem delete; nada muda', async () => {
    for (const sessao of [await comoA(), await comoB()]) {
      const ins = await sessao.from('categorias').insert({ nome: 'x' });
      expect(ins.error?.code).toBe('42501');
      const upd = await sessao.from('categorias').update({ nome: 'x' }).eq('id', MERCADO);
      expect(upd.error?.code).toBe('42501');
      const del = await sessao.from('categorias').delete().eq('id', MERCADO);
      expect(del.error?.code).toBe('42501');
    }
    const { data } = await (await comoA()).from('categorias').select('nome').eq('id', MERCADO);
    expect(data).toEqual([{ nome: 'Mercado' }]);
  });

  it('usuário sem membro lê vazio', async () => {
    const { data, error } = await (await comoSemMembro()).from('categorias').select();
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('anon não lê a view', async () => {
    const { data, error } = await (await comoAnon()).from('categorias').select();
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
