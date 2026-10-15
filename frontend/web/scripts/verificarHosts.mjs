// Lista os hosts de literais http(s) no build; a CLI falha se houver host fora do Supabase de produção (G-20).
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXTENSOES = new Set(['.js', '.css', '.html', '.webmanifest']);
const LITERAL = /https?:\/\/([a-z0-9.-]+)/gi;
const LIMPEZA = new URL('../../../backend/operacao/setup/limpeza.md', import.meta.url);

// Lista fechada (G-20, aprovada pelo stakeholder em 2026-10-15): literais que o código nunca busca.
// Acrescentar item segue a governança de exceções do GUARDRAILS.
export const EXCECOES = new Map([
  ['www.w3.org', 'namespace XML (SVG), não é requisição'],
  ['react.dev', 'link de mensagem de erro do React'],
  ['reactrouter.com', 'link de documentação do React Router'],
  ['github.com', 'link de documentação em bibliotecas'],
  ['bit.ly', 'link de documentação em bibliotecas'],
  ['localhost', 'base de parse de URL em bibliotecas'],
]);

function arquivos(pasta) {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((e) => {
    const caminho = join(pasta, e.name);
    if (e.isDirectory()) return arquivos(caminho);
    return EXTENSOES.has(extname(e.name)) ? [caminho] : [];
  });
}

export function hostsEncontrados(pasta) {
  const hosts = new Set();
  for (const arquivo of arquivos(pasta)) {
    for (const m of readFileSync(arquivo, 'utf8').matchAll(LITERAL)) hosts.add(m[1].toLowerCase());
  }
  return [...hosts];
}

/** Host do Supabase de produção, pelo ref registrado na limpeza (fonte única, não depende do ambiente). */
function hostPermitido() {
  const ref = readFileSync(LIMPEZA, 'utf8').match(/\bref\b[^\n]*?`?\b([a-z]{20})\b`?/i)?.[1];
  if (!ref) throw new Error('ref de produção não encontrado em limpeza.md');
  return `${ref}.supabase.co`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pasta = process.argv[2] ?? 'dist';
  const permitido = hostPermitido();
  const intrusos = hostsEncontrados(pasta).filter((h) => h !== permitido && !EXCECOES.has(h));
  if (intrusos.length > 0) {
    console.error(`Hosts fora de ${permitido} em ${pasta}:\n${intrusos.map((h) => `  ${h}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`ok: nenhum host além de ${permitido}`);
}
