// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { hostSupabaseProducao } from '../test/apoio/refProducao';
import { hostsEncontrados } from './verificarHosts.mjs';

const SCRIPT = fileURLToPath(new URL('./verificarHosts.mjs', import.meta.url));
const pastas = [];

function montarDist(arquivos) {
  const raiz = mkdtempSync(join(tmpdir(), 'mymoney-hosts-'));
  pastas.push(raiz);
  for (const [nome, conteudo] of Object.entries(arquivos)) {
    const caminho = join(raiz, nome);
    mkdirSync(join(caminho, '..'), { recursive: true });
    writeFileSync(caminho, conteudo);
  }
  return raiz;
}

function rodarCli(pasta) {
  return spawnSync(process.execPath, [SCRIPT, pasta], { encoding: 'utf8' });
}

afterEach(() => {
  for (const p of pastas.splice(0)) rmSync(p, { recursive: true, force: true });
});

describe('hostsEncontrados', () => {
  it('lista os hosts dos literais http(s) em js, css, html e webmanifest', () => {
    const supabase = hostSupabaseProducao();
    const pasta = montarDist({
      'index.html': '<html></html>',
      'assets/app.js': `fetch("https://${supabase}/rest/v1/rpc/contexto")`,
      'assets/app.css': 'body{}',
      'manifest.webmanifest': '{"start_url":"/"}',
      'nao-verificado.txt': 'https://ignorado.example',
    });
    expect(hostsEncontrados(pasta)).toEqual([supabase]);
  });

  it('acha host de terceiro', () => {
    const pasta = montarDist({ 'assets/app.js': 'const u = "https://exemplo.com/x";' });
    expect(hostsEncontrados(pasta)).toContain('exemplo.com');
  });
});

describe('verificar-hosts (CLI)', () => {
  it('só o Supabase de produção: sai 0', () => {
    const pasta = montarDist({
      'assets/app.js': `const url = "https://${hostSupabaseProducao()}";`,
      'index.html': '<!doctype html><html lang="pt-BR"></html>',
    });
    expect(rodarCli(pasta).status).toBe(0);
  });

  it('hosts da lista de exceções (namespace e links de biblioteca): sai 0', () => {
    const pasta = montarDist({
      'assets/app.js': `const a = "https://${hostSupabaseProducao()}"; const b = "http://www.w3.org/2000/svg"; const c = "https://react.dev/errors/"; const d = "http://localhost";`,
    });
    expect(rodarCli(pasta).status).toBe(0);
  });

  it('host da lista de exceções com caminho de biblioteca em chunk de vendor: sai 0', () => {
    const pasta = montarDist({
      'assets/vendor.js': 'const a = "https://github.com/supabase/supabase-js"; const b = "https://bit.ly/wb-precache";',
    });
    expect(rodarCli(pasta).status).toBe(0);
  });

  it('host da lista de exceções com outro caminho (literal do app): sai 1 e cita o host', () => {
    const pasta = montarDist({
      'assets/vendor.js': 'const a = "https://react.dev/errors/";',
      'assets/Tela-abc.js': 'const link = "https://github.com/alguem/repo"; const c = "https://bit.ly/abc";',
    });
    const r = rodarCli(pasta);
    expect(r.status).toBe(1);
    const saida = `${r.stdout}${r.stderr}`;
    expect(saida).toContain('github.com');
    expect(saida).toContain('bit.ly');
    expect(saida).not.toContain('react.dev');
  });

  it('com https://exemplo.com: sai 1 e aponta o host', () => {
    const pasta = montarDist({
      'assets/app.js': `const a = "https://${hostSupabaseProducao()}"; const b = "https://exemplo.com/x";`,
    });
    const r = rodarCli(pasta);
    expect(r.status).toBe(1);
    expect(`${r.stdout}${r.stderr}`).toContain('exemplo.com');
  });
});
