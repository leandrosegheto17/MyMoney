import type { LancarDespesa } from '@mymoney/contrato/respostas/lancar-despesa';
import { chamarRpc, type ArgsRpc } from './rpc';

/** Idempotente pelo `p_id`: repetir a chamada devolve o lançamento já gravado com `ja_existia: true`. */
export async function lancarDespesa(args: ArgsRpc<'lancar_despesa'>): Promise<LancarDespesa> {
  return (await chamarRpc('lancar_despesa', args)) as LancarDespesa;
}
