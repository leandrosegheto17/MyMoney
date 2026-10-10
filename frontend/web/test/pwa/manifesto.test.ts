// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { lerToken } from '../../scripts/lerToken.mjs';

const RAIZ_WEB = fileURLToPath(new URL('../../', import.meta.url));

type Icone = { src: string; sizes: string; type?: string; purpose?: string };
type Manifesto = {
  name: string;
  short_name: string;
  lang: string;
  start_url: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: Icone[];
};

let saida: string;
let manifesto: Manifesto;
const corFundo = lerToken(
  readFileSync(new URL('../../src/estilo/tokens.css', import.meta.url), 'utf8'),
  '--cor-fundo',
);

beforeAll(async () => {
  saida = mkdtempSync(join(tmpdir(), 'mymoney-pwa-'));
  await build({
    root: RAIZ_WEB,
    configFile: join(RAIZ_WEB, 'vite.config.ts'),
    mode: 'production',
    logLevel: 'silent',
    build: { outDir: saida, emptyOutDir: true },
  });
  manifesto = JSON.parse(readFileSync(join(saida, 'manifest.webmanifest'), 'utf8'));
}, 120_000);

afterAll(() => {
  if (saida) rmSync(saida, { recursive: true, force: true });
});

describe('manifest.webmanifest do build', () => {
  it('nome, idioma, início e display standalone', () => {
    expect(manifesto.name).toBe('MyMoney');
    expect(manifesto.short_name).toBe('MyMoney');
    expect(manifesto.lang).toBe('pt-BR');
    expect(manifesto.start_url).toBe('/');
    expect(manifesto.display).toBe('standalone');
  });

  it('theme_color e background_color vêm do token --cor-fundo', () => {
    expect(manifesto.theme_color.toLowerCase()).toBe(corFundo.toLowerCase());
    expect(manifesto.background_color.toLowerCase()).toBe(corFundo.toLowerCase());
  });

  it('tem ícones 192 e 512 e um maskable', () => {
    const tamanhos = manifesto.icons.map((i) => i.sizes);
    expect(tamanhos).toContain('192x192');
    expect(tamanhos).toContain('512x512');
    expect(manifesto.icons.some((i) => i.purpose?.split(' ').includes('maskable'))).toBe(true);
  });

  it('o service worker gerado não guarda resposta da API', () => {
    const sw = readFileSync(join(saida, 'sw.js'), 'utf8');
    expect(sw).not.toMatch(/supabase\.co|\/rest\/v1\/|\/auth\/v1\//);
    expect(sw).not.toMatch(/importScripts\(\s*["']https?:/);
  });

  it('o index.html aponta o apple-touch-icon e a cor do tema', () => {
    const html = readFileSync(join(saida, 'index.html'), 'utf8');
    expect(html).toContain('<link rel="apple-touch-icon" href="/icones/apple-touch-icon.png"');
    expect(html.toLowerCase()).toMatch(
      new RegExp(`<meta name="theme-color" content="${corFundo.toLowerCase()}"`),
    );
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="MyMoney"');
  });
});
