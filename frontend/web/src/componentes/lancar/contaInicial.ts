import type { DadosLancamento } from '@mymoney/contrato/respostas/dados-lancamento';

/** A conta padrão da receita é decidida no servidor; sem padrão, a primeira da lista; sem contas, nenhuma. */
export function contaInicial(dados: DadosLancamento): string | null {
  return dados.conta_receita_padrao_id ?? dados.contas[0]?.id ?? null;
}
