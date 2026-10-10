import type { ErroDados } from '../dados/erros';

/** Texto do alerta de entrada; credenciais erradas não dizem se o e-mail existe. */
export function textoErroEntrar(erro: ErroDados): string {
  if (erro.tipo === 'regra' && erro.codigo === 'credenciais_invalidas') return 'E-mail ou senha incorretos.';
  if (erro.tipo === 'rede') return 'Sem conexão.';
  if (erro.tipo === 'indisponivel') return 'Servidor indisponível. Tente de novo em instantes.';
  return 'Não foi possível entrar. Tente de novo.';
}
