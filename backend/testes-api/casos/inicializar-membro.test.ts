import { describe, expect, it } from 'vitest';
import { esperarRegistroInvalido } from '../src/esperar';
import { comoA, comoAnon, comoB, comoSemMembro } from '../src/sessoes';

describe('api.inicializar_membro', () => {
  it('A inicializa sem erro e repetir não falha', async () => {
    const a = await comoA();
    expect((await a.rpc('inicializar_membro')).error).toBeNull();
    expect((await a.rpc('inicializar_membro')).error).toBeNull();
  });

  it('B inicializa sem erro', async () => {
    expect((await (await comoB()).rpc('inicializar_membro')).error).toBeNull();
  });

  it('anon falha', async () => {
    const { error } = await (await comoAnon()).rpc('inicializar_membro');
    expect(error).not.toBeNull();
  });

  it('usuário sem membro recebe registro_invalido', async () => {
    await esperarRegistroInvalido((await comoSemMembro()).rpc('inicializar_membro'));
  });

  // O isolamento das individuais (B não vê as de A) é coberto no pgTAP
  // tests/categorias/inicializar_membro.sql e, via api.categorias, no caso da view.
});
