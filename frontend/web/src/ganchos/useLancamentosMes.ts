import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { buscarLancamentosMes, type FiltrosLancamentos } from '../dados/consultas/lancamentosMes';
import type { ErroDados } from '../dados/erros';
import { CHAVES } from './chavesConsulta';

type Lista = Awaited<ReturnType<typeof buscarLancamentosMes>>;

/** Trocar o filtro mantém a lista anterior até a nova chegar, sem voltar ao esqueleto. */
export const useLancamentosMes = (mes: string, filtros: FiltrosLancamentos) =>
  useQuery<Lista, ErroDados>({
    queryKey: [...CHAVES.lancamentosMes, mes, filtros],
    queryFn: () => buscarLancamentosMes({ mes, ...filtros }),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
  });
