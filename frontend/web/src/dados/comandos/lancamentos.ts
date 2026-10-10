import type { ErroDados } from '../erros';
import { ehUuid } from '../uuid';
import { chamarRpc, type ArgsRpc } from './rpc';

export type CamposLancamento = {
  valorTotalCentavos?: number;
  categoriaId?: string;
  descricao?: string;
  data?: string;
  formaId?: string;
  numParcelas?: number;
};

/** Só os campos recebidos vão na requisição; quem pode alterar o quê é decisão do servidor. */
export async function editarLancamento({
  id,
  campos,
  confirmarDescarte = false,
}: {
  id: string;
  campos: CamposLancamento;
  confirmarDescarte?: boolean;
}): Promise<void> {
  const { valorTotalCentavos, categoriaId, descricao, data, formaId, numParcelas } = campos;
  const args: ArgsRpc<'editar_lancamento'> = {
    p_id: id,
    ...(valorTotalCentavos !== undefined && { p_valor_total_centavos: valorTotalCentavos }),
    ...(categoriaId !== undefined && { p_categoria_id: categoriaId }),
    ...(descricao !== undefined && { p_descricao: descricao }),
    ...(data !== undefined && { p_data: data }),
    ...(formaId !== undefined && { p_forma_id: formaId }),
    ...(numParcelas !== undefined && { p_num_parcelas: numParcelas }),
    p_confirmar_descarte: confirmarDescarte,
  };
  await chamarRpc('editar_lancamento', args);
}

/** A edição descartaria ajustes de parcela: a tela confirma e reenvia com `confirmarDescarte`. */
export const ehConfirmarDescarte = (erro: ErroDados | null | undefined): boolean =>
  erro?.tipo === 'regra' && erro.codigo === 'confirmar_descarte_ajustes';

export const excluirLancamento = async (id: string): Promise<void> => {
  await chamarRpc('excluir_lancamento', { p_id: id });
};

export async function alterarDataParcela({ parcelaId, data }: { parcelaId: string; data: string }): Promise<void> {
  if (!ehUuid(parcelaId)) throw { tipo: 'regra', codigo: 'registro_invalido' } satisfies ErroDados;
  await chamarRpc('alterar_data_parcela', { p_parcela_id: parcelaId, p_data: data });
}
