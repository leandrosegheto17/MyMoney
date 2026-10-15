import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from '../src/esperar';
import { comoA, comoB } from '../src/sessoes';

const MORADIA_EM_USO = '00000000-0000-4000-8000-000000000403';
const INDIVIDUAL_DE_A = '00000000-0000-4000-8000-000000000412';

describe('api.excluir_categoria', () => {
  it('A cria uma categoria, a exclui e ela some da view categorias', async () => {
    const a = await comoA();
    const id = randomUUID();
    const criada = await a.rpc('salvar_categoria', {
      p_id: id,
      p_nome: `Excluir ${id.slice(0, 8)}`,
      p_tipo: 'despesa',
      p_escopo: 'individual',
      p_variavel: false,
    });
    expect(criada.error).toBeNull();
    expect((await a.rpc('excluir_categoria', { p_id: id })).error).toBeNull();
    const lida = await a.from('categorias').select('id').eq('id', id);
    expect(lida.data).toEqual([]);
  });

  it('A tenta excluir Moradia (usada por lançamento) e recebe categoria_em_uso', async () => {
    const r = await (await comoA()).rpc('excluir_categoria', { p_id: MORADIA_EM_USO });
    expect(r.error?.message).toBe('categoria_em_uso');
  });

  it('B não exclui a individual de A, que continua na lista de A', async () => {
    await esperarRegistroInvalido((await comoB()).rpc('excluir_categoria', { p_id: INDIVIDUAL_DE_A }));
    const lida = await (await comoA())
      .from('categorias')
      .select('id')
      .eq('id', INDIVIDUAL_DE_A);
    expect(lida.data).toHaveLength(1);
  });
});
