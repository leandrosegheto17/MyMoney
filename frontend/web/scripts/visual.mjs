// Compara as telas do app com o mockup (comparar-visual.mjs) em duas passadas, cada uma com seu Vite
// e sua porta: T01/T01b sem sessão e as demais com sessão falsa (VITE_MODO_COMPARACAO, só aqui).
// Sem --tela compara só os ids de e2e/telas-implementadas.json; com --tela, o id pedido.
// Relatório e PNGs em .md/.visual/<data>/<tarefa>/<passada>/.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pacote = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const raiz = resolve(pacote, '../..');

function portaLivre() {
  return new Promise((ok, falha) => {
    const servidor = createServer();
    servidor.once('error', falha);
    servidor.listen(0, '127.0.0.1', () => {
      const { port } = servidor.address();
      servidor.close(() => ok(port));
    });
  });
}

const data = new Date().toISOString().slice(0, 10);
const tarefa = process.env.TAREFA || 'manual';
const config = process.env.CONFIG_VISUAL || resolve(raiz, '.md/mockup/telas.json');
const SEM_SESSAO = ['T01', 'T01b'];

// Separa --tela (decide as passadas) do restante, repassado ao comparador.
const entrada = process.argv.slice(2).filter((a) => a !== '--');
const repassadas = [];
let pedidas = null;
for (let i = 0; i < entrada.length; i++) {
  if (entrada[i] === '--tela') pedidas = (entrada[++i] ?? '').split(',').filter(Boolean);
  else repassadas.push(entrada[i]);
}

const ids = pedidas ?? JSON.parse(readFileSync(resolve(pacote, 'e2e/telas-implementadas.json'), 'utf8'));
const passadas = [
  { modo: 'sem-sessao', ids: ids.filter((id) => SEM_SESSAO.includes(id)) },
  { modo: 'sessao-falsa', ids: ids.filter((id) => !SEM_SESSAO.includes(id)) },
].filter((p) => p.ids.length > 0);

if (passadas.length === 0) {
  console.log('Nenhuma tela para comparar (e2e/telas-implementadas.json vazio e sem --tela).');
  process.exit(0);
}

let pior = 0;
for (const { modo, ids: lista } of passadas) {
  const porta = Number(process.env.PORTA) || (await portaLivre());
  const r = spawnSync(
    process.execPath,
    [
      resolve(raiz, '.claude/scripts/comparar-visual.mjs'),
      '--config',
      config,
      '--pacote',
      pacote,
      '--base-url',
      `http://127.0.0.1:${porta}`,
      '--iniciar',
      `pnpm exec vite --host 127.0.0.1 --port ${porta} --strictPort`,
      '--saida',
      resolve(raiz, '.md/.visual', data, tarefa, modo),
      '--tela',
      lista.join(','),
      ...repassadas,
    ],
    {
      stdio: 'inherit',
      cwd: pacote,
      env: {
        ...process.env,
        PORTA: String(porta),
        VITE_MODO_COMPARACAO: modo,
        VITE_SUPABASE_URL: 'https://comparacao.invalid',
        VITE_SUPABASE_ANON_KEY: 'chave-de-comparacao',
      },
    },
  );
  pior = Math.max(pior, r.status ?? 1);
}
process.exit(pior);
