import { useQuery } from '@tanstack/react-query';
import { estadoRecuperacao } from '../dados/sessao';

/** Estado do link de redefinição ao abrir a tela; lido uma vez, sem repetir nem revalidar. */
export function useRecuperacaoSenha() {
  return useQuery({
    queryKey: ['recuperacao-senha'],
    queryFn: estadoRecuperacao,
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}
