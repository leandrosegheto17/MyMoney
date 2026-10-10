import { entrar } from '../dados/sessao';
import { useComandoCadastro } from './useComandoCadastro';

export interface CredenciaisEntrada {
  email: string;
  senha: string;
}

/** Entrada com e-mail e senha; sem rede devolve o erro `rede` em vez de pausar a mutação. */
export function useEntrar() {
  return useComandoCadastro(({ email, senha }: CredenciaisEntrada) => entrar(email, senha), [], true);
}
