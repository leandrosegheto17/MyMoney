/** Chaves do cache de consulta, num só lugar: leitura e invalidação usam as mesmas. */
export const CHAVES = {
  contas: ['contas'],
  conta: (id: string) => ['contas', id],
  formas: ['formas_pagamento'],
  forma: (id: string) => ['formas_pagamento', id],
  categorias: ['categorias'],
  categoria: (id: string) => ['categorias', id],
  dadosLancamento: ['dados_lancamento'],
  despesasFixas: ['despesas_fixas'],
  despesaFixa: (id: string) => ['despesas_fixas', id],
  ocorrenciasMes: ['ocorrencias_mes'],
  ocorrenciasDoMes: (mes: string) => ['ocorrencias_mes', mes],
  metas: ['metas'],
  meta: (id: string) => ['metas', id],
  movimentosMeta: ['movimentos_meta'],
  movimentosDaMeta: (metaId: string) => ['movimentos_meta', metaId],
  locaisGuardados: ['locais_guardados'],
  resumoMes: ['resumo_mes'],
  orcamentoMes: ['orcamento_mes'],
  orcamentoDoMes: (mes: string, escopo: string) => ['orcamento_mes', mes, escopo],
  lancamentosMes: ['lancamentos_mes'],
  lancamento: (id: string) => ['lancamento', id],
  dadosLancamentoAparelho: ['dados_lancamento', 'aparelho'],
} as const;

/** Totais que dependem dos lançamentos do mês: qualquer escrita de lançamento os invalida. */
export const TOTAIS_DO_MES = [CHAVES.resumoMes, CHAVES.orcamentoMes] as const;
