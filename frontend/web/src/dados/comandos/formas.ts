import { chamarRpc, type ArgsRpc } from './rpc';

export const salvarForma = (args: ArgsRpc<'salvar_forma'>) => chamarRpc('salvar_forma', args);

export const arquivarForma = async (id: string): Promise<void> => {
  await chamarRpc('arquivar_forma', { p_id: id });
};

export const excluirForma = async (id: string): Promise<void> => {
  await chamarRpc('excluir_forma', { p_id: id });
};

export const definirPreferida = async (id: string, preferida: boolean): Promise<void> => {
  await chamarRpc('definir_preferida', { p_id: id, p_preferida: preferida });
};
