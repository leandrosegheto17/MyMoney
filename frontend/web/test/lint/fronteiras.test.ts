// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { analisarArvore, type MensagensPorArquivo } from './analisarArvore';

let mensagensDe: MensagensPorArquivo;

beforeAll(async () => {
  mensagensDe = await analisarArvore();
}, 60_000);

const VIOLACOES: Array<[descricao: string, arquivo: string, regra: string]> = [
  ['componentes não importa dados', 'componentes/importaDados.ts', 'import-x/no-restricted-paths'],
  [
    'componentes/base não importa o resto de componentes',
    'componentes/base/importaComponentes.ts',
    'import-x/no-restricted-paths',
  ],
  ['paginas não importa dados', 'paginas/importaDados.ts', 'import-x/no-restricted-paths'],
  ['ganchos não importa componentes', 'ganchos/importaComponentes.ts', 'import-x/no-restricted-paths'],
  ['dados não importa ganchos', 'dados/importaGanchos.ts', 'import-x/no-restricted-paths'],
  ['formatacao não importa rotulos', 'formatacao/importaRotulos.ts', 'import-x/no-restricted-paths'],
  ['ganchos não importa rotulos', 'ganchos/importaRotulos.ts', 'import-x/no-restricted-paths'],
  ['comum não importa dados', 'comum/importaDados.ts', 'import-x/no-restricted-paths'],
  ['comum não importa formatacao', 'comum/importaFormatacao.ts', 'import-x/no-restricted-paths'],
  ['comum não importa ganchos', 'comum/importaGanchos.ts', 'import-x/no-restricted-paths'],
  ['@supabase/supabase-js fora de dados', 'ganchos/importaSupabase.ts', 'no-restricted-imports'],
  ['idb-keyval fora de dados', 'componentes/importaIdb.ts', 'no-restricted-imports'],
  ['pacote interno além do contrato', 'dados/importaTestesApi.ts', 'no-restricted-imports'],
  ['.from().insert() proibido', 'dados/escreveInsert.ts', 'no-restricted-syntax'],
  ['.schema().from().delete() proibido', 'dados/escreveDeleteSchema.ts', 'no-restricted-syntax'],
];

describe('regras de fronteira do web', () => {
  it.each(VIOLACOES)('%s (%s → %s)', (_descricao, arquivo, regra) => {
    const erros = mensagensDe(arquivo).filter((m) => m.severity === 2);
    expect(erros.map((m) => m.ruleId)).toContain(regra);
  });

  it('nenhuma violação é reportada só como aviso', () => {
    for (const [, arquivo] of VIOLACOES) {
      expect(mensagensDe(arquivo).filter((m) => m.severity === 1)).toEqual([]);
    }
  });

  it('a escrita direta explica que escrita só sai por rpc', () => {
    const msg = mensagensDe('dados/escreveInsert.ts').find((m) => m.ruleId === 'no-restricted-syntax');
    expect(msg?.message).toContain('escrita só por rpc (ADR-003)');
  });

  it.each([
    'paginas/permitidoComponentes.ts',
    'ganchos/permitidoDados.ts',
    'ganchos/permitidoFormatacao.ts',
    'ganchos/permitidoComum.ts',
    'dados/permitidoComum.ts',
    'comum/alvo.ts',
    'dados/permitidoContrato.ts',
    'formatacao/permitidoMapDelete.ts',
    'componentes/alvo.ts',
    'dados/alvo.ts',
  ])('arquivo permitido sem erro: %s', (arquivo) => {
    expect(mensagensDe(arquivo)).toEqual([]);
  });
});
