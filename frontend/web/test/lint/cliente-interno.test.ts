// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { analisarArvore, type MensagensPorArquivo } from './analisarArvore';

let mensagensDe: MensagensPorArquivo;

beforeAll(async () => {
  mensagensDe = await analisarArvore();
}, 60_000);

describe('cliente supabase interno a dados/', () => {
  it('importar dados/cliente de ganchos/ é erro', () => {
    const erros = mensagensDe('ganchos/importaCliente.ts').filter((m) => m.severity === 2);
    expect(erros.length).toBeGreaterThan(0);
    expect(erros.some((m) => m.ruleId === 'no-restricted-imports' || m.ruleId === 'import-x/no-restricted-paths')).toBe(
      true,
    );
  });

  it('dentro de dados/ o cliente pode ser importado', () => {
    expect(mensagensDe('dados/permitidoCliente.ts')).toEqual([]);
  });
});
