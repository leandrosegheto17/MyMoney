import type { ErroDados } from '../comum/erros';
import { TEXTO_SEM_CONEXAO, TEXTO_SERVIDOR_INDISPONIVEL } from '../rotulos/textosConexao';

/** Texto do alerta de entrada; credenciais erradas não dizem se o e-mail existe. */
export function textoErroEntrar(erro: ErroDados): string {
  if (erro.tipo === 'regra' && erro.codigo === 'credenciais_invalidas') return 'E-mail ou senha incorretos.';
  if (erro.tipo === 'rede') return TEXTO_SEM_CONEXAO;
  if (erro.tipo === 'indisponivel') return TEXTO_SERVIDOR_INDISPONIVEL;
  return 'Não foi possível entrar. Tente de novo.';
}
