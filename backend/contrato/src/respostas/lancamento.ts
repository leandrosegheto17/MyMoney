import type { Escopo, TipoForma, TipoLancamento } from '../enums';
import type { Id, IdNome } from './comuns';

// Dados de pagamento são privados do pagador: para o outro membro `pagamento` vem ausente
// (nunca `null`) e `data_ajustada` não é enviada.

export type Lancamento = {
  id: Id;
  tipo: TipoLancamento;
  escopo: Escopo;
  descricao: string;
  categoria: IdNome & { escopo: Escopo };
  valor_total_centavos: number;
  num_parcelas: number;
  pagador: IdNome & { sou_eu: boolean };
  alterado_por: { nome: string };
  /** Instante com fuso, ISO 8601. */
  alterado_em: string;
  parcela_em_foco: number;
  parcelas: {
    id: Id;
    numero: number;
    valor_centavos: number;
    /** `YYYY-MM-DD`. */
    data: string;
    data_ajustada?: boolean;
  }[];
  pagamento?: {
    forma: IdNome & { tipo: TipoForma };
    conta: IdNome | null;
    /** `YYYY-MM-DD`. */
    data_operacao: string;
    dia_vencimento_aplicado: number | null;
  };
};
