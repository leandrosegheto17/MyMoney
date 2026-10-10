import type { Escopo } from '@mymoney/contrato/enums';
import type { ErroDados } from '../erros';
import { ehUuid } from '../uuid';
import { chamarRpc, type ArgsRpc } from './rpc';

/** `valorCentavos: null` remove o orçamento da categoria no mês. Escopo e dono vêm da categoria, no servidor. */
export async function definirOrcamento({
  mes,
  categoriaId,
  valorCentavos,
}: {
  mes: string;
  categoriaId: string;
  valorCentavos: number | null;
}): Promise<void> {
  if (!ehUuid(categoriaId)) throw { tipo: 'regra', codigo: 'registro_invalido' } satisfies ErroDados;
  // O tipo gerado só prevê "ausente"; a função distingue remover pelo `null` explícito.
  const args = {
    p_mes: `${mes}-01`,
    p_categoria_id: categoriaId,
    p_valor_centavos: valorCentavos,
  } as ArgsRpc<'definir_orcamento'>;
  await chamarRpc('definir_orcamento', args);
}

/** Devolve quantas categorias foram copiadas do mês anterior. */
export async function copiarOrcamento({ mes, escopo }: { mes: string; escopo: Escopo }): Promise<number> {
  return chamarRpc('copiar_orcamento', { p_mes: `${mes}-01`, p_escopo: escopo });
}
