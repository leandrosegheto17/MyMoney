import type { CodigoErro } from '@mymoney/contrato/erros';
import type { EntradaLancar, ResultadoLancar } from '../../ganchos/useLancarDespesa';
import type { LancarReceita } from '@mymoney/contrato/respostas/lancar-receita';

export type TipoLancamento = 'despesa' | 'receita';

export interface EntradaReceita {
  tipo: 'receita';
  valorCentavos: number;
  categoriaId: string;
  contaId: string;
  data: string;
  descricao: string;
}

export type ResultadoReceita =
  | { tipo: 'sucesso'; resposta: LancarReceita }
  | { tipo: 'sem_conexao' }
  | { tipo: 'regra'; codigo: CodigoErro }
  | { tipo: 'erro' };

export type EntradaDespesa = EntradaLancar & { tipo: 'despesa' };

/** O que a folha entrega a quem envia, e o que espera receber de volta. */
export type EntradaFolha = EntradaDespesa | EntradaReceita;
export type ResultadoFolha = ResultadoLancar | ResultadoReceita;
