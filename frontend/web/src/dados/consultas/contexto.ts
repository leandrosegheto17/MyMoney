import type { Contexto } from '@mymoney/contrato/respostas/contexto';
import { obterCliente } from '../cliente';
import { extrair } from '../erros';

export async function buscarContexto(): Promise<Contexto> {
  return extrair<Contexto>(await obterCliente().rpc('contexto'));
}
