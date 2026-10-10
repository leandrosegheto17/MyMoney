export interface Ambiente {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const HOSTS_LOCAIS = new Set(['localhost', '127.0.0.1']);

function urlValida(valor: string | undefined): valor is string {
  if (!valor) return false;
  try {
    const url = new URL(valor);
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && HOSTS_LOCAIS.has(url.hostname);
  } catch {
    return false;
  }
}

function ehChaveDeServico(chave: string): boolean {
  if (chave.startsWith('sb_secret_')) return true;
  const partes = chave.split('.');
  if (partes.length !== 3) return false;
  try {
    const payload: unknown = JSON.parse(atob((partes[1] ?? '').replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload === 'object' && payload !== null && (payload as { role?: unknown }).role === 'service_role';
  } catch {
    return false;
  }
}

/** Lê e valida as variáveis públicas do bundle. Os erros citam só o nome da variável, nunca o valor. */
export function lerAmbiente(env: ImportMetaEnv = import.meta.env): Ambiente {
  if (!urlValida(env.VITE_SUPABASE_URL)) {
    throw new Error('VITE_SUPABASE_URL ausente ou inválida: use https (ou http apenas em localhost/127.0.0.1)');
  }
  const chave = env.VITE_SUPABASE_ANON_KEY;
  if (!chave) throw new Error('VITE_SUPABASE_ANON_KEY ausente');
  if (ehChaveDeServico(chave)) {
    throw new Error('VITE_SUPABASE_ANON_KEY inválida: só a chave anon pode ir para o navegador');
  }
  return { supabaseUrl: env.VITE_SUPABASE_URL, supabaseAnonKey: chave };
}
