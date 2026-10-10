import { describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from '../src/esperar';
import { comoA, comoB } from '../src/sessoes';

const PIX_NUBANK = '00000000-0000-4000-8000-000000000301';
const OUTRA_FORMA = '00000000-0000-4000-8000-000000000302';

describe('api.definir_preferida', () => {
  it('A troca a preferida e volta para a original', async () => {
    const a = await comoA();
    const trocou = await a.rpc('definir_preferida', { p_id: OUTRA_FORMA });
    expect(trocou.error).toBeNull();
    const voltou = await a.rpc('definir_preferida', { p_id: PIX_NUBANK });
    expect(voltou.error).toBeNull();
  });

  it('B não define a forma de A como preferida', async () => {
    await esperarRegistroInvalido((await comoB()).rpc('definir_preferida', { p_id: PIX_NUBANK }));
  });
});
