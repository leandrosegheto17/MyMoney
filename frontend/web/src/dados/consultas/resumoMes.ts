import type { ResumoMes } from '@mymoney/contrato/respostas/resumo-mes';
import { obterCliente } from '../cliente';
import { extrair } from '../erros';
import type { ArgsRpc } from '../comandos/rpc';

/** Devolve a resposta como veio: todos os totais e a situação de cada item são do servidor. `mes` é `AAAA-MM`. */
export async function buscarResumoMes(mes: string): Promise<ResumoMes> {
  const args: ArgsRpc<'resumo_mes'> = { p_mes: `${mes}-01` };
  return extrair<ResumoMes>(await obterCliente().rpc('resumo_mes', args));
}
