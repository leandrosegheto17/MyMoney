import { chamarRpc } from './rpc';

export async function salvarDespesaFixa(d: {
  id: string;
  descricao: string;
  categoriaId: string;
  valorPrevistoCentavos: number;
  diaVencimento: number;
}): Promise<void> {
  await chamarRpc('salvar_despesa_fixa', {
    p_id: d.id,
    p_descricao: d.descricao,
    p_categoria_id: d.categoriaId,
    p_valor_previsto_centavos: d.valorPrevistoCentavos,
    p_dia_vencimento: d.diaVencimento,
  });
}

export async function encerrarDespesaFixa(id: string): Promise<void> {
  await chamarRpc('encerrar_despesa_fixa', { p_id: id });
}

/** Sem valor ou data, o servidor aplica o previsto e hoje. O `p_id` do lançamento gerado nasce a cada chamada. */
export async function pagarOcorrencia({
  ocorrenciaId,
  formaId,
  valorCentavos,
  data,
}: {
  ocorrenciaId: string;
  formaId: string;
  valorCentavos?: number;
  data?: string;
}): Promise<void> {
  await chamarRpc('pagar_ocorrencia', {
    p_id: crypto.randomUUID(),
    p_ocorrencia_id: ocorrenciaId,
    p_forma_id: formaId,
    ...(valorCentavos !== undefined && { p_valor_centavos: valorCentavos }),
    ...(data !== undefined && { p_data: data }),
  });
}

export async function desfazerPagamento(ocorrenciaId: string): Promise<void> {
  await chamarRpc('desfazer_pagamento', { p_ocorrencia_id: ocorrenciaId });
}
