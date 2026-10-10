// @vitest-environment node
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

const RAIZ_WEB = fileURLToPath(new URL('../../', import.meta.url));
const pastas: string[] = [];

function pastaTemporaria(): string {
  const p = mkdtempSync(join(tmpdir(), 'mymoney-build-'));
  pastas.push(p);
  return p;
}

function construir(outDir: string) {
  return build({
    root: RAIZ_WEB,
    configFile: join(RAIZ_WEB, 'vite.config.ts'),
    mode: 'production',
    logLevel: 'silent',
    build: { outDir, emptyOutDir: true },
  });
}

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });
}

afterEach(() => {
  delete process.env.VITE_MODO_COMPARACAO;
});

afterAll(() => {
  for (const p of pastas) rmSync(p, { recursive: true, force: true });
});

describe('build de produção e modo de comparação', () => {
  it('falha se VITE_MODO_COMPARACAO estiver definida', async () => {
    process.env.VITE_MODO_COMPARACAO = 'sessao-falsa';
    await expect(construir(pastaTemporaria())).rejects.toThrow(/VITE_MODO_COMPARACAO/);
  }, 120_000);

  it('sem a variável, o bundle não contém o código do modo', async () => {
    const saida = pastaTemporaria();
    await construir(saida);
    const proibidos = ['sessao-falsa', 'sem-sessao', 'comparacao.invalid', '0000000000a1'];
    const achados = arquivos(saida).flatMap((arquivo) => {
      const texto = readFileSync(arquivo, 'latin1');
      return proibidos.filter((p) => texto.includes(p)).map((p) => `${arquivo}: ${p}`);
    });
    expect(achados).toEqual([]);
  }, 120_000);
});
