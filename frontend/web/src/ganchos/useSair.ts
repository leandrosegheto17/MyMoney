import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sair, sairDeTodos } from '../dados/sessao';
import type { ErroDados } from '../dados/erros';

export type EscopoSaida = 'local' | 'global';

/**
 * Encerra a sessão. O cache em memória é limpo na saída local mesmo com erro (o aparelho deixa de
 * mostrar dado do membro) e, na global, só no sucesso: sem rede a sessão continua valendo.
 */
export function useSair() {
  const cliente = useQueryClient();
  return useMutation<void, ErroDados, EscopoSaida>({
    mutationFn: (escopo) => (escopo === 'local' ? sair() : sairDeTodos()),
    networkMode: 'always',
    onSettled: (_dado, erro, escopo) => {
      if (!erro || escopo === 'local') cliente.clear();
    },
  });
}
