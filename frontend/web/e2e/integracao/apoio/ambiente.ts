// Ambiente dos e2e @integracao: só roda contra o Supabase local e com as credenciais do seed
// vindas do ambiente (backend/.env.example); nenhuma senha padrão no código.
import { ehHostLocal } from '../../apoio/limpeza-local';

export interface AmbienteIntegracao {
  supabaseUrl: string;
  emailA: string;
  emailB: string;
  emailSemMembro: string;
  senha: string;
}

function exigir(env: Record<string, string | undefined>, nome: string): string {
  const valor = env[nome];
  if (!valor) throw new Error(`Variável ${nome} ausente: veja backend/.env.example`);
  return valor;
}

export function lerAmbienteIntegracao(env: Record<string, string | undefined>): AmbienteIntegracao {
  const supabaseUrl = env.VITE_SUPABASE_URL;
  if (!supabaseUrl || !ehHostLocal(supabaseUrl)) {
    throw new Error('VITE_SUPABASE_URL ausente ou fora de 127.0.0.1/localhost: e2e @integracao só roda no Supabase local');
  }
  return {
    supabaseUrl,
    emailA: exigir(env, 'TESTE_EMAIL_A'),
    emailB: exigir(env, 'TESTE_EMAIL_B'),
    emailSemMembro: exigir(env, 'TESTE_EMAIL_SEM_MEMBRO'),
    senha: exigir(env, 'TESTE_SENHA'),
  };
}
