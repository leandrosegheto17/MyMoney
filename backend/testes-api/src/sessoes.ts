import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { lerAmbiente, type Ambiente } from './ambiente';
import type { Database } from './tipos-api';

export type ClienteApi = SupabaseClient<Database, 'api'>;

let ambiente: Ambiente | undefined;
const sessoes = new Map<string, Promise<ClienteApi>>();

export function obterAmbiente(): Ambiente {
  ambiente ??= lerAmbiente(process.env);
  return ambiente;
}

function criar(): ClienteApi {
  const amb = obterAmbiente();
  return createClient(amb.url, amb.anonKey, {
    db: { schema: 'api' },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as ClienteApi;
}

/** Login real (um por e-mail, reaproveitado no arquivo). */
export function entrar(email: string): Promise<ClienteApi> {
  let sessao = sessoes.get(email);
  if (!sessao) {
    sessao = (async () => {
      const cliente = criar();
      const { error } = await cliente.auth.signInWithPassword({ email, password: obterAmbiente().senha });
      if (error) throw new Error(`Login de teste falhou para ${email}: ${error.message}`);
      return cliente;
    })();
    sessoes.set(email, sessao);
  }
  return sessao;
}

export const comoA = () => entrar(obterAmbiente().emailA);
export const comoB = () => entrar(obterAmbiente().emailB);
export const comoSemMembro = () => entrar(obterAmbiente().emailSemMembro);
export const comoAnon = async (): Promise<ClienteApi> => criar();
