import type { Escopo, TipoMovimentoMeta } from '@mymoney/contrato/enums';
import { chamarRpc } from './rpc';

/** `prazo` é `AAAA-MM` ou nulo; `escopo` só na criação (na edição não se troca). O `id` vem da tela, para o reenvio ser idempotente. */
export async function salvarMeta({
  id,
  nome,
  alvoCentavos,
  prazo,
  escopo,
}: {
  id: string;
  nome: string;
  alvoCentavos: number;
  prazo?: string | null;
  escopo?: Escopo;
}): Promise<string> {
  return chamarRpc('salvar_meta', {
    p_id: id,
    p_nome: nome,
    p_alvo_centavos: alvoCentavos,
    ...(prazo && { p_prazo: `${prazo}-01` }),
    ...(escopo !== undefined && { p_escopo: escopo }),
  });
}

/** O `id` do movimento nasce uma vez por folha; sem conta, a chave não é enviada. */
export async function movimentarMeta({
  id,
  metaId,
  tipo,
  valorCentavos,
  data,
  local,
  contaId,
}: {
  id: string;
  metaId: string;
  tipo: TipoMovimentoMeta;
  valorCentavos: number;
  data: string;
  local: string;
  contaId?: string;
}): Promise<string> {
  return chamarRpc('movimentar_meta', {
    p_id: id,
    p_meta_id: metaId,
    p_tipo: tipo,
    p_valor_centavos: valorCentavos,
    p_data: data,
    p_local: local,
    ...(contaId !== undefined && { p_conta_id: contaId }),
  });
}
