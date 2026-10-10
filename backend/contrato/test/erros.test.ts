import { describe, expect, it } from 'vitest';
import { CODIGOS_ERRO } from '../src/erros';

describe('CODIGOS_ERRO', () => {
  it('contém os códigos estáveis do contrato', () => {
    expect(CODIGOS_ERRO).toEqual(
      expect.arrayContaining([
        'valor_invalido',
        'registro_invalido',
        'sem_permissao',
        'confirmar_descarte_ajustes',
        'categoria_em_uso',
        'em_uso',
      ]),
    );
  });

  it('não tem código repetido', () => {
    expect(new Set(CODIGOS_ERRO).size).toBe(CODIGOS_ERRO.length);
  });

  it('não distingue "não existe" de "não é seu"', () => {
    expect(CODIGOS_ERRO.filter((c) => /nao_existe|nao_encontrado|de_outro|nao_e_seu/.test(c))).toEqual([]);
  });
});
