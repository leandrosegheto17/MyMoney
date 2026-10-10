// Gera src/banco.ts a partir do schema `api` do banco local (supabase gen types).
// `--verificar` regenera em memória e falha se o arquivo versionado difere.
// CONTRATO_DB_URL aponta para um Postgres descartável de loopback quando não há Docker;
// sem ela o gerador usa o stack local (`--local`). Nunca produção.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MENSAGEM = 'contrato desatualizado: rode pnpm contrato:gerar';
const PACOTE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RAIZ = resolve(PACOTE, '../..');
const SUPABASE = resolve(RAIZ, 'node_modules/.bin', process.platform === 'win32' ? 'supabase.cmd' : 'supabase');
const DESTINO = resolve(PACOTE, 'src/banco.ts');
const HOSTS_LOCAIS = new Set(['localhost', '127.0.0.1', '[::1]']);

const normalizar = (texto) => texto.replace(/\r\n/g, '\n');

export function compararGerado(atual, novo) {
  return normalizar(atual) === normalizar(novo) ? { ok: true } : { ok: false, mensagem: MENSAGEM };
}

export function argumentosGerador(env = {}) {
  const base = ['gen', 'types', 'typescript', '--schema', 'api'];
  const url = env.CONTRATO_DB_URL;
  if (!url) return [...base, '--local', '--workdir', 'backend'];
  if (!HOSTS_LOCAIS.has(new URL(url).hostname)) {
    throw new Error('CONTRATO_DB_URL deve apontar para um banco local (localhost/127.0.0.1)');
  }
  return [...base, '--db-url', url];
}

function gerar() {
  // Binário direto: `pnpm exec` pode imprimir mensagens de instalação no stdout e sujar o arquivo.
  const saida = execFileSync(SUPABASE, argumentosGerador(process.env), {
    cwd: RAIZ,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    shell: process.platform === 'win32',
    maxBuffer: 64 * 1024 * 1024,
  });
  return normalizar(saida);
}

function principal(verificar) {
  const novo = gerar();
  if (!verificar) {
    writeFileSync(DESTINO, novo, { encoding: 'utf8' });
    console.log('src/banco.ts gerado');
    return;
  }
  const resultado = compararGerado(readFileSync(DESTINO, 'utf8'), novo);
  if (!resultado.ok) {
    console.error(resultado.mensagem);
    process.exit(1);
  }
  console.log('contrato em dia');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.includes('--verificar'));
}
