// @vitest-environment node
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';

const RAIZ_WEB = fileURLToPath(new URL('../../', import.meta.url));
const pastas: string[] = [];

function pastaTemporaria(): string {
  const p = mkdtempSync(join(tmpdir(), 'mymoney-build-'));
  pastas.push(p);
  return p;
}

function construir(outDir: string, mode = 'production') {
  return build({
    root: RAIZ_WEB,
    configFile: join(RAIZ_WEB, 'vite.config.ts'),
    mode,
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

// O Vitest roda com NODE_ENV=test, o que mantém `import.meta.env.DEV` verdadeiro no build;
// o bundle de produção de verdade exige NODE_ENV=production.
const NODE_ENV_ORIGINAL = process.env.NODE_ENV;

beforeEach(() => {
  process.env.NODE_ENV = 'production';
});

afterEach(() => {
  delete process.env.VITE_MODO_COMPARACAO;
  process.env.NODE_ENV = NODE_ENV_ORIGINAL;
});

afterAll(() => {
  for (const p of pastas) rmSync(p, { recursive: true, force: true });
});

describe('build de produção e modo de comparação', () => {
  it('falha se VITE_MODO_COMPARACAO estiver definida', async () => {
    process.env.VITE_MODO_COMPARACAO = 'sessao-falsa';
    await expect(construir(pastaTemporaria())).rejects.toThrow(/VITE_MODO_COMPARACAO/);
  }, 120_000);

  it('falha também em build com mode development', async () => {
    process.env.VITE_MODO_COMPARACAO = 'sessao-falsa';
    await expect(construir(pastaTemporaria(), 'development')).rejects.toThrow(/VITE_MODO_COMPARACAO/);
  }, 120_000);

  it('sem a variável, o bundle não contém o código do modo', async () => {
    const saida = pastaTemporaria();
    await construir(saida);
    // 'sem-sessao' é valor legítimo de SituacaoSessao; só marcadores exclusivos do modo entram aqui.
    const proibidos = ['sessao-falsa', 'comparacao.invalid', '0000000000a1'];
    const achados = arquivos(saida).flatMap((arquivo) => {
      const texto = readFileSync(arquivo, 'latin1');
      return proibidos.filter((p) => texto.includes(p)).map((p) => `${arquivo}: ${p}`);
    });
    expect(achados).toEqual([]);
  }, 120_000);
});
