import { pedirRedefinicao } from '../dados/sessao';
import { useComandoCadastro } from './useComandoCadastro';

/** Pedido do link de redefinição; o resultado é o mesmo para e-mail de membro ou desconhecido. */
export function usePedirRedefinicao() {
  return useComandoCadastro((email: string) => pedirRedefinicao(email), [], true);
}
