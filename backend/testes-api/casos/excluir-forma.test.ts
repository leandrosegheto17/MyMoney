import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from '../src/esperar';
import { comoA, comoB } from '../src/sessoes';

// Usada pela "Geladeira nova" do seed de lançamentos.
const FORMA_EM_USO = '00000000-0000-4000-8000-000000000303';

describe('api.excluir_forma', () => {
  it('A exclui uma forma criada por ele', async () => {
    const a = await comoA();
    const id = randomUUID();
    const criada = await a.rpc('salvar_forma', {
      p_id: id,
      p_nome: 'Crédito a excluir',
      p_tipo: 'credito',
      p_dia_vencimento: 9,
    });
    expect(criada.error).toBeNull();
    expect((await a.rpc('excluir_forma', { p_id: id })).error).toBeNull();
  });

  it('A não exclui forma com lançamento ligado (em_uso)', async () => {
    const { error } = await (await comoA()).rpc('excluir_forma', { p_id: FORMA_EM_USO });
    expect(error?.message).toBe('em_uso');
  });

  it('B não exclui a forma de A', async () => {
    await esperarRegistroInvalido((await comoB()).rpc('excluir_forma', { p_id: FORMA_EM_USO }));
  });
});
