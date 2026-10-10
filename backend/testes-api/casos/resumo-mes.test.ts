import { describe, expect, it } from 'vitest';
import exemplo from '../../../.md/mockup/respostas/resumo-mes.json';
import vazio from '../../../.md/mockup/respostas/resumo-mes-vazio.json';
import { esperarRegistroInvalido } from '../src/esperar';
import { apagarMetas } from '../src/limpar-metas';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

interface Resumo {
  conjunto: unknown;
  individual: unknown;
}

interface ItemMeta {
  meta_id: string;
  prazo: string | null;
  mensal_necessario_centavos: number | null;
}

interface Bloco {
  metas: ItemMeta[];
  guardado_no_mes_centavos?: number;
}

// `mesmaForma` só olha o primeiro item de um array, e o anulável (prazo, mensal necessário) muda
// de tipo conforme a meta; por isso cada item é comparado com o exemplo de mesma anulabilidade.
function compararMetas(real: ItemMeta[], exemplos: ItemMeta[]): void {
  expect(real.length).toBeGreaterThan(0);
  for (const item of real) {
    const par = exemplos.find(
      (e) =>
        (e.prazo === null) === (item.prazo === null) &&
        (e.mensal_necessario_centavos === null) === (item.mensal_necessario_centavos === null),
    );
    expect(par, `exemplo para ${item.meta_id}`).toBeDefined();
    mesmaForma(item, par);
  }
}

const mes = '2026-10-01';
const META_ISOLAMENTO = 'f6b00000-0000-4000-8000-000000000151';
const APORTE_ISOLAMENTO = 'f6b00000-0000-4000-8000-000000000b51';
const mesSemDado = '2030-01-01';

describe('api.resumo_mes', () => {
  it('A recebe o resumo no formato do exemplo', async () => {
    const { data, error } = await (await comoA()).rpc('resumo_mes', { p_mes: mes });
    expect(error).toBeNull();
    const resumo = data as { conjunto: Bloco; individual: Bloco };
    compararMetas(resumo.conjunto.metas, exemplo.conjunto.metas as ItemMeta[]);
    compararMetas(resumo.individual.metas, exemplo.individual.metas as ItemMeta[]);
    const semMetas = {
      ...resumo,
      conjunto: { ...resumo.conjunto, metas: [] },
      individual: { ...resumo.individual, metas: [] },
    };
    mesmaForma(semMetas, exemplo);
  });

  it('metas: compartilhadas nos dois, individuais só do dono, guardado no mês de A = 50000', async () => {
    const a = (await (await comoA()).rpc('resumo_mes', { p_mes: mes })).data as Resumo;
    const b = (await (await comoB()).rpc('resumo_mes', { p_mes: mes })).data as Resumo;
    const ia = a.individual as Bloco;
    const ib = b.individual as Bloco;
    expect((b.conjunto as Bloco).metas).toEqual((a.conjunto as Bloco).metas);
    expect(ia.guardado_no_mes_centavos).toBe(50000);
    const idsA = ia.metas.map((m) => m.meta_id);
    expect(idsA).toContain('00000000-0000-4000-8000-000000000903');
    expect(idsA.at(-1)).toBe('00000000-0000-4000-8000-000000000904');
    const textoB = JSON.stringify(b);
    for (const id of idsA) expect(textoB).not.toContain(id);
    expect(ib.metas.every((m) => !idsA.includes(m.meta_id))).toBe(true);
  });

  it('mês sem dado tem a forma do exemplo vazio', async () => {
    const { data, error } = await (await comoA()).rpc('resumo_mes', { p_mes: mesSemDado });
    expect(error).toBeNull();
    mesmaForma(data, vazio);
  });

  it('B não recebe conta, cartão, categoria nem lançamento individual de A', async () => {
    const a = await (await comoA()).rpc('resumo_mes', { p_mes: mes });
    expect(a.error).toBeNull();
    const b = await (await comoB()).rpc('resumo_mes', { p_mes: mes });
    expect(b.error).toBeNull();
    const textoB = JSON.stringify(b.data);
    const ids = [
      ...exemplo.individual.contas.map((c) => c.conta_id),
      ...exemplo.individual.credito.map((c) => c.forma_id),
      ...exemplo.individual.por_categoria.map((c) => c.categoria_id),
    ];
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(textoB).not.toContain(id);
    expect((b.data as Resumo).conjunto).toEqual((a.data as Resumo).conjunto);
  });

  it('despesa individual de A não altera o bloco individual de B', async () => {
    const antes = await (await comoB()).rpc('resumo_mes', { p_mes: mes });
    const a = await comoA();
    const id = crypto.randomUUID();
    try {
      const lanca = await a.rpc('lancar_despesa', {
        p_id: id,
        p_valor_centavos: 12345,
        p_categoria_id: exemplo.individual.por_categoria[0]?.categoria_id,
        p_forma_id: '00000000-0000-4000-8000-000000000301',
        p_data: '2026-10-05',
        p_descricao: 'Isolamento resumo',
      });
      expect(lanca.error).toBeNull();
      const depois = await (await comoB()).rpc('resumo_mes', { p_mes: mes });
      expect((depois.data as Resumo).individual).toEqual((antes.data as Resumo).individual);
    } finally {
      // Devolve o seed compartilhado ao estado original, mesmo se a asserção falhar.
      const exclui = await a.rpc('excluir_lancamento', { p_id: id });
      expect(exclui.error).toBeNull();
    }
  });

  it('aporte de A numa meta individual não altera o bloco individual de B', async () => {
    const antes = await (await comoB()).rpc('resumo_mes', { p_mes: mes });
    const a = await comoA();
    try {
      const meta = await a.rpc('salvar_meta', {
        p_id: META_ISOLAMENTO,
        p_nome: 'Meta isolamento resumo',
        p_alvo_centavos: 100000,
        p_escopo: 'individual',
      });
      expect(meta.error).toBeNull();
      const aporte = await a.rpc('movimentar_meta', {
        p_id: APORTE_ISOLAMENTO,
        p_meta_id: META_ISOLAMENTO,
        p_tipo: 'aporte',
        p_valor_centavos: 1000,
        p_data: '2026-10-07',
        p_local: 'Isolamento resumo',
      });
      expect(aporte.error).toBeNull();
      const dela = await a.rpc('resumo_mes', { p_mes: mes });
      expect(((dela.data as Resumo).individual as Bloco).guardado_no_mes_centavos).toBe(51000);
      const depois = await (await comoB()).rpc('resumo_mes', { p_mes: mes });
      expect((depois.data as Resumo).individual).toEqual((antes.data as Resumo).individual);
      expect(JSON.stringify(depois.data)).not.toContain(META_ISOLAMENTO);
    } finally {
      await apagarMetas([META_ISOLAMENTO]);
    }
  });

  it('usuário sem membro recebe registro_invalido', async () => {
    await esperarRegistroInvalido((await comoSemMembro()).rpc('resumo_mes', { p_mes: mes }));
  });

  it('anon não executa', async () => {
    const { error } = await (await comoAnon()).rpc('resumo_mes', { p_mes: mes });
    expect(error).not.toBeNull();
  });
});
