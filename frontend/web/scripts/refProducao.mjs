import { readFileSync } from 'node:fs';

const LIMPEZA = new URL('../../../backend/operacao/setup/limpeza.md', import.meta.url);

/** Ref do projeto Supabase de produção, lido do registro da limpeza (fonte única). */
export function refProducao() {
  const texto = readFileSync(LIMPEZA, 'utf8');
  const achado = texto.match(/\bref\b[^\n]*?`?\b([a-z]{20})\b`?/i);
  if (!achado) throw new Error('ref de produção não encontrado em limpeza.md');
  return achado[1];
}

export function hostSupabaseProducao() {
  return `${refProducao()}.supabase.co`;
}
