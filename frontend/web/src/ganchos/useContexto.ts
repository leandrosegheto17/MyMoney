import { useQuery } from '@tanstack/react-query';
import { buscarContexto } from '../dados/consultas/contexto';
import type { ErroDados } from '../dados/erros';

export function useContexto() {
  return useQuery<Awaited<ReturnType<typeof buscarContexto>>, ErroDados>({
    queryKey: ['contexto'],
    queryFn: buscarContexto,
  });
}
