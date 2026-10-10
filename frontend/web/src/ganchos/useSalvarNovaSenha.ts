import { salvarNovaSenha, sair } from '../dados/sessao';
import { useComandoCadastro } from './useComandoCadastro';

/**
 * Troca a senha e encerra no aparelho a sessão de recuperação (senão a guarda de `/entrar`
 * levaria para o início). Sem rede devolve o erro `rede` em vez de pausar a mutação.
 */
export function useSalvarNovaSenha() {
  return useComandoCadastro(
    async (senha: string) => {
      await salvarNovaSenha(senha);
      await sair();
    },
    [],
    true,
  );
}
