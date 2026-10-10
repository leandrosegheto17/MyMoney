import type { Escopo } from '@mymoney/contrato/enums';
import type { Exaustiva } from './exaustividade';

export const ROTULO_ESCOPO = {
  conjunto: { texto: 'Casa', icone: 'casa', grupo: 'Da casa' },
  individual: { texto: 'Eu', icone: 'pessoa', grupo: 'Minhas' },
} as const satisfies Record<Escopo, { texto: string; icone: string; grupo: string }>;

const ordem = ['conjunto', 'individual'] as const;
export const ORDEM_ESCOPO: Exaustiva<Escopo, typeof ordem> = ordem;
