import type { SituacaoOcorrencia, SituacaoOrcamento } from '../enums';
import type { Id, LinhaOrcamento, TotalPorCategoria } from './comuns';

export type ResumoOrcamento = {
  orcado_centavos: number;
  realizado_centavos: number;
  percentual: number;
  situacao: SituacaoOrcamento;
  /** Categorias que mais pesam no orçamento. */
  destaques: LinhaOrcamento[];
};

type ResumoResultado = {
  valor_centavos: number;
  /** `true` enquanto o mês não fechou. */
  parcial: boolean;
};

export type ResumoMeta = {
  meta_id: Id;
  nome: string;
  alvo_centavos: number;
  guardado_centavos: number;
  falta_centavos: number;
  percentual: number;
  /** `AAAA-MM`. */
  prazo: string | null;
  mensal_necessario_centavos: number | null;
  atingida: boolean;
};

export type ResumoMes = {
  /** Primeiro dia do mês, `YYYY-MM-01`. */
  mes: string;
  mes_fechado: boolean;
  pendentes_previstos_centavos: number;
  conjunto: {
    total_centavos: number;
    total_variaveis_centavos: number;
    previsto_a_pagar_centavos: number;
    pago_por_membro: {
      membro_id: Id;
      nome: string;
      valor_centavos: number;
      percentual: number;
    }[];
    fixas_total: number;
    fixas_pendentes: {
      ocorrencia_id: Id;
      descricao: string;
      /** `YYYY-MM-DD`. */
      vencimento: string;
      valor_previsto_centavos: number;
      situacao: Extract<SituacaoOcorrencia, 'pendente' | 'atrasada'>;
    }[];
    orcamento: ResumoOrcamento | null;
    por_categoria: TotalPorCategoria[];
    resultado: ResumoResultado;
    metas: ResumoMeta[];
  };
  individual: {
    meu_total_centavos: number;
    minha_parte_conjunto_centavos: number;
    meu_individual_centavos: number;
    total_variaveis_centavos: number;
    receitas_centavos: number;
    resultado: ResumoResultado;
    guardado_no_mes_centavos: number;
    orcamento: ResumoOrcamento | null;
    por_categoria: TotalPorCategoria[];
    minha_parte_por_categoria: TotalPorCategoria[];
    contas: { conta_id: Id; nome: string; saldo_centavos: number }[];
    credito: {
      forma_id: Id;
      nome: string;
      dia_vencimento: number;
      gasto_mes_centavos: number;
      comprometido_futuro_centavos: number;
    }[];
    metas: ResumoMeta[];
  };
};
