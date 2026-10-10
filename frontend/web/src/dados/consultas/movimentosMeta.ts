import type { MovimentosMeta } from '@mymoney/contrato/respostas/movimentos-meta';
import { obterCliente } from '../cliente';
import { extrair } from '../erros';

/** Lista intacta: a `conta` só vem nas linhas do autor, quem filtra é o banco. */
export async function buscarMovimentosMeta(metaId: string): Promise<MovimentosMeta> {
  return extrair<MovimentosMeta>(await obterCliente().rpc('movimentos_meta', { p_meta_id: metaId }));
}
