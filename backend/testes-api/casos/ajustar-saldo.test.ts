import { describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from '../src/esperar';
import { comoA, comoB } from '../src/sessoes';

const CONTA_A = '00000000-0000-4000-8000-000000000201';

describe('api.ajustar_saldo', () => {
  it('A simula e ajusta a própria conta', async () => {
    const a = await comoA();
    const simulado = await a.rpc('ajustar_saldo', {
      p_conta_id: CONTA_A,
      p_saldo_real_centavos: 12345,
      p_simular: true,
    });
    expect(simulado.error).toBeNull();
    expect(typeof simulado.data).toBe('number');

    const ajustado = await a.rpc('ajustar_saldo', { p_conta_id: CONTA_A, p_saldo_real_centavos: 12345 });
    expect(ajustado.error).toBeNull();
    expect(ajustado.data).toBe(simulado.data);

    const repetido = await a.rpc('ajustar_saldo', { p_conta_id: CONTA_A, p_saldo_real_centavos: 12345 });
    expect(repetido.error).toBeNull();
    expect(repetido.data).toBe(0);
  });

  it('B não simula nem ajusta a conta de A', async () => {
    const b = await comoB();
    await esperarRegistroInvalido(
      b.rpc('ajustar_saldo', { p_conta_id: CONTA_A, p_saldo_real_centavos: 1, p_simular: true }),
    );
    await esperarRegistroInvalido(b.rpc('ajustar_saldo', { p_conta_id: CONTA_A, p_saldo_real_centavos: 1 }));
  });

  it('id inexistente recebe registro_invalido', async () => {
    await esperarRegistroInvalido(
      (await comoA()).rpc('ajustar_saldo', {
        p_conta_id: '00000000-0000-4000-8000-0000000002ff',
        p_saldo_real_centavos: 1,
      }),
    );
  });
});
