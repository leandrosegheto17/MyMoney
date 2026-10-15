// Lista os hosts de literais http(s) no build; a CLI falha se houver host fora do Supabase de produção (G-20).
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hostSupabaseProducao as hostPermitido } from './refProducao.mjs';

const EXTENSOES = new Set(['.js', '.css', '.html', '.webmanifest']);
const LITERAL = /https?:\/\/([a-z0-9.-]+)([^\s`'"\)<>]*)/gi;

// Lista fechada (G-20): literais que o código nunca busca. Cada host só vale com o caminho que a
// biblioteca usa; o mesmo host com outro caminho (literal escrito no app) continua sendo intruso.
// Acrescentar item segue a governança de exceções do GUARDRAILS.
export const EXCECOES = new Map([
  ['www.w3.org', { motivo: 'namespace XML (SVG, xlink, MathML), não é requisição', aceita: /^\/(2000\/svg|1999\/xlink|1998\/Math\/MathML|XML\/1998\/namespace)$/ }],
  ['react.dev', { motivo: 'link de mensagem de erro do React', aceita: /^\/errors\// }],
  ['reactrouter.com', { motivo: 'link de documentação do React Router', aceita: /^\/en\/main\// }],
  ['github.com', { motivo: 'link de documentação em bibliotecas', aceita: /^\/(ungap|supabase|orgs\/supabase)\// }],
  ['bit.ly', { motivo: 'link de documentação do Workbox', aceita: /^\/wb-precache$/ }],
  ['localhost', { motivo: 'base de parse de URL em bibliotecas', aceita: /^(:9999)?$/ }],
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

/** Hosts de literais que não são o Supabase de produção nem uma exceção no formato aceito. */
export function hostsIntrusos(pasta, permitido) {
  const intrusos = new Set();
  for (const arquivo of arquivos(pasta)) {
    for (const [, host, resto] of readFileSync(arquivo, 'utf8').matchAll(LITERAL)) {
      const h = host.toLowerCase();
      if (h !== permitido && !EXCECOES.get(h)?.aceita.test(resto)) intrusos.add(h);
    }
  }
  return [...intrusos];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--host') {
    console.log(hostPermitido());
    process.exit(0);
  }
  const pasta = process.argv[2] ?? 'dist';
  const permitido = hostPermitido();
  const intrusos = hostsIntrusos(pasta, permitido);
  if (intrusos.length > 0) {
    console.error(`Hosts fora de ${permitido} em ${pasta}:\n${intrusos.map((h) => `  ${h}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`ok: nenhum host além de ${permitido}`);
}
