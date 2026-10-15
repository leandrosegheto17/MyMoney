import type { Database } from '@mymoney/contrato/banco';

type Funcoes = Database['api']['Functions'];

export type ArgsRpc<N extends keyof Funcoes> = Funcoes[N]['Args'];
