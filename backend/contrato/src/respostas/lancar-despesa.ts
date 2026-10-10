import type { Escopo } from '../enums';
import type { Id } from './comuns';

export type LancarDespesa = {
  id: Id;
  escopo: Escopo;
  /** Nome da categoria. */
  categoria: string;
  valor_total_centavos: number;
  num_parcelas: number;
  /** `YYYY-MM-DD`. */
  primeira_parcela_data: string;
  /** `true` quando a chamada repetida devolveu um lançamento já registrado. */
  ja_existia: boolean;
};
