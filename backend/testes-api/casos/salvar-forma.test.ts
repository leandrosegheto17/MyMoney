import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from '../src/esperar';
import { comoA, comoAnon, comoB } from '../src/sessoes';

const CONTA_DE_A = '00000000-0000-4000-8000-000000000201';
const FORMA_DE_A = '00000000-0000-4000-8000-000000000303';

describe('api.salvar_forma', () => {
  it('A cria Pix com conta e Crédito sem conta', async () => {
    const a = await comoA();
    const pix = randomUUID();
    const criadaPix = await a.rpc('salvar_forma', {
      p_id: pix,
      p_nome: 'Pix do teste',
      p_tipo: 'pix',
      p_conta_id: CONTA_DE_A,
    });
    expect(criadaPix.error).toBeNull();
    expect(criadaPix.data).toBe(pix);
    const credito = randomUUID();
    const criadaCredito = await a.rpc('salvar_forma', {
      p_id: credito,
      p_nome: 'Crédito do teste',
      p_tipo: 'credito',
      p_dia_vencimento: 12,
    });
    expect(criadaCredito.error).toBeNull();
    expect(criadaCredito.data).toBe(credito);
  });

  it('B não edita a forma de A', async () => {
    await esperarRegistroInvalido(
      (await comoB()).rpc('salvar_forma', {
        p_id: FORMA_DE_A,
        p_nome: 'Invadida',
        p_tipo: 'credito',
        p_dia_vencimento: 5,
      }),
    );
  });

  it('B não cria forma com a conta de A', async () => {
    await esperarRegistroInvalido(
      (await comoB()).rpc('salvar_forma', {
        p_id: randomUUID(),
        p_nome: 'Pix na conta alheia',
        p_tipo: 'pix',
        p_conta_id: CONTA_DE_A,
      }),
    );
  });

  it('anon falha', async () => {
    const { error } = await (
      await comoAnon()
    ).rpc('salvar_forma', {
      p_id: randomUUID(),
      p_nome: 'Anon',
      p_tipo: 'credito',
      p_dia_vencimento: 5,
    });
    expect(error).not.toBeNull();
  });
});
