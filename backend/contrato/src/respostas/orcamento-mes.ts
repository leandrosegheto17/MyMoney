import type { Escopo, SituacaoOrcamento } from '../enums';
import type { CategoriaSemOrcamento, LinhaOrcamento } from './comuns';

export type OrcamentoMes = {
  /** `YYYY-MM-01`. */
  mes: string;
  escopo: Escopo;
  pode_copiar_anterior: Record<Escopo, boolean>;
  /** Último mês com orçamento, quando há algo a copiar. */
  anterior?: { mes: string; orcado_centavos: number; categorias: number };
  total: {
    orcado_centavos: number;
    realizado_centavos: number;
    percentual: number;
    situacao: SituacaoOrcamento;
    resultado_centavos: number;
    parcial: boolean;
  } | null;
  linhas: LinhaOrcamento[];
  sem_orcamento: CategoriaSemOrcamento[];
};
