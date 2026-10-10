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
// O .bin do supabase é um .cmd no Windows (exigiria shell); o script JS roda direto no node.
const SUPABASE_JS = resolve(RAIZ, 'node_modules/supabase/dist/supabase.js');
const DESTINO = resolve(PACOTE, 'src/banco.ts');
const HOSTS_LOCAIS = new Set(['localhost', '127.0.0.1', '[::1]']);

const normalizar = (texto) => texto.replace(/\r\n/g, '\n');

export function compararGerado(atual, novo) {
  return normalizar(atual) === normalizar(novo) ? { ok: true } : { ok: false, mensagem: MENSAGEM };
}

const URL_RECUSADA = 'CONTRATO_DB_URL fora do formato aceito (postgresql://[usuario[:senha]@]host[:porta]/banco)';
const PARAMETROS_DE_DESTINO = new Set(['host', 'hostaddr', 'service', 'options']);

// Mascara tudo entre `://` e o último `@` da URL (até o próximo espaço): a senha pode conter
// `@`, `/`, `?` ou `#` crus, então nenhum delimitador antes do último `@` é confiável.
export function mascararUrl(texto) {
  return String(texto).replace(/(postgres(?:ql)?:\/\/)(\S*)/gi, (inteiro, prefixo, resto) => {
    const arroba = resto.lastIndexOf('@');
    return arroba < 0 ? inteiro : `${prefixo}***${resto.slice(arroba)}`;
  });
}

function temCaractereDeControle(texto) {
  for (let i = 0; i < texto.length; i += 1) {
    if (texto.charCodeAt(i) < 32) return true;
  }
  return false;
}

// Mesmas regras de backend/operacao/comum/host-local.sh (G-06): o host validado é o que o libpq usa.
function exigirUrlLocal(url) {
  if (/[\s\\#]/.test(url) || temCaractereDeControle(url)) throw new Error(URL_RECUSADA);
  let analisada;
  try {
    analisada = new URL(url);
  } catch {
    throw new Error(URL_RECUSADA);
  }
  if (analisada.protocol !== 'postgresql:' && analisada.protocol !== 'postgres:') throw new Error(URL_RECUSADA);
  const consulta = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  if (consulta.includes(';')) throw new Error(URL_RECUSADA);
  for (const parametro of consulta.split('&')) {
    const nome = parametro.split('=')[0];
    if (nome.includes('%') || PARAMETROS_DE_DESTINO.has(nome.toLowerCase())) throw new Error(URL_RECUSADA);
  }
  if (!HOSTS_LOCAIS.has(analisada.hostname)) {
    throw new Error('CONTRATO_DB_URL deve apontar para um banco local (localhost/127.0.0.1)');
  }
}

export function argumentosGerador(env = {}) {
  const base = ['gen', 'types', 'typescript', '--schema', 'api'];
  const url = env.CONTRATO_DB_URL;
  if (!url) return [...base, '--local', '--workdir', 'backend'];
  exigirUrlLocal(url);
  return [...base, '--db-url', url];
}

// O filho recebe só o necessário para achar o node e sair pela rede/proxy; tokens e a própria
// CONTRATO_DB_URL (já em argv) não são herdados. `gen types --local/--db-url` dispensa SUPABASE_*.
const VARIAVEIS_DO_FILHO = [
  'PATH', 'Path', 'HOME', 'USERPROFILE', 'SystemRoot', 'TEMP', 'TMP', 'TMPDIR',
  'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'no_proxy',
];

export function ambienteDoFilho(env) {
  const filho = {};
  for (const nome of VARIAVEIS_DO_FILHO) {
    if (env[nome] !== undefined) filho[nome] = env[nome];
  }
  return filho;
}

export function gerar(env = process.env, executar = execFileSync) {
  const args = [SUPABASE_JS, ...argumentosGerador(env)];
  try {
    // Sem shell em nenhuma plataforma; node direto: `pnpm exec` pode sujar o stdout.
    const saida = executar(process.execPath, args, {
      cwd: RAIZ,
      env: ambienteDoFilho(env),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
    return normalizar(saida);
  } catch (causa) {
    // A mensagem original do execFileSync traz os argumentos (a URL com senha): não a repassa.
    const erro = new Error(`supabase gen types falhou (status ${causa?.status ?? 'desconhecido'})`);
    erro.stderr = mascararUrl(causa?.stderr ?? '');
    throw erro;
  }
}

function principal(verificar) {
  let novo;
  try {
    novo = gerar();
  } catch (erro) {
    console.error(erro.message);
    if (erro.stderr) console.error(erro.stderr);
    process.exit(1);
  }
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
