import { expectTypeOf, test } from 'vitest';
import type {
  Escopo,
  SituacaoOcorrencia,
  SituacaoOrcamento,
  TipoForma,
  TipoLancamento,
  TipoMovimentoMeta,
} from '../src/enums';

test('enums são uniões de literais', () => {
  expectTypeOf<Escopo>().toEqualTypeOf<'conjunto' | 'individual'>();
  expectTypeOf<TipoForma>().toEqualTypeOf<'pix' | 'debito' | 'credito'>();
  expectTypeOf<TipoLancamento>().toEqualTypeOf<'despesa' | 'receita'>();
  expectTypeOf<SituacaoOrcamento>().toEqualTypeOf<'dentro' | 'atencao' | 'estourado'>();
  expectTypeOf<SituacaoOcorrencia>().toEqualTypeOf<'pendente' | 'atrasada' | 'paga'>();
  expectTypeOf<TipoMovimentoMeta>().toEqualTypeOf<'aporte' | 'retirada'>();
});
