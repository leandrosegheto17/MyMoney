import { isAuthError } from '@supabase/supabase-js';
import { CODIGOS_ERRO, type CodigoErro } from '@mymoney/contrato/erros';

export type ErroDados =
  | { tipo: 'rede' }
  | { tipo: 'indisponivel' }
  | { tipo: 'regra'; codigo: CodigoErro }
  | { tipo: 'desconhecido' };

const CODIGOS_AUTH: Record<string, CodigoErro> = {
  invalid_credentials: 'credenciais_invalidas',
  weak_password: 'senha_fraca',
  same_password: 'senha_fraca',
  otp_expired: 'link_expirado',
  flow_state_expired: 'link_expirado',
};

function ehCodigo(valor: unknown): valor is CodigoErro {
  return typeof valor === 'string' && (CODIGOS_ERRO as readonly string[]).includes(valor);
}

function porStatus(status: unknown): ErroDados | undefined {
  if (status === 0) return { tipo: 'rede' };
  if (typeof status === 'number' && status >= 500) return { tipo: 'indisponivel' };
  return undefined;
}

function traduzirAuth(e: { name: string; status?: number; code?: string }): ErroDados {
  if (e.name === 'AuthRetryableFetchError' && e.status === 0) return { tipo: 'rede' };
  const codigo = e.code ? CODIGOS_AUTH[e.code] : undefined;
  if (codigo) return { tipo: 'regra', codigo };
  // Sem sessão de recuperação, salvar a nova senha significa link já consumido ou vencido.
  if (e.name === 'AuthSessionMissingError') return { tipo: 'regra', codigo: 'link_expirado' };
  return porStatus(e.status) ?? { tipo: 'desconhecido' };
}

/**
 * Traduz o erro do fetch, do Auth ou do PostgREST. `status` é o HTTP da resposta quando o
 * PostgREST o entrega ao lado do erro. Nunca devolve texto do servidor: a mensagem é da tela.
 */
export function traduzirErro(e: unknown, status?: number): ErroDados {
  if (e instanceof TypeError) return { tipo: 'rede' };
  if (isAuthError(e)) return traduzirAuth(e);
  const porHttp = porStatus(status);
  if (porHttp) return porHttp;
  if (typeof e === 'object' && e !== null) {
    const { message } = e as { message?: unknown };
    if (ehCodigo(message)) return { tipo: 'regra', codigo: message };
  }
  return { tipo: 'desconhecido' };
}

/** Resultado de `rpc()`/`select()` do supabase-js: devolve o dado ou lança o `ErroDados`. */
export function extrair<T>(resposta: { data: T | null; error: unknown; status: number }): T {
  if (resposta.error) throw traduzirErro(resposta.error, resposta.status);
  return resposta.data as T;
}
