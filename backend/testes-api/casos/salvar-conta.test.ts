import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from '../src/esperar';
import { comoA, comoAnon, comoB } from '../src/sessoes';

const CONTA_DE_A = 'e1000000-0000-4000-8000-000000000201';

describe('api.salvar_conta', () => {
  it('A cria e reedita pelo mesmo id', async () => {
    const a = await comoA();
    const id = randomUUID();
    const criada = await a.rpc('salvar_conta', { p_id: id, p_nome: 'Conta do teste' });
    expect(criada.error).toBeNull();
    expect(criada.data).toBe(id);
    const editada = await a.rpc('salvar_conta', {
      p_id: id,
      p_nome: 'Conta editada',
      p_saldo_inicial_centavos: 500,
    });
    expect(editada.error).toBeNull();
    expect(editada.data).toBe(id);
  });

  it('B não edita a conta de A', async () => {
    await esperarRegistroInvalido(
      (await comoB()).rpc('salvar_conta', { p_id: CONTA_DE_A, p_nome: 'Invadida' }),
    );
  });

  it('anon falha', async () => {
    const { error } = await (await comoAnon()).rpc('salvar_conta', {
      p_id: randomUUID(),
      p_nome: 'Anon',
    });
    expect(error).not.toBeNull();
  });
});
