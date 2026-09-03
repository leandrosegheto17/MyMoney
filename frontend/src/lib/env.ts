/**
 * Leitura tipada das variáveis de ambiente expostas ao bundle do cliente (Vite,
 * prefixo `VITE_*` — ver `.env.example`). Centralizado aqui para nunca espalhar
 * `import.meta.env.VITE_*` cru pelo app e para falhar cedo/de forma legível se uma
 * variável obrigatória estiver ausente, em vez de um erro genérico do supabase-js.
 */
function readEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente ${name} ausente — configure ${name} no .env local (ver .env.example) antes de rodar o app.`,
    );
  }
  return value;
}

export function getSupabaseUrl(): string {
  return readEnv("VITE_SUPABASE_URL");
}

export function getSupabaseAnonKey(): string {
  return readEnv("VITE_SUPABASE_ANON_KEY");
}
