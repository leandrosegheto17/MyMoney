export interface Ambiente {
  url: string;
  anonKey: string;
  emailA: string;
  emailB: string;
  emailSemMembro: string;
  senha: string;
}

export type Variaveis = Record<string, string | undefined>;

const HOSTS_LOCAIS = new Set(['localhost', '127.0.0.1']);

function exigir(env: Variaveis, nome: string): string {
  const valor = env[nome];
  if (!valor) throw new Error(`Variável ${nome} não informada (ver backend/.env.example).`);
  return valor;
}

/** Recusa qualquer host que não seja local antes de qualquer chamada (G-06). */
export function garantirHostLocal(url: string): URL {
  let analisada: URL;
  try {
    analisada = new URL(url);
  } catch {
    throw new Error('SUPABASE_URL inválida: a suíte só roda contra o Supabase local.');
  }
  if (!HOSTS_LOCAIS.has(analisada.hostname)) {
    throw new Error(`Host "${analisada.hostname}" recusado: a suíte só roda em localhost ou 127.0.0.1.`);
  }
  return analisada;
}

export function lerAmbiente(env: Variaveis): Ambiente {
  const url = exigir(env, 'SUPABASE_URL');
  garantirHostLocal(url);
  return {
    url,
    anonKey: exigir(env, 'SUPABASE_ANON_KEY'),
    emailA: exigir(env, 'TESTE_EMAIL_A'),
    emailB: exigir(env, 'TESTE_EMAIL_B'),
    emailSemMembro: exigir(env, 'TESTE_EMAIL_SEM_MEMBRO'),
    senha: exigir(env, 'TESTE_SENHA'),
  };
}
