import type { SituacaoOcorrencia } from '../enums';
import type { Id, Pessoa } from './comuns';

export type OcorrenciaMes = {
  id: Id;
  despesa_fixa_id: Id;
  descricao: string;
  /** Nome da categoria. */
  categoria: string;
  /** `YYYY-MM-DD`. */
  vencimento: string;
  valor_previsto_centavos: number;
  valor_pago_centavos: number | null;
  situacao: SituacaoOcorrencia;
  /** Preenchido quando a ocorrência está paga. */
  pagador: Pessoa | null;
};

export type OcorrenciasMes = {
  /** `YYYY-MM-01`. */
  mes: string;
  pagas: number;
  total: number;
  previsto_a_pagar_centavos: number;
  ocorrencias: OcorrenciaMes[];
};
