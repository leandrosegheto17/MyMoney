import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { textoDescarte } from './textoDescarte';

const RESPOSTAS = new URL('../../../../../.md/mockup/respostas/', import.meta.url);
const PAGADOR = JSON.parse(readFileSync(new URL('lancamento-pagador.json', RESPOSTAS), 'utf8')) as {
  parcelas: unknown[];
};

describe('textoDescarte', () => {
  it('parcela 3/3 ajustada para 17/11: texto exato do mockup', () => {
    expect(textoDescarte(PAGADOR.parcelas as never)).toBe(
      'A parcela 3/3 teve a data ajustada à mão (17/11). Ao mudar o valor total, as 3 parcelas são recalculadas pelo vencimento do cartão e esse ajuste será descartado.',
    );
  });
});
