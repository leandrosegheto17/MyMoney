import type { LancarDespesa } from './lancar-despesa';

/** Mesma forma da resposta de `lancar_despesa`: uma receita é sempre um único lançamento à vista. */
export type LancarReceita = LancarDespesa;
