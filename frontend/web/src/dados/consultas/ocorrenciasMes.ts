import type { OcorrenciasMes } from '@mymoney/contrato/respostas/ocorrencias-mes';
import { obterCliente } from '../cliente';
import { extrair } from '../erros';
import type { ArgsRpc } from '../comandos/rpc';

/** Devolve a resposta como veio (contagens, previsto e ordem são do servidor). `mes` é `AAAA-MM`. */
export async function buscarOcorrenciasMes(mes: string): Promise<OcorrenciasMes> {
  const args: ArgsRpc<'ocorrencias_mes'> = { p_mes: `${mes}-01` };
  return extrair<OcorrenciasMes>(await obterCliente().rpc('ocorrencias_mes', args));
}
