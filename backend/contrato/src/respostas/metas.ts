import type { Escopo } from '../enums';
import type { Id } from './comuns';

export type LinhaMetas = {
  id: Id;
  nome: string;
  escopo: Escopo;
  alvo_centavos: number;
  guardado_centavos: number;
  falta_centavos: number;
  percentual: number;
  /** `AAAA-MM`. */
  prazo: string | null;
  mensal_necessario_centavos: number | null;
  atingida: boolean;
  /** Só no detalhe de uma meta. */
  por_local?: { local: string; guardado_centavos: number }[];
};
