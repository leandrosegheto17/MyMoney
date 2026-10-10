function tipo(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function comparar(real: unknown, exemplo: unknown, caminho: string): void {
  const tr = tipo(real);
  const te = tipo(exemplo);
  if (tr !== te) throw new Error(`Tipo divergente em ${caminho}: real ${tr}, exemplo ${te}.`);
  if (tr === 'array') {
    const r = real as unknown[];
    const e = exemplo as unknown[];
    // Array vazio (de um lado ou do outro) não diz nada sobre o item.
    if (r.length === 0 || e.length === 0) return;
    comparar(r[0], e[0], `${caminho}[0]`);
    return;
  }
  if (tr === 'object') {
    const r = real as Record<string, unknown>;
    const e = exemplo as Record<string, unknown>;
    for (const chave of Object.keys(e)) {
      if (!(chave in r)) throw new Error(`Chave faltando em ${caminho}: ${chave}.`);
    }
    for (const chave of Object.keys(r)) {
      if (!(chave in e)) throw new Error(`Chave a mais em ${caminho}: ${chave}.`);
    }
    for (const chave of Object.keys(e)) comparar(r[chave], e[chave], `${caminho}.${chave}`);
  }
}

/**
 * Compara chaves e tipos, recursivamente, sem comparar valores. `null` só combina com `null`
 * (um campo anulável no exemplo deve aparecer como `null` no exemplo para aceitar `null`).
 */
export function mesmaForma(real: unknown, exemplo: unknown): void {
  comparar(real, exemplo, 'raiz');
}
