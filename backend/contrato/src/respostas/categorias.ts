import type { Escopo, TipoLancamento } from '../enums';
import type { Id } from './comuns';

export type LinhaCategorias = {
  id: Id;
  nome: string;
  tipo: TipoLancamento;
  escopo: Escopo;
  /** `null` nas categorias de receita. */
  variavel: boolean | null;
  arquivada: boolean;
  pode_excluir: boolean;
};
