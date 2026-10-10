/** Chaves do cache de consulta, num só lugar: leitura e invalidação usam as mesmas. */
export const CHAVES = {
  contas: ['contas'],
  conta: (id: string) => ['contas', id],
  formas: ['formas_pagamento'],
  forma: (id: string) => ['formas_pagamento', id],
  categorias: ['categorias'],
  categoria: (id: string) => ['categorias', id],
} as const;
