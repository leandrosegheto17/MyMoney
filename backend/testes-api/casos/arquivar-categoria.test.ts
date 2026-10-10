import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from '../src/esperar';
import { comoA, comoB } from '../src/sessoes';

const INDIVIDUAL_DE_A = '00000000-0000-4000-8000-000000000411';

describe('api.arquivar_categoria', () => {
  it('A arquiva uma conjunta criada por ela, duas vezes, e B a vê arquivada', async () => {
    const a = await comoA();
    const id = randomUUID();
    const criada = await a.rpc('salvar_categoria', {
      p_id: id,
      p_nome: `Arquivar ${id.slice(0, 8)}`,
      p_tipo: 'despesa',
      p_escopo: 'conjunto',
      p_variavel: false,
    });
    expect(criada.error).toBeNull();
    expect((await a.rpc('arquivar_categoria', { p_id: id })).error).toBeNull();
    expect((await a.rpc('arquivar_categoria', { p_id: id })).error).toBeNull();
    const lida = await (await comoB()).from('categorias').select('arquivada').eq('id', id).single();
    expect(lida.data?.arquivada).toBe(true);
  });

  it('B não arquiva a individual de A, que segue ativa', async () => {
    await esperarRegistroInvalido((await comoB()).rpc('arquivar_categoria', { p_id: INDIVIDUAL_DE_A }));
    const lida = await (await comoA()).from('categorias').select('arquivada').eq('id', INDIVIDUAL_DE_A).single();
    expect(lida.data?.arquivada).toBe(false);
  });

  it('id inexistente recebe registro_invalido', async () => {
    await esperarRegistroInvalido(
      (await comoA()).rpc('arquivar_categoria', { p_id: 'e1000000-0000-4000-8000-0000000004ff' }),
    );
  });
});
