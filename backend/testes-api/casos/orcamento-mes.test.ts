import { describe, expect, it } from 'vitest';
import exemplo from '../../../.md/mockup/respostas/orcamento-mes.json';
import vazio from '../../../.md/mockup/respostas/orcamento-mes-vazio.json';
import { esperarRegistroInvalido } from '../src/esperar';
import { mesmaForma } from '../src/mesma-forma';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

interface OrcamentoMes {
  pode_copiar_anterior: { conjunto: boolean; individual: boolean };
  sem_orcamento: unknown[];
}

const INDIVIDUAL_DE_A = '00000000-0000-4000-8000-000000000412';
const ORCAMENTO_INDIVIDUAL_DE_A = '00000000-0000-4000-8000-000000000711';

describe('api.orcamento_mes', () => {
  it('A recebe outubro no formato do exemplo', async () => {
    const { data, error } = await (await comoA()).rpc('orcamento_mes', { p_mes: '2026-10-01', p_escopo: 'conjunto' });
    expect(error).toBeNull();
    mesmaForma(data, exemplo);
  });

  it('mês sem orçamento tem a forma do exemplo vazio', async () => {
    const { data, error } = await (await comoA()).rpc('orcamento_mes', { p_mes: '2026-11-01', p_escopo: 'conjunto' });
    expect(error).toBeNull();
    mesmaForma(data, vazio);
  });

  it('B não recebe categoria nem orçamento individual de A e obtém o mesmo conjunto', async () => {
    const a = await (await comoA()).rpc('orcamento_mes', { p_mes: '2026-10-01', p_escopo: 'conjunto' });
    const b = await (await comoB()).rpc('orcamento_mes', { p_mes: '2026-10-01', p_escopo: 'individual' });
    const bConjunto = await (await comoB()).rpc('orcamento_mes', { p_mes: '2026-10-01', p_escopo: 'conjunto' });
    expect(b.error).toBeNull();
    expect(bConjunto.error).toBeNull();
    const texto = JSON.stringify(b.data);
    expect(texto).not.toContain(INDIVIDUAL_DE_A);
    expect(texto).not.toContain(ORCAMENTO_INDIVIDUAL_DE_A);
    expect(bConjunto.data).toEqual(a.data);
  });

  it('orçamento individual de A não altera o que B enxerga', async () => {
    const consulta = () => comoB().then((b) => b.rpc('orcamento_mes', { p_mes: '2027-02-01', p_escopo: 'individual' }));
    const antes = await consulta();
    expect(antes.error).toBeNull();
    const a = await comoA();
    const define = await a.rpc('definir_orcamento', {
      p_mes: '2027-02-01',
      p_categoria_id: INDIVIDUAL_DE_A,
      p_valor_centavos: 5000,
    });
    expect(define.error).toBeNull();
    const durante = await consulta();
    const remove = await a.rpc('definir_orcamento', {
      p_mes: '2027-02-01',
      p_categoria_id: INDIVIDUAL_DE_A,
      p_valor_centavos: null,
    });
    expect(remove.error).toBeNull();
    const depois = await consulta();
    for (const r of [durante, depois]) {
      expect(r.error).toBeNull();
      expect((r.data as OrcamentoMes).pode_copiar_anterior.individual).toBe(
        (antes.data as OrcamentoMes).pode_copiar_anterior.individual,
      );
      expect((r.data as OrcamentoMes).sem_orcamento).toEqual((antes.data as OrcamentoMes).sem_orcamento);
    }
  });

  it('escopo inválido é recusado', async () => {
    const r = await (await comoA()).rpc('orcamento_mes', { p_mes: '2026-10-01', p_escopo: 'casal' });
    expect(r.error?.message).toBe('valor_invalido');
  });

  it('sem membro recebe registro_invalido', async () => {
    await esperarRegistroInvalido(
      (await comoSemMembro()).rpc('orcamento_mes', { p_mes: '2026-10-01', p_escopo: 'conjunto' }),
    );
  });

  it('anon não executa', async () => {
    const r = await (await comoAnon()).rpc('orcamento_mes', { p_mes: '2026-10-01', p_escopo: 'conjunto' });
    expect(r.error).not.toBeNull();
  });
});
