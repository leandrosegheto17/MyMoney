import type { Id } from './comuns';

export type LinhaDespesasFixas = {
  id: Id;
  descricao: string;
  categoria_id: Id;
  /** Nome da categoria. */
  categoria: string;
  valor_previsto_centavos: number;
  dia_vencimento: number;
  /** `YYYY-MM-DD`. */
  encerrada_em: string | null;
};
