import type { LancarReceita } from '@mymoney/contrato/respostas/lancar-receita';
import { chamarRpc, type ArgsRpc } from './rpc';

/** Idempotente pelo `p_id`: repetir a chamada devolve o lançamento já gravado com `ja_existia: true`. */
export async function lancarReceita(args: ArgsRpc<'lancar_receita'>): Promise<LancarReceita> {
  return (await chamarRpc('lancar_receita', args)) as LancarReceita;
}
