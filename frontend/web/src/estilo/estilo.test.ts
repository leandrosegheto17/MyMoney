// @vitest-environment node
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const MOCKUP = new URL('../../../../.md/mockup/', import.meta.url);
const ESTILO = new URL('./', import.meta.url);

function sha256(url: URL): string {
  return createHash('sha256').update(readFileSync(url)).digest('hex');
}

function woff2(pasta: URL): string[] {
  return readdirSync(pasta)
    .filter((nome) => nome.endsWith('.woff2'))
    .sort();
}

describe('cópias do mockup sem alteração', () => {
  it('tokens.css é idêntico ao do mockup', () => {
    expect(sha256(new URL('tokens.css', ESTILO))).toBe(sha256(new URL('tokens.css', MOCKUP)));
  });

  it('as fontes .woff2 são as mesmas e idênticas uma a uma', () => {
    const doMockup = woff2(new URL('fontes/', MOCKUP));
    const doApp = woff2(new URL('fontes/', ESTILO));
    expect(doMockup.length).toBeGreaterThan(0);
    expect(doApp).toEqual(doMockup);
    for (const nome of doMockup) {
      expect(sha256(new URL(`fontes/${nome}`, ESTILO)), nome).toBe(sha256(new URL(`fontes/${nome}`, MOCKUP)));
    }
  });

  it('a licença OFL acompanha as fontes', () => {
    expect(sha256(new URL('fontes/LICENSE-OFL.txt', ESTILO))).toBe(sha256(new URL('fontes/LICENSE-OFL.txt', MOCKUP)));
  });
});

describe('global.css', () => {
  const css = readFileSync(new URL('global.css', ESTILO), 'utf8');

  it('não tem prefers-color-scheme', () => {
    expect(css).not.toContain('prefers-color-scheme');
  });

  it('não tem @import nem fonte externa', () => {
    expect(css).not.toMatch(/@import/);
    expect(css).not.toMatch(/https?:\/\//);
  });

  it('traz as regras da seção Base do mockup', () => {
    for (const seletor of [
      ':focus-visible',
      '.visualmente-oculto',
      '.icone',
      '.valor',
      '.texto-2',
      '.pequeno',
      'html.com-folha',
    ]) {
      expect(css, seletor).toContain(seletor);
    }
  });
});

describe('global.css com a folha aberta', () => {
  it('limita a altura da página atrás dela (#raiz) à da tela', () => {
    const css = readFileSync(new URL('global.css', ESTILO), 'utf8');
    expect(css).toMatch(/html\.com-folha #raiz\s*\{[^}]*max-height: 100%[^}]*overflow: hidden/);
  });
});
