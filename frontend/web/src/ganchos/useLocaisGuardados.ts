import { useQuery } from '@tanstack/react-query';
import type { ErroDados } from '../dados/erros';
import { buscarLocaisGuardados } from '../dados/consultas/locaisGuardados';
import { CHAVES } from './chavesConsulta';

/** `enabled` evita buscar fora do aporte/retirada, onde a lista é usada. */
export const useLocaisGuardados = ({ enabled }: { enabled: boolean }) =>
  useQuery<Awaited<ReturnType<typeof buscarLocaisGuardados>>, ErroDados>({
    queryKey: CHAVES.locaisGuardados,
    queryFn: buscarLocaisGuardados,
    enabled,
  });
