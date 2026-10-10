import { describe, expect, it } from 'vitest';
import { clienteConsulta } from './clienteConsulta';

describe('clienteConsulta', () => {
  it('reconsulta ao voltar o foco da janela', () => {
    expect(clienteConsulta.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(true);
  });
});
