import type { ItemFila } from '../../dados/fila/tipos';
import type { EstadoLancar } from '../lancar/useFormularioLancar';

/** Valores da folha de lançamento que reproduzem o item guardado, para o membro corrigi-lo. */
export function correcaoDoItem(item: ItemFila): EstadoLancar {
  return {
    valorCentavos: item.args.p_valor_centavos,
    categoriaId: item.args.p_categoria_id,
    formaId: item.args.p_forma_id,
    parcelas: item.args.p_parcelas,
    data: item.args.p_data,
    descricao: item.args.p_descricao ?? '',
  };
}
