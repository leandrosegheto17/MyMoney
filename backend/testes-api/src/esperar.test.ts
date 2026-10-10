import { describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from './esperar';

const erro = (message: string) => ({
  data: null,
  error: { code: 'P0001', message, details: null, hint: null },
});

describe('esperarRegistroInvalido', () => {
  it('passa quando a chamada devolve registro_invalido', async () => {
    await expect(esperarRegistroInvalido(Promise.resolve(erro('registro_invalido')))).resolves.not.toThrow();
  });

  it('falha quando o erro tem outro código', async () => {
    await expect(esperarRegistroInvalido(Promise.resolve(erro('sem_permissao')))).rejects.toThrow();
  });

  it('falha quando a chamada dá certo', async () => {
    await expect(esperarRegistroInvalido(Promise.resolve({ data: { id: 'x' }, error: null }))).rejects.toThrow();
  });

  it('falha quando o erro traz dado junto', async () => {
    await expect(
      esperarRegistroInvalido(Promise.resolve({ ...erro('registro_invalido'), data: [{ id: 'x' }] })),
    ).rejects.toThrow();
  });
});
