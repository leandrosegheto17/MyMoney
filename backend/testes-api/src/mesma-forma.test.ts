import { describe, expect, it } from 'vitest';
import { mesmaForma } from './mesma-forma';

describe('mesmaForma', () => {
  it('aceita a mesma forma com valores diferentes', () => {
    expect(() => mesmaForma({ id: 'x', total: 10, ativo: true }, { id: 'y', total: 99, ativo: false })).not.toThrow();
  });

  it('falha com chave faltando', () => {
    expect(() => mesmaForma({ id: 'x' }, { id: 'y', nome: 'Ana' })).toThrow(/nome/);
  });

  it('falha com chave a mais', () => {
    expect(() => mesmaForma({ id: 'x', user_id: 'z' }, { id: 'y' })).toThrow(/user_id/);
  });

  it('falha com tipo diferente', () => {
    expect(() => mesmaForma({ valor_centavos: '100' }, { valor_centavos: 100 })).toThrow(/valor_centavos/);
  });

  it('falha com objeto no lugar de array', () => {
    expect(() => mesmaForma({ itens: {} }, { itens: [] })).toThrow(/itens/);
  });

  it('aceita array vazio contra exemplo com item', () => {
    expect(() => mesmaForma({ itens: [] }, { itens: [{ id: 'a' }] })).not.toThrow();
  });

  it('compara arrays pelo primeiro elemento', () => {
    expect(() => mesmaForma({ itens: [{ id: 'a' }] }, { itens: [{ id: 'b' }] })).not.toThrow();
    expect(() => mesmaForma({ itens: [{ id: 'a', extra: 1 }] }, { itens: [{ id: 'b' }] })).toThrow(/extra/);
  });

  it('compara objetos aninhados', () => {
    const exemplo = { membro: { id: 'a', nome: 'Leandro' }, outro_membro: { nome: 'Ana' } };
    expect(() => mesmaForma({ membro: { id: 'b', nome: 'Ana' }, outro_membro: { nome: 'L' } }, exemplo)).not.toThrow();
    expect(() => mesmaForma({ membro: { id: 'b' }, outro_membro: { nome: 'L' } }, exemplo)).toThrow(/nome/);
    expect(() => mesmaForma({ membro: { id: 'b', nome: 'Ana' }, outro_membro: { nome: 1 } }, exemplo)).toThrow(
      /outro_membro/,
    );
  });

  it('aceita a resposta real de contexto contra o exemplo do mockup', async () => {
    const { default: exemplo } = await import('../../../.md/mockup/respostas/contexto.json');
    const real = {
      membro: { id: '00000000-0000-4000-8000-000000000102', nome: 'Ana', email: 'ana@exemplo.com' },
      outro_membro: { nome: 'Leandro' },
      mes_corrente: '2026-11-01',
      hoje: '2026-11-03',
    };
    expect(() => mesmaForma(real, exemplo)).not.toThrow();
  });
});
