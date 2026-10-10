import { describe, expect, it } from 'vitest';
import { comoA, comoAnon, comoSemMembro } from '../src/sessoes';

describe('api.ping', () => {
  it.each([
    ['anon', comoAnon],
    ['membro A', comoA],
    ['sem membro', comoSemMembro],
  ])('%s recebe 1', async (_nome, quem) => {
    const cliente = await quem();
    const { data, error } = await cliente.rpc('ping');
    expect(error).toBeNull();
    expect(data).toBe(1);
  });
});
