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
  resumoMes: ['resumo_mes'],
  lancamentosMes: ['lancamentos_mes'],
  lancamento: (id: string) => ['lancamento', id],
  dadosLancamentoAparelho: ['dados_lancamento', 'aparelho'],
} as const;
