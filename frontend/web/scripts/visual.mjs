// Compara as telas do app com o mockup (comparar-visual.mjs): sobe o Vite numa porta livre,
// captura e grava relatório e PNGs em .md/.visual/<data>/<tarefa>/.
import { spawnSync } from 'node:child_process';
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

const porta = Number(process.env.PORTA) || (await portaLivre());
const data = new Date().toISOString().slice(0, 10);
const tarefa = process.env.TAREFA || 'manual';
const repassadas = process.argv.slice(2).filter((a) => a !== '--');

const args = [
  resolve(raiz, '.claude/scripts/comparar-visual.mjs'),
  '--config',
  process.env.CONFIG_VISUAL || resolve(raiz, '.md/mockup/telas.json'),
  '--pacote',
  pacote,
  '--base-url',
  `http://127.0.0.1:${porta}`,
  '--iniciar',
  `pnpm exec vite --host 127.0.0.1 --port ${porta} --strictPort`,
  '--saida',
  resolve(raiz, '.md/.visual', data, tarefa),
  ...repassadas,
];

const r = spawnSync(process.execPath, args, {
  stdio: 'inherit',
  cwd: pacote,
  env: { ...process.env, PORTA: String(porta) },
});
process.exit(r.status ?? 1);
