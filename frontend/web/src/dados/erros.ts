import { isAuthError } from '@supabase/supabase-js';
import { CODIGOS_ERRO, type CodigoErro } from '@mymoney/contrato/erros';
import type { ErroDados } from '../comum/erros';

export type { ErroDados } from '../comum/erros';

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
  // JWT ausente, inválido ou expirado: a sessão precisa ser renovada, não é falha do dado.
  if (status === 401) return { tipo: 'autenticacao' };
  if (typeof status === 'number' && (status >= 500 || status === 429)) return { tipo: 'indisponivel' };
  return undefined;
}

const LIMITES_DE_TAXA_AUTH = ['over_email_send_rate_limit', 'over_request_rate_limit', 'over_sms_send_rate_limit'];

function traduzirAuth(e: { name: string; status?: number; code?: string }): ErroDados {
  if (e.name === 'AuthRetryableFetchError' && e.status === 0) return { tipo: 'rede' };
  const codigo = e.code ? CODIGOS_AUTH[e.code] : undefined;
  if (codigo) return { tipo: 'regra', codigo };
  // Limite de taxa não tem código no contrato: a tela o trata como indisponibilidade momentânea.
  if (e.code && LIMITES_DE_TAXA_AUTH.includes(e.code)) return { tipo: 'indisponivel' };
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

/** Códigos do Auth que, ao entrar, revelariam que a conta existe (banida, não confirmada, gerida por SSO). */
const CODIGOS_AUTH_QUE_REVELAM_CONTA = [
  'email_not_confirmed',
  'user_banned',
  'user_not_found',
  'user_sso_managed',
  'phone_not_confirmed',
];

/** Como `traduzirErro`, mas falhas que distinguiriam a conta caem na mesma resposta de credenciais erradas. */
export function traduzirErroDeEntrada(e: unknown): ErroDados {
  if (isAuthError(e) && e.code && CODIGOS_AUTH_QUE_REVELAM_CONTA.includes(e.code)) {
    return { tipo: 'regra', codigo: 'credenciais_invalidas' };
  }
  return traduzirErro(e);
}

/** Resultado de `rpc()`/`select()` do supabase-js: devolve o dado ou lança o `ErroDados`. */
export function extrair<T>(resposta: { data: T | null; error: unknown; status: number }): T {
  if (resposta.error) throw traduzirErro(resposta.error, resposta.status);
  return resposta.data as T;
}
