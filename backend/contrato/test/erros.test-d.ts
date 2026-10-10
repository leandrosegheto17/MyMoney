import { expectTypeOf, test } from 'vitest';
import { CODIGOS_ERRO, type CodigoErro } from '../src/erros';

test('os códigos estáveis são CodigoErro', () => {
  expectTypeOf<'valor_invalido'>().toMatchTypeOf<CodigoErro>();
  expectTypeOf<'registro_invalido'>().toMatchTypeOf<CodigoErro>();
  expectTypeOf<'sem_permissao'>().toMatchTypeOf<CodigoErro>();
  expectTypeOf<'confirmar_descarte_ajustes'>().toMatchTypeOf<CodigoErro>();
  expectTypeOf<'categoria_em_uso'>().toMatchTypeOf<CodigoErro>();
  expectTypeOf<'em_uso'>().toMatchTypeOf<CodigoErro>();
});

test('CodigoErro é uma união de literais, não string', () => {
  expectTypeOf<string>().not.toMatchTypeOf<CodigoErro>();
  expectTypeOf<(typeof CODIGOS_ERRO)[number]>().toEqualTypeOf<CodigoErro>();
});

test('código inexistente não compila', () => {
  // @ts-expect-error código fora da lista
  const codigo: CodigoErro = 'nao_existe';
  void codigo;
});
