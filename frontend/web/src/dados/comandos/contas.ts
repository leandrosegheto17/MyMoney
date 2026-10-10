import { chamarRpc, type ArgsRpc } from './rpc';

export const salvarConta = (args: ArgsRpc<'salvar_conta'>) => chamarRpc('salvar_conta', args);

export const arquivarConta = async (id: string): Promise<void> => {
  await chamarRpc('arquivar_conta', { p_id: id });
};

export const excluirConta = async (id: string): Promise<void> => {
  await chamarRpc('excluir_conta', { p_id: id });
};

export interface AjusteSaldo {
  contaId: string;
  saldoRealCentavos: number;
  /** `true` só calcula a diferença, sem gravar o lançamento de ajuste. */
  simular: boolean;
}

/** Diferença em centavos entre o saldo real e o saldo do app. */
export const ajustarSaldo = ({ contaId, saldoRealCentavos, simular }: AjusteSaldo) =>
  chamarRpc('ajustar_saldo', {
    p_conta_id: contaId,
    p_saldo_real_centavos: saldoRealCentavos,
    p_simular: simular,
  });
