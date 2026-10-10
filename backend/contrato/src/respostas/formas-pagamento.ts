import type { TipoForma } from '../enums';
import type { Id, IdNome } from './comuns';

export type LinhaFormasPagamento = {
  id: Id;
  nome: string;
  tipo: TipoForma;
  conta: IdNome;
  /** Só no crédito. */
  dia_vencimento: number | null;
  preferida: boolean;
  arquivada: boolean;
  pode_excluir: boolean;
  /** Só no crédito. */
  gasto_mes_centavos: number | null;
  /** Só no crédito. */
  comprometido_futuro_centavos: number | null;
};
