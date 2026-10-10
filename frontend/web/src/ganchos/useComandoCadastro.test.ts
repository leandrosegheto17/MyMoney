import { describe, expect, it } from 'vitest';
import { ehEmUso } from './useComandoCadastro';

describe('ehEmUso', () => {
  it('é verdadeiro para em_uso', () => {
    expect(ehEmUso({ tipo: 'regra', codigo: 'em_uso' })).toBe(true);
  });

  it('é verdadeiro para categoria_em_uso', () => {
    expect(ehEmUso({ tipo: 'regra', codigo: 'categoria_em_uso' })).toBe(true);
  });

  it('é falso para outros códigos de regra', () => {
    expect(ehEmUso({ tipo: 'regra', codigo: 'registro_invalido' })).toBe(false);
    expect(ehEmUso({ tipo: 'regra', codigo: 'valor_invalido' })).toBe(false);
  });

  it('é falso para erros que não são de regra e para ausência de erro', () => {
    expect(ehEmUso({ tipo: 'rede' })).toBe(false);
    expect(ehEmUso({ tipo: 'indisponivel' })).toBe(false);
    expect(ehEmUso({ tipo: 'desconhecido' })).toBe(false);
    expect(ehEmUso(null)).toBe(false);
    expect(ehEmUso(undefined)).toBe(false);
  });
});
