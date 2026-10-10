import { describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from '../src/esperar';
import { comoA, comoAnon, comoB } from '../src/sessoes';

const CONJUNTA = '00000000-0000-4000-8000-000000000401';
const INDIVIDUAL_DE_A = '00000000-0000-4000-8000-000000000411';
const INEXISTENTE = '00000000-0000-4000-8000-0000000009ff';

describe('api.definir_orcamento', () => {
  it('A define conjunto e individual e remove depois', async () => {
    const a = await comoA();
    for (const id of [CONJUNTA, INDIVIDUAL_DE_A]) {
      const r = await a.rpc('definir_orcamento', { p_mes: '2027-01-01', p_categoria_id: id, p_valor_centavos: 12345 });
      expect(r.error).toBeNull();
    }
    for (const id of [CONJUNTA, INDIVIDUAL_DE_A]) {
      const r = await a.rpc('definir_orcamento', { p_mes: '2027-01-01', p_categoria_id: id, p_valor_centavos: null });
      expect(r.error).toBeNull();
    }
  });

  it('B não define nem remove a individual de A, e a resposta é igual à de inexistente', async () => {
    const b = await comoB();
    const alheia = await b.rpc('definir_orcamento', { p_mes: '2027-01-01', p_categoria_id: INDIVIDUAL_DE_A, p_valor_centavos: 1 });
    const inexistente = await b.rpc('definir_orcamento', { p_mes: '2027-01-01', p_categoria_id: INEXISTENTE, p_valor_centavos: 1 });
    await esperarRegistroInvalido(Promise.resolve(alheia));
    await esperarRegistroInvalido(
      b.rpc('definir_orcamento', { p_mes: '2027-01-01', p_categoria_id: INDIVIDUAL_DE_A, p_valor_centavos: null }),
    );
    expect(alheia.error?.message).toBe(inexistente.error?.message);
    expect(alheia.error?.code).toBe(inexistente.error?.code);
  });

  it('anon não executa', async () => {
    const anon = await comoAnon();
    const r = await anon.rpc('definir_orcamento', { p_mes: '2027-01-01', p_categoria_id: CONJUNTA, p_valor_centavos: 1 });
    expect(r.error).not.toBeNull();
  });
});
