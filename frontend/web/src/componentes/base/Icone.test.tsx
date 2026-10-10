import { readdirSync, readFileSync } from 'node:fs';
import { render } from '@testing-library/react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { Icone, type NomeIcone } from './Icone';
import { SpriteIcones } from './SpriteIcones';

const TELAS = new URL('../../../../../.md/mockup/telas/', import.meta.url);

function htmlDasTelas(): string[] {
  return readdirSync(TELAS)
    .filter((nome) => nome.endsWith('.html'))
    .map((nome) => readFileSync(new URL(nome, TELAS), 'utf8'));
}

function unicos(textos: string[], padrao: RegExp): string[] {
  const achados = new Set<string>();
  for (const texto of textos) for (const m of texto.matchAll(padrao)) achados.add(m[1]);
  return [...achados].sort();
}

function idsDoSprite(): string[] {
  const { container } = render(<SpriteIcones />);
  return [...container.querySelectorAll('symbol')].map((s) => s.id).sort();
}

describe('Icone', () => {
  it('renderiza <use href="#i-casa"> num svg oculto do leitor de tela', () => {
    const { container } = render(<Icone nome="casa" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('icone');
    expect(svg?.querySelector('use')).toHaveAttribute('href', '#i-casa');
  });

  it('o nome do ícone é tipado', () => {
    expectTypeOf<'casa'>().toMatchTypeOf<NomeIcone>();
    expectTypeOf<'inexistente'>().not.toMatchTypeOf<NomeIcone>();
  });
});

describe('SpriteIcones', () => {
  it('é um svg 0×0 oculto do leitor de tela', () => {
    const { container } = render(<SpriteIcones />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden');
    expect(svg).toHaveAttribute('width', '0');
    expect(svg).toHaveAttribute('height', '0');
  });

  it('tem os 30 símbolos, um por nome de ícone, sem repetição', () => {
    const ids = idsDoSprite();
    expect(ids).toHaveLength(30);
    expect(new Set(ids).size).toBe(30);
    for (const id of ids) {
      expect(id).toMatch(/^i-[a-z-]+$/);
      const { container } = render(<Icone nome={id.slice(2) as NomeIcone} />);
      expect(container.querySelector('use')).toHaveAttribute('href', `#${id}`);
    }
  });

  it('tem exatamente os símbolos que o mockup define', () => {
    const doMockup = unicos(htmlDasTelas(), /<symbol id="(i-[a-z-]+)"/g);
    expect(idsDoSprite()).toEqual(doMockup);
  });

  it('todo href="#i-…" usado no mockup tem símbolo no sprite', () => {
    const usados = unicos(htmlDasTelas(), /href="#(i-[a-z-]+)"/g);
    const doSprite = new Set(idsDoSprite());
    expect(usados.filter((id) => !doSprite.has(id))).toEqual([]);
  });
});
