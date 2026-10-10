import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from '../src/esperar';
import { comoA, comoB } from '../src/sessoes';

const FORMA_DE_A = 'e1000000-0000-4000-8000-000000000303';

describe('api.arquivar_forma', () => {
  it('A arquiva uma forma criada por ele, duas vezes sem erro', async () => {
    const a = await comoA();
    const id = randomUUID();
    const criada = await a.rpc('salvar_forma', {
      p_id: id,
      p_nome: 'Crédito a arquivar',
      p_tipo: 'credito',
      p_dia_vencimento: 8,
    });
    expect(criada.error).toBeNull();
    expect((await a.rpc('arquivar_forma', { p_id: id })).error).toBeNull();
    expect((await a.rpc('arquivar_forma', { p_id: id })).error).toBeNull();
  });

  it('B não arquiva a forma de A', async () => {
    await esperarRegistroInvalido((await comoB()).rpc('arquivar_forma', { p_id: FORMA_DE_A }));
  });
});
