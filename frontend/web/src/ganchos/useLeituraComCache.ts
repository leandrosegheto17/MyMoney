import type { UseQueryResult } from '@tanstack/react-query';

export type SituacaoLeitura = 'carregando' | 'erro' | 'cache' | 'pronto';

export interface LeituraComCache<T> {
  situacao: SituacaoLeitura;
  dados: T | undefined;
  /** Epoch em ms da última carga com sucesso; sem formatar. */
  atualizadoEm: number;
}

/** Traduz uma consulta no estado de tela. `cache` = refetch falhou mas há dado anterior (memória do TanStack). */
export function useLeituraComCache<T>(consulta: UseQueryResult<T>): LeituraComCache<T> {
  const dados = consulta.data;
  let situacao: SituacaoLeitura;
  if (consulta.isError) situacao = dados === undefined ? 'erro' : 'cache';
  else if (dados === undefined) situacao = 'carregando';
  else situacao = 'pronto';
  return { situacao, dados, atualizadoEm: consulta.dataUpdatedAt };
}
