// Nada pode empurrar o config.toml local para a produção (G-16, ADR-014).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../../', import.meta.url));
const ALVOS = ['.github', 'package.json', 'backend/operacao', 'scripts'];
const IGNORADAS = new Set(['node_modules', '.git']);
const PROIBIDO = /supabase\s+config\s+push/;

function arquivos(caminho) {
  if (!existsSync(caminho)) return [];
  if (statSync(caminho).isFile()) return [caminho];
  return readdirSync(caminho)
    .filter((nome) => !IGNORADAS.has(nome))
    .flatMap((nome) => arquivos(join(caminho, nome)));
}

function achar(lista) {
  return lista.filter(({ texto }) => PROIBIDO.test(texto)).map(({ caminho }) => caminho);
}

test('nenhum arquivo de CI, package.json, operação ou scripts usa supabase config push', () => {
  const lista = ALVOS.flatMap((alvo) => arquivos(join(raiz, alvo))).map((caminho) => ({
    caminho: relative(raiz, caminho),
    texto: readFileSync(caminho, 'utf8'),
  }));
  assert.ok(lista.length > 0);
  assert.deepEqual(achar(lista), []);
});

test('a verificação falha com uma linha de fixture contendo supabase config push', () => {
  const fixtura = [{ caminho: 'fixtura.yml', texto: 'run: pnpm exec supabase config push --project-ref x' }];
  assert.deepEqual(achar(fixtura), ['fixtura.yml']);
});
