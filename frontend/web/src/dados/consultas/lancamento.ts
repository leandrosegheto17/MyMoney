import type { Lancamento } from '@mymoney/contrato/respostas/lancamento';
import { obterCliente } from '../cliente';
import { extrair, type ErroDados } from '../erros';
import { ehUuid } from '../uuid';

/** Inexistente, alheio e id malformado dão a mesma resposta: a tela não distingue. */
const REGISTRO_INVALIDO: ErroDados = { tipo: 'regra', codigo: 'registro_invalido' };

export async function buscarLancamento(id: string): Promise<Lancamento> {
  if (!ehUuid(id)) throw REGISTRO_INVALIDO;
  return extrair<Lancamento>(await obterCliente().rpc('lancamento', { p_id: id }));
}
