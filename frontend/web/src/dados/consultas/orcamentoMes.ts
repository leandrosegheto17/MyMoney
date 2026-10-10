import type { Escopo } from '@mymoney/contrato/enums';
import type { OrcamentoMes } from '@mymoney/contrato/respostas/orcamento-mes';
import { obterCliente } from '../cliente';
import { extrair } from '../erros';
import type { ArgsRpc } from '../comandos/rpc';

/** Devolve a resposta como veio (total, ordem das linhas e situações são do servidor). `mes` é `AAAA-MM`. */
export async function buscarOrcamentoMes(mes: string, escopo: Escopo): Promise<OrcamentoMes> {
  const args: ArgsRpc<'orcamento_mes'> = { p_mes: `${mes}-01`, p_escopo: escopo };
  return extrair<OrcamentoMes>(await obterCliente().rpc('orcamento_mes', args));
}
