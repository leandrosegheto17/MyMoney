import type { LancamentosMes } from '@mymoney/contrato/respostas/lancamentos-mes';
import type { ArgsRpc } from '../comandos/rpc';
import { obterCliente } from '../cliente';
import { extrair } from '../erros';

export type FiltrosLancamentos = {
  escopo?: 'individual' | 'conjunto';
  categoriaId?: string;
  formaId?: string;
  variavel?: true;
};

/** Só os filtros dados vão na requisição; o total e a quantidade já vêm calculados pelo servidor. */
export async function buscarLancamentosMes({
  mes,
  escopo,
  categoriaId,
  formaId,
  variavel,
}: FiltrosLancamentos & { mes: string }): Promise<LancamentosMes> {
  const args: ArgsRpc<'lancamentos_mes'> = {
    p_mes: `${mes}-01`,
    ...(escopo !== undefined && { p_escopo: escopo }),
    ...(categoriaId !== undefined && { p_categoria_id: categoriaId }),
    ...(formaId !== undefined && { p_forma_id: formaId }),
    ...(variavel !== undefined && { p_variavel: variavel }),
  };
  return extrair<LancamentosMes>(await obterCliente().rpc('lancamentos_mes', args));
}
