import { describe, expect, it } from 'vitest';
import { comoA, comoAnon, comoB } from '../src/sessoes';

interface OrcamentoMes {
  pode_copiar_anterior: { conjunto: boolean; individual: boolean };
  linhas: { categoria_id: string; orcado_centavos: number }[];
}

const INDIVIDUAL_DE_A = '00000000-0000-4000-8000-000000000412';
const MES = '2026-11-01';

const orcamentoMes = async (quem: typeof comoA, escopo: 'conjunto' | 'individual') => {
  const r = await (await quem()).rpc('orcamento_mes', { p_mes: MES, p_escopo: escopo });
  expect(r.error).toBeNull();
  return r.data as OrcamentoMes;
};

describe('api.copiar_orcamento', () => {
  it('A copia o conjunto e B passa a ver 5 linhas e pode_copiar_anterior.conjunto = false', async () => {
    const antes = await orcamentoMes(comoB, 'conjunto');
    expect(antes.pode_copiar_anterior.conjunto).toBe(true);
    const copia = await (await comoA()).rpc('copiar_orcamento', { p_mes: MES, p_escopo: 'conjunto' });
    expect(copia.error).toBeNull();
    expect(copia.data).toBe(5);
    try {
      const depois = await orcamentoMes(comoB, 'conjunto');
      expect(depois.pode_copiar_anterior.conjunto).toBe(false);
      expect(depois.linhas.filter((l) => l.orcado_centavos > 0)).toHaveLength(5);
    } finally {
      for (const l of (await orcamentoMes(comoA, 'conjunto')).linhas) {
        await (await comoA()).rpc('definir_orcamento', { p_mes: MES, p_categoria_id: l.categoria_id, p_valor_centavos: null });
      }
    }
  });

  it('B copia a individual sem receber nem criar orçamento das categorias de A', async () => {
    const b = await (await comoB()).rpc('copiar_orcamento', { p_mes: MES, p_escopo: 'individual' });
    expect(b.error).toBeNull();
    try {
      const individualA = await orcamentoMes(comoA, 'individual');
      expect(individualA.linhas.some((l) => l.categoria_id === INDIVIDUAL_DE_A && l.orcado_centavos > 0)).toBe(false);
    } finally {
      for (const l of (await orcamentoMes(comoB, 'individual')).linhas) {
        await (await comoB()).rpc('definir_orcamento', { p_mes: MES, p_categoria_id: l.categoria_id, p_valor_centavos: null });
      }
    }
  });

  it('anon não executa', async () => {
    const r = await (await comoAnon()).rpc('copiar_orcamento', { p_mes: MES, p_escopo: 'conjunto' });
    expect(r.error).not.toBeNull();
  });
});
