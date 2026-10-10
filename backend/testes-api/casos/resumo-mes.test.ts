import { describe, expect, it } from 'vitest';
import exemplo from '../../../.md/mockup/respostas/resumo-mes.json';
import vazio from '../../../.md/mockup/respostas/resumo-mes-vazio.json';
import { esperarRegistroInvalido } from '../src/esperar';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

interface Resumo {
  conjunto: unknown;
  individual: unknown;
}

const mes = '2026-10-01';
const mesSemDado = '2030-01-01';

describe('api.resumo_mes', () => {
  it('A recebe o resumo no formato do exemplo', async () => {
    const { data, error } = await (await comoA()).rpc('resumo_mes', { p_mes: mes });
    expect(error).toBeNull();
    mesmaForma(data, exemplo);
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

  it('usuário sem membro recebe registro_invalido', async () => {
    await esperarRegistroInvalido((await comoSemMembro()).rpc('resumo_mes', { p_mes: mes }));
  });

  it('anon não executa', async () => {
    const { error } = await (await comoAnon()).rpc('resumo_mes', { p_mes: mes });
    expect(error).not.toBeNull();
  });
});
