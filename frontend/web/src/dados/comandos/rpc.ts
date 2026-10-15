import type { Database } from '@mymoney/contrato/banco';
import type { ArgsRpc } from '../../comum/rpc';
import { obterCliente } from '../cliente';
import { extrair } from '../erros';

type Funcoes = Database['api']['Functions'];

export type { ArgsRpc };

/** Única porta de escrita dos comandos: sempre `rpc`, nunca insert/update/delete (a regra mora no banco). */
export async function chamarRpc<N extends keyof Funcoes>(nome: N, args?: ArgsRpc<N>): Promise<Funcoes[N]['Returns']> {
  return extrair<Funcoes[N]['Returns']>(await obterCliente().rpc(nome, args as Record<string, unknown>));
}
