import { describe, expect, it } from 'vitest';
import contaNubank from '../../../.md/mockup/respostas/conta-nubank.json';
import contasVazio from '../../../.md/mockup/respostas/contas-vazio.json';
import contas from '../../../.md/mockup/respostas/contas.json';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

const NUBANK = '00000000-0000-4000-8000-000000000201';
const ITAU = '00000000-0000-4000-8000-000000000202';
const CONTA_DE_ANA = '00000000-0000-4000-8000-000000000211';

interface LinhaConta {
  id: string;
  nome: string;
  saldo_centavos: number;
}

describe('api.contas', () => {
  it('A lê as contas do seed, no formato de contas.json', async () => {
    const { data, error } = await (await comoA()).from('contas').select();
    expect(error).toBeNull();
    const linhas = data as unknown as LinhaConta[];
    const ids = linhas.map((l) => l.id);
    expect(ids).toEqual(expect.arrayContaining([NUBANK, ITAU]));
    expect(ids).not.toContain(CONTA_DE_ANA);
    mesmaForma(linhas, contas);
    for (const l of linhas) expect(Number.isInteger(l.saldo_centavos)).toBe(true);
  });

  it('o detalhe da Nubank sai no formato de conta-nubank.json', async () => {
    const { data, error } = await (await comoA()).from('contas').select().eq('id', NUBANK);
    expect(error).toBeNull();
    const linhas = data as unknown as LinhaConta[];
    expect(linhas).toHaveLength(1);
    mesmaForma(linhas, contaNubank);
    expect(linhas[0]).toMatchObject({ id: NUBANK, nome: 'Nubank' });
  });

  it('B não recebe as contas de A por lista, id nem contagem', async () => {
    const b = await comoB();
    const lista = await b.from('contas').select('id');
    expect(lista.error).toBeNull();
    const ids = (lista.data as unknown as { id: string }[]).map((l) => l.id);
    expect(ids).not.toContain(NUBANK);
    expect(ids).not.toContain(ITAU);
    expect(ids).toContain(CONTA_DE_ANA);

    const um = await b.from('contas').select().eq('id', NUBANK);
    expect(um.error).toBeNull();
    expect(um.data).toEqual([]);

    const deA = await b.from('contas').select('id', { count: 'exact', head: true }).in('id', [NUBANK, ITAU]);
    expect(deA.error).toBeNull();
    expect(deA.count).toBe(0);
    const todas = await b.from('contas').select('id', { count: 'exact', head: true });
    expect(todas.count).toBe(ids.length);
  });

  it('a view não aceita insert, update nem delete; nada muda', async () => {
    for (const sessao of [await comoA(), await comoB()]) {
      const ins = await sessao.from('contas').insert({ nome: 'x' });
      expect(ins.error?.code).toBe('42501');
      const upd = await sessao.from('contas').update({ nome: 'x' }).eq('id', NUBANK);
      expect(upd.error?.code).toBe('42501');
      const del = await sessao.from('contas').delete().eq('id', NUBANK);
      expect(del.error?.code).toBe('42501');
    }
    const { data } = await (await comoA()).from('contas').select('nome').eq('id', NUBANK);
    expect(data).toEqual([{ nome: 'Nubank' }]);
  });

  it('usuário sem membro lê vazio, no formato de contas-vazio.json', async () => {
    const { data, error } = await (await comoSemMembro()).from('contas').select();
    expect(error).toBeNull();
    expect(data).toEqual([]);
    mesmaForma(data, contasVazio);
  });

  it('anon não lê a view', async () => {
    const { data, error } = await (await comoAnon()).from('contas').select();
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
