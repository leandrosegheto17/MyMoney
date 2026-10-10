import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from '../src/esperar';
import { comoA, comoB } from '../src/sessoes';

const CONTA_A = '00000000-0000-4000-8000-000000000201';

describe('api.arquivar_conta', () => {
  it('A arquiva a própria conta, duas vezes', async () => {
    const a = await comoA();
    const id = randomUUID();
    expect((await a.rpc('salvar_conta', { p_id: id, p_nome: 'Conta a arquivar' })).error).toBeNull();
    expect((await a.rpc('arquivar_conta', { p_id: id })).error).toBeNull();
    expect((await a.rpc('arquivar_conta', { p_id: id })).error).toBeNull();
  });

  it('B não arquiva a conta de A', async () => {
    await esperarRegistroInvalido((await comoB()).rpc('arquivar_conta', { p_id: CONTA_A }));
    const { data, error } = await (await comoA()).from('contas').select('id, arquivada').eq('id', CONTA_A);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: CONTA_A, arquivada: false }]);
  });

  it('id inexistente recebe registro_invalido', async () => {
    await esperarRegistroInvalido(
      (await comoA()).rpc('arquivar_conta', { p_id: 'e1000000-0000-4000-8000-0000000002ff' }),
    );
  });
});
