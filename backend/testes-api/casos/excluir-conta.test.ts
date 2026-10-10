import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from '../src/esperar';
import { comoA, comoB } from '../src/sessoes';

const CONTA_A = 'e1000000-0000-4000-8000-000000000201';

describe('api.excluir_conta', () => {
  it('A cria uma conta e a exclui', async () => {
    const a = await comoA();
    const id = randomUUID();
    expect((await a.rpc('salvar_conta', { p_id: id, p_nome: 'Conta a excluir' })).error).toBeNull();
    expect((await a.rpc('excluir_conta', { p_id: id })).error).toBeNull();
  });

  it('A tenta excluir conta com forma ligada e recebe em_uso', async () => {
    const r = await (await comoA()).rpc('excluir_conta', { p_id: CONTA_A });
    expect(r.error?.message).toBe('em_uso');
  });

  it('B não exclui a conta de A e não descobre que está em uso', async () => {
    await esperarRegistroInvalido((await comoB()).rpc('excluir_conta', { p_id: CONTA_A }));
  });
});
