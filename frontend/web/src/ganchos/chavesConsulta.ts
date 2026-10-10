/** Chaves do cache de consulta, num só lugar: leitura e invalidação usam as mesmas. */
export const CHAVES = {
  contas: ['contas'],
  conta: (id: string) => ['contas', id],
  formas: ['formas_pagamento'],
  forma: (id: string) => ['formas_pagamento', id],
  categorias: ['categorias'],
  categoria: (id: string) => ['categorias', id],
  dadosLancamento: ['dados_lancamento'],
  resumoMes: ['resumo_mes'],
  lancamentosMes: ['lancamentos_mes'],
  lancamento: (id: string) => ['lancamento', id],
  dadosLancamentoAparelho: ['dados_lancamento', 'aparelho'],
} as const;
