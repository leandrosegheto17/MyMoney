import type { Escopo, TipoForma } from '../enums';
import type { Id, IdNome } from './comuns';

export type DadosLancamento = {
  categorias_despesa: (IdNome & { escopo: Escopo; variavel: boolean })[];
  categorias_receita: (IdNome & { escopo: Escopo })[];
  formas: (IdNome & { tipo: TipoForma; preferida: boolean })[];
  forma_padrao_id: Id | null;
  contas: IdNome[];
  conta_receita_padrao_id: Id | null;
};
