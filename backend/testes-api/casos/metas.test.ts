import { describe, expect, it } from 'vitest';
import metaCarro from '../../../.md/mockup/respostas/meta-carro.json';
import metaDetalhe from '../../../.md/mockup/respostas/meta-detalhe.json';
import metas from '../../../.md/mockup/respostas/metas.json';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

const M = (n: number) => `00000000-0000-4000-8000-000000000${n}`;
const COMPARTILHADAS = [M(901), M(902)];
const INDIVIDUAIS_DE_A = [M(903), M(904), M(905)];
const INDIVIDUAL_DE_ANA = M(911);

// Colunas da lista (metas.json): o detalhe acrescenta por_local.
const COLUNAS_LISTA =
  'id,nome,escopo,alvo_centavos,guardado_centavos,falta_centavos,percentual,prazo,mensal_necessario_centavos,atingida';

interface LinhaMeta {
  id: string;
  guardado_centavos: number;
  falta_centavos: number;
  percentual: number;
  prazo: string | null;
  mensal_necessario_centavos: number | null;
  atingida: boolean;
  por_local?: unknown[];
}

describe('api.metas', () => {
  it('A lê as 5 metas visíveis, no formato de metas.json', async () => {
    const { data, error } = await (await comoA()).from('metas').select(COLUNAS_LISTA).order('id');
    expect(error).toBeNull();
    const linhas = data as unknown as LinhaMeta[];
    expect(linhas.map((l) => l.id)).toEqual([M(901), M(902), M(903), M(904), M(905)]);
    mesmaForma(linhas, metas);
  });

  it('o detalhe da 902 traz o progresso e por_local, no formato de meta-detalhe.json', async () => {
    const { data, error } = await (await comoA()).from('metas').select('*').eq('id', M(902));
    expect(error).toBeNull();
    const linhas = data as unknown as LinhaMeta[];
    expect(linhas).toHaveLength(1);
    mesmaForma(linhas, metaDetalhe);
    const m = linhas[0]!;
    expect(m).toMatchObject({ guardado_centavos: 620000, falta_centavos: 580000, percentual: 52, prazo: '2027-07' });
    expect(m.por_local).toEqual(metaDetalhe[0]?.por_local);
    // O mensal depende do "hoje" real: só se exige que exista e seja inteiro positivo.
    expect(Number.isInteger(m.mensal_necessario_centavos)).toBe(true);
  });

  it('a 905 sem movimentos devolve por_local vazio, no formato de meta-carro.json', async () => {
    const { data, error } = await (await comoA()).from('metas').select('*').eq('id', M(905));
    expect(error).toBeNull();
    const linhas = data as unknown as LinhaMeta[];
    mesmaForma(linhas, metaCarro);
    expect(linhas[0]).toMatchObject({ guardado_centavos: 0, falta_centavos: 2000000, percentual: 0, prazo: '2028-12', por_local: [] });
  });

  it('B não recebe as individuais de A por lista, id, filtro nem contagem; recebe as compartilhadas com os mesmos números', async () => {
    const b = await comoB();
    const lista = await b.from('metas').select('id');
    expect(lista.error).toBeNull();
    const ids = (lista.data as unknown as { id: string }[]).map((l) => l.id);
    for (const id of INDIVIDUAIS_DE_A) expect(ids).not.toContain(id);
    expect(ids).toEqual(expect.arrayContaining(COMPARTILHADAS));

    for (const id of INDIVIDUAIS_DE_A) {
      const um = await b.from('metas').select('*').eq('id', id);
      expect(um.error).toBeNull();
      expect(um.data).toEqual([]);
    }

    const filtro = await b.from('metas').select('id').eq('escopo', 'individual');
    expect(filtro.error).toBeNull();
    const individuais = (filtro.data as unknown as { id: string }[]).map((l) => l.id);
    for (const id of INDIVIDUAIS_DE_A) expect(individuais).not.toContain(id);

    const contagem = await b.from('metas').select('id', { count: 'exact', head: true }).in('id', INDIVIDUAIS_DE_A);
    expect(contagem.error).toBeNull();
    expect(contagem.count).toBe(0);

    const colunas = 'id,guardado_centavos,falta_centavos,percentual,por_local';
    const deB = await b.from('metas').select(colunas).in('id', COMPARTILHADAS).order('id');
    const deA = await (await comoA()).from('metas').select(colunas).in('id', COMPARTILHADAS).order('id');
    expect(deB.error).toBeNull();
    expect(deB.data).toEqual(deA.data);
  });

  it('A não recebe a individual de Ana', async () => {
    const { data, error } = await (await comoA()).from('metas').select('id').eq('id', INDIVIDUAL_DE_ANA);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('usuário sem membro lê vazio e conta zero', async () => {
    const s = await comoSemMembro();
    const lista = await s.from('metas').select('id');
    expect(lista.error).toBeNull();
    expect(lista.data).toEqual([]);
    const contagem = await s.from('metas').select('id', { count: 'exact', head: true });
    expect(contagem.count).toBe(0);
  });

  it('anon não lê a view', async () => {
    const { data, error } = await (await comoAnon()).from('metas').select('id');
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it('a view não aceita insert, update nem delete; nada muda', async () => {
    for (const sessao of [await comoA(), await comoB()]) {
      const ins = await sessao.from('metas').insert({ nome: 'x', escopo: 'conjunto', alvo_centavos: 1 });
      expect(ins.error).not.toBeNull();
      const upd = await sessao.from('metas').update({ nome: 'x' }).eq('id', M(902));
      expect(upd.error).not.toBeNull();
      const del = await sessao.from('metas').delete().eq('id', M(902));
      expect(del.error).not.toBeNull();
    }
    const { data } = await (await comoA()).from('metas').select('nome').eq('id', M(902));
    expect(data).toEqual([{ nome: 'Viagem Nordeste' }]);
  });
});
