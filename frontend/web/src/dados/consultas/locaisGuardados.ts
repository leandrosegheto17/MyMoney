import type { LocaisGuardados } from '@mymoney/contrato/respostas/locais-guardados';
import { obterCliente } from '../cliente';
import { extrair } from '../erros';

export async function buscarLocaisGuardados(): Promise<LocaisGuardados> {
  return extrair<LocaisGuardados>(await obterCliente().rpc('locais_guardados'));
}
