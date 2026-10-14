import { chamarRpc, type ArgsRpc } from './rpc';

/** `p_conta_id` nulo limpa a conta de pagamento padrão do cartão (o banco aceita `null`). */
export type ArgsSalvarForma = Omit<ArgsRpc<'salvar_forma'>, 'p_conta_id'> & { p_conta_id?: string | null };

export const salvarForma = (args: ArgsSalvarForma) =>
  chamarRpc('salvar_forma', args as ArgsRpc<'salvar_forma'>);

export const arquivarForma = async (id: string): Promise<void> => {
  await chamarRpc('arquivar_forma', { p_id: id });
};

export const excluirForma = async (id: string): Promise<void> => {
  await chamarRpc('excluir_forma', { p_id: id });
};

export const definirPreferida = async (id: string, preferida: boolean): Promise<void> => {
  await chamarRpc('definir_preferida', { p_id: id, p_preferida: preferida });
};

/** O `id` é gerado uma vez por abertura da folha: o reenvio depois de uma falha de rede é idempotente. */
export const registrarPagamentoCartao = (d: {
  id: string;
  formaId: string;
  contaId: string;
  valorCentavos: number;
  data: string;
}) =>
  chamarRpc('registrar_pagamento_cartao', {
    p_id: d.id,
    p_forma_id: d.formaId,
    p_conta_id: d.contaId,
    p_valor_centavos: d.valorCentavos,
    p_data: d.data,
  });
