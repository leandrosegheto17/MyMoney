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
