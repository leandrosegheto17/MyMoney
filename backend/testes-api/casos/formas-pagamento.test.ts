import { describe, expect, it } from 'vitest';
import formaXp from '../../../.md/mockup/respostas/forma-xp.json';
import formasVazio from '../../../.md/mockup/respostas/formas-vazio.json';
import formas from '../../../.md/mockup/respostas/formas-pagamento.json';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

const PIX = '00000000-0000-4000-8000-000000000301';
const DEBITO = '00000000-0000-4000-8000-000000000302';
const XP = '00000000-0000-4000-8000-000000000303';
const NUBANK = '00000000-0000-4000-8000-000000000201';
const ITAU = '00000000-0000-4000-8000-000000000202';

// A view tem join: o Postgres a recusa como não atualizável (55000) antes de checar o privilégio (42501).
const REJEICOES = ['42501', '55000'];

interface LinhaForma {
  id: string;
  nome: string;
  tipo: string;
  conta: { id: string; nome: string } | null;
  gasto_mes_centavos: number | null;
  comprometido_futuro_centavos: number | null;
}

describe('api.formas_pagamento', () => {
  it('A lê as formas do seed, no formato de formas-pagamento.json', async () => {
    const { data, error } = await (await comoA()).from('formas_pagamento').select();
    expect(error).toBeNull();
    const linhas = data as unknown as LinhaForma[];
    expect(linhas.map((l) => l.id)).toEqual(expect.arrayContaining([PIX, DEBITO, XP]));
    // A view não tem ordem garantida: compara o formato do Pix (primeiro item do exemplo), não a primeira linha lida.
    mesmaForma([linhas.find((l) => l.id === PIX)], formas);
    const xp = linhas.find((l) => l.id === XP);
    expect(Number.isInteger(xp?.gasto_mes_centavos)).toBe(true);
    expect(Number.isInteger(xp?.comprometido_futuro_centavos)).toBe(true);
    const pix = linhas.find((l) => l.id === PIX);
    expect(pix?.gasto_mes_centavos).toBeNull();
    expect(pix?.comprometido_futuro_centavos).toBeNull();
    expect(pix?.conta).toEqual({ id: NUBANK, nome: 'Nubank' });
  });

  it('o detalhe do cartão XP sai no formato de forma-xp.json', async () => {
    const { data, error } = await (await comoA()).from('formas_pagamento').select().eq('id', XP);
    expect(error).toBeNull();
    const linhas = data as unknown as LinhaForma[];
    expect(linhas).toHaveLength(1);
    mesmaForma(linhas, formaXp);
    expect(linhas[0]).toMatchObject({ id: XP, tipo: 'credito', conta: { id: ITAU, nome: 'Itaú' } });
  });

  it('B não recebe as formas nem as contas de A', async () => {
    const b = await comoB();
    const lista = await b.from('formas_pagamento').select();
    expect(lista.error).toBeNull();
    const linhas = lista.data as unknown as LinhaForma[];
    const ids = linhas.map((l) => l.id);
    for (const id of [PIX, DEBITO, XP]) expect(ids).not.toContain(id);
    for (const l of linhas) {
      expect(l.conta?.id).not.toBe(NUBANK);
      expect(l.conta?.id).not.toBe(ITAU);
    }

    const um = await b.from('formas_pagamento').select().eq('id', XP);
    expect(um.error).toBeNull();
    expect(um.data).toEqual([]);

    const deA = await b
      .from('formas_pagamento')
      .select('id', { count: 'exact', head: true })
      .in('id', [PIX, DEBITO, XP]);
    expect(deA.error).toBeNull();
    expect(deA.count).toBe(0);
    const todas = await b.from('formas_pagamento').select('id', { count: 'exact', head: true });
    expect(todas.count).toBe(ids.length);
  });

  it('a view não aceita insert, update nem delete; nada muda', async () => {
    for (const sessao of [await comoA(), await comoB()]) {
      const ins = await sessao.from('formas_pagamento').insert({ nome: 'x' });
      expect(REJEICOES).toContain(ins.error?.code);
      const upd = await sessao.from('formas_pagamento').update({ nome: 'x' }).eq('id', XP);
      expect(REJEICOES).toContain(upd.error?.code);
      const del = await sessao.from('formas_pagamento').delete().eq('id', XP);
      expect(REJEICOES).toContain(del.error?.code);
    }
    const { data } = await (await comoA()).from('formas_pagamento').select('nome').eq('id', XP);
    expect(data).toEqual([{ nome: 'Cartão de crédito XP' }]);
  });

  it('usuário sem membro lê vazio, no formato de formas-vazio.json', async () => {
    const { data, error } = await (await comoSemMembro()).from('formas_pagamento').select();
    expect(error).toBeNull();
    expect(data).toEqual([]);
    mesmaForma(data, formasVazio);
  });

  it('anon não lê a view', async () => {
    const { data, error } = await (await comoAnon()).from('formas_pagamento').select();
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
