import { describe, expect, it } from 'vitest';
import fixa from '../../../.md/mockup/respostas/despesa-fixa.json';
import fixasVazio from '../../../.md/mockup/respostas/despesas-fixas-vazio.json';
import fixas from '../../../.md/mockup/respostas/despesas-fixas.json';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

const ALUGUEL = '00000000-0000-4000-8000-000000000701';

// A view tem join: o Postgres a recusa como não atualizável (55000) antes de checar o privilégio (42501).
const REJEICOES = ['42501', '55000'];

describe('api.despesas_fixas', () => {
  it('A lê os 7 modelos do seed, no formato de despesas-fixas.json', async () => {
    const { data, error } = await (await comoA()).from('despesas_fixas').select();
    expect(error).toBeNull();
    expect(data).toHaveLength(7);
    mesmaForma(data, fixas);
  });

  it('B lê os mesmos 7 modelos (visíveis aos dois)', async () => {
    const a = await (await comoA()).from('despesas_fixas').select('id');
    const b = await (await comoB()).from('despesas_fixas').select('id');
    expect(b.error).toBeNull();
    expect(b.data).toHaveLength(7);
    const ids = (r: typeof a.data) => (r ?? []).map((l) => (l as { id: string }).id).sort();
    expect(ids(b.data)).toEqual(ids(a.data));
  });

  it('o detalhe sai no formato de despesa-fixa.json', async () => {
    const { data, error } = await (await comoA()).from('despesas_fixas').select().eq('id', ALUGUEL);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    mesmaForma(data, fixa);
  });

  it('nenhuma linha traz lar_id nem campo privado', async () => {
    const { data } = await (await comoA()).from('despesas_fixas').select();
    for (const linha of data ?? []) {
      expect(Object.keys(linha).sort()).toEqual(
        [
          'categoria',
          'categoria_id',
          'descricao',
          'dia_vencimento',
          'encerrada_em',
          'id',
          'valor_previsto_centavos',
        ].sort(),
      );
    }
  });

  it('usuário sem membro lê vazio, com count 0', async () => {
    const sessao = await comoSemMembro();
    const { data, error } = await sessao.from('despesas_fixas').select();
    expect(error).toBeNull();
    expect(data).toEqual([]);
    mesmaForma(data, fixasVazio);
    const contagem = await sessao.from('despesas_fixas').select('id', { count: 'exact', head: true });
    expect(contagem.count).toBe(0);
  });

  it('anon não lê a view', async () => {
    const { data, error } = await (await comoAnon()).from('despesas_fixas').select();
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it('a view não aceita insert, update nem delete; nada muda', async () => {
    for (const sessao of [await comoA(), await comoB()]) {
      const ins = await sessao.from('despesas_fixas').insert({ descricao: 'x' });
      expect(REJEICOES).toContain(ins.error?.code);
      const upd = await sessao.from('despesas_fixas').update({ descricao: 'x' }).eq('id', ALUGUEL);
      expect(REJEICOES).toContain(upd.error?.code);
      const del = await sessao.from('despesas_fixas').delete().eq('id', ALUGUEL);
      expect(REJEICOES).toContain(del.error?.code);
    }
    const { data } = await (await comoA()).from('despesas_fixas').select('descricao').eq('id', ALUGUEL);
    expect(data).toEqual([{ descricao: 'Aluguel' }]);
  });
});
