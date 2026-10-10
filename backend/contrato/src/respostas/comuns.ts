// Subtipos que aparecem em mais de uma resposta.

import type { SituacaoOrcamento } from '../enums';

/** UUID. */
export type Id = string;

export type IdNome = { id: Id; nome: string };

/** Pessoa que aparece em lançamentos, ocorrências e movimentos: `sou_eu` é relativo a quem consulta. */
export type Pessoa = { nome: string; sou_eu: boolean };

/** Total de uma categoria no resumo do mês. */
export type TotalPorCategoria = {
  categoria_id: Id;
  nome: string;
  variavel: boolean;
  total_centavos: number;
};

/** Linha de orçamento de uma categoria: orçado × realizado. */
export type LinhaOrcamento = {
  categoria_id: Id;
  nome: string;
  orcado_centavos: number;
  realizado_centavos: number;
  /** Inteiro, pode passar de 100. */
  percentual: number;
  situacao: SituacaoOrcamento;
};

export type CategoriaSemOrcamento = { categoria_id: Id; nome: string };
