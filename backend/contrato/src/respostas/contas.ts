import type { Id } from './comuns';

export type LinhaContas = {
  id: Id;
  nome: string;
  saldo_inicial_centavos: number;
  saldo_centavos: number;
  arquivada: boolean;
  pode_excluir: boolean;
};
