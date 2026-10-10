import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { ORDEM_ESCOPO } from '../../rotulos/escopo';
import { ORDEM_SITUACAO_OCORRENCIA } from '../../rotulos/situacaoOcorrencia';
import { SeloEscopo } from './SeloEscopo';
import { SeloSituacao } from './SeloSituacao';

// Regra 1.4.1 da UX-SPEC §5: a cor nunca é o único sinal.
const variantes: Array<[string, ReactElement]> = [
  ...ORDEM_ESCOPO.map((escopo): [string, ReactElement] => [`escopo ${escopo}`, <SeloEscopo escopo={escopo} />]),
  ...ORDEM_SITUACAO_OCORRENCIA.map((situacao): [string, ReactElement] => [
    `situação ${situacao}`,
    <SeloSituacao situacao={situacao} />,
  ]),
  ['situação ajustada', <SeloSituacao situacao="ajustada" />],
];

describe('selos sempre com ícone e texto', () => {
  it('cobre todas as variantes dos rótulos', () => {
    expect(variantes.length).toBe(ORDEM_ESCOPO.length + ORDEM_SITUACAO_OCORRENCIA.length + 1);
  });

  it.each(variantes)('%s renderiza ícone e texto', (_nome, elemento) => {
    const { container } = render(elemento);
    const selo = container.firstElementChild as HTMLElement;

    const icone = selo.querySelector('svg use');
    expect(icone?.getAttribute('href')).toMatch(/^#i-[a-z-]+$/);
    expect(selo.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });
});
