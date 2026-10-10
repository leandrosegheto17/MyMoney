import { describe, it, expect } from 'vitest';
import { montarTitulo } from './titulo';

describe('montarTitulo', () => {
  it('com mês: "Nome · Mês de Ano · MyMoney"', () => {
    expect(montarTitulo('Início', '2026-10')).toBe('Início · Outubro de 2026 · MyMoney');
  });

  it('aceita o mês no formato AAAA-MM-01', () => {
    expect(montarTitulo('Orçamento', '2026-01-01')).toBe('Orçamento · Janeiro de 2026 · MyMoney');
  });

  it('sem mês: "Nome · MyMoney"', () => {
    expect(montarTitulo('Ajustes')).toBe('Ajustes · MyMoney');
  });

  it('mês vazio é tratado como ausente', () => {
    expect(montarTitulo('Entrar', undefined)).toBe('Entrar · MyMoney');
  });
});
