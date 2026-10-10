// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { analisarArvore, type MensagensPorArquivo } from './analisarArvore';

let mensagensDe: MensagensPorArquivo;

beforeAll(async () => {
  mensagensDe = await analisarArvore();
}, 60_000);

describe('fronteiras: import dinâmico e escrita via variável', () => {
  it.each([
    'componentes/importaSupabaseDinamico.ts',
    'componentes/importaIdbDinamico.ts',
    'componentes/requireIdb.ts',
    'dados/escreveViaVariavel.ts',
  ])('proibido: %s', (arquivo) => {
    const erros = mensagensDe(arquivo).filter((m) => m.severity === 2);
    expect(erros.map((m) => m.ruleId)).toContain('no-restricted-syntax');
  });

  it.each([
    'dados/permitidoImportDinamico.ts',
    'formatacao/permitidoArrayFrom.ts',
    'componentes/permitidoUint8ArrayFrom.ts',
    'componentes/permitidoBufferFrom.ts',
    'componentes/permitidoObservableFrom.ts',
  ])(
    'permitido sem erro: %s',
    (arquivo) => {
      expect(mensagensDe(arquivo)).toEqual([]);
    },
  );
});
