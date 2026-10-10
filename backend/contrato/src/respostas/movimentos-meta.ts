import type { TipoMovimentoMeta } from '../enums';
import type { Id, IdNome, Pessoa } from './comuns';

export type MovimentoMeta = {
  id: Id;
  tipo: TipoMovimentoMeta;
  valor_centavos: number;
  /** `YYYY-MM-DD`. */
  data: string;
  local: string;
  autor: Pessoa;
  conta?: Pick<IdNome, 'nome'>;
};

/** A resposta é a lista inteira, do mais recente ao mais antigo. */
export type MovimentosMeta = MovimentoMeta[];
