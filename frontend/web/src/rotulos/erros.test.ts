import { describe, expect, it } from 'vitest';
import { CODIGOS_ERRO_AUTH, CODIGOS_ERRO_REGRA } from '@mymoney/contrato/erros';
import { ROTULO_ERRO } from './erros';

const TODOS = [...CODIGOS_ERRO_REGRA, ...CODIGOS_ERRO_AUTH];

describe('rotulos/erros', () => {
  it.each(TODOS)('"%s" tem texto pt-BR', (codigo) => {
    const texto = ROTULO_ERRO[codigo].texto;
    expect(typeof texto).toBe('string');
    expect(texto.trim().length).toBeGreaterThan(0);
  });

  it.each(TODOS)('"%s" nunca mostra o código cru', (codigo) => {
    expect(ROTULO_ERRO[codigo].texto).not.toContain(codigo);
    expect(ROTULO_ERRO[codigo].texto).not.toMatch(/_/);
  });

  it('não tem chave fora do contrato', () => {
    expect(Object.keys(ROTULO_ERRO).sort()).toEqual([...TODOS].sort());
  });
});
