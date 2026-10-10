import { chamarRpc, type ArgsRpc } from './rpc';

export const salvarCategoria = (args: ArgsRpc<'salvar_categoria'>) => chamarRpc('salvar_categoria', args);

export const arquivarCategoria = async (id: string): Promise<void> => {
  await chamarRpc('arquivar_categoria', { p_id: id });
};

export const excluirCategoria = async (id: string): Promise<void> => {
  await chamarRpc('excluir_categoria', { p_id: id });
};
