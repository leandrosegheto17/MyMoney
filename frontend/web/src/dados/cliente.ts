import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { lerAmbiente } from '../configuracao/ambiente';
import { tokenDoModo } from './modoComparacao';

/** Cliente tipado no schema `api`, o único exposto. */
// `any`: o tipo das linhas vem de @mymoney/contrato, não de um Database gerado.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ClienteDados = SupabaseClient<any, 'api', 'api'>;

export interface OpcoesCliente {
  url: string;
  chave: string;
  fetch?: typeof fetch;
}

/** Só o schema `api` é exposto pelo PostgREST; a sessão persiste e renova sozinha, e o link de redefinição chega pela URL. */
export function criarCliente({ url, chave, fetch }: OpcoesCliente): ClienteDados {
  const tokenFalso = tokenDoModo();
  return createClient(url, chave, {
    db: { schema: 'api' },
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    // Com `accessToken` o cliente não usa o Auth: nada de renovar sessão (modo de comparação visual).
    ...(tokenFalso ? { accessToken: async () => tokenFalso } : {}),
    ...(fetch ? { global: { fetch } } : {}),
  });
}

let instancia: ClienteDados | undefined;

/** Instância única, criada na primeira chamada. Interna a `dados/`. */
export function obterCliente(): ClienteDados {
  if (!instancia) {
    const { supabaseUrl, supabaseAnonKey } = lerAmbiente();
    instancia = criarCliente({ url: supabaseUrl, chave: supabaseAnonKey });
  }
  return instancia;
}
