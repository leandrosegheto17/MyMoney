import type { Escopo, TipoLancamento } from '../enums';
import type { Id, IdNome } from './comuns';

export type ItemLancamentoMes = {
  parcela_id: Id;
  lancamento_id: Id;
  /** `YYYY-MM-DD`. */
  data: string;
  descricao: string;
  tipo: TipoLancamento;
  escopo: Escopo;
  categoria: IdNome & { variavel: boolean };
  valor_centavos: number;
  parcela_numero: number;
  total_parcelas: number;
  pagador: IdNome;
};

export type LancamentosMes = {
  /** `YYYY-MM-01`. */
  mes: string;
  filtros: {
    escopo: Escopo | null;
    categoria_id: Id | null;
    forma_id: Id | null;
    variavel: boolean | null;
  };
  total_filtrado_centavos: number;
  quantidade: number;
  itens: ItemLancamentoMes[];
};
