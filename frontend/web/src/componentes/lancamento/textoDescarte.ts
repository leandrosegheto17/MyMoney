import type { Lancamento } from '@mymoney/contrato/respostas/lancamento';
import { formatarDataCurta } from '../../formatacao/data';

const lista = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' });

/**
 * Texto do diálogo que pede confirmação antes de descartar datas de parcela ajustadas à mão.
 * Quem decide que há descarte é o servidor; aqui só se descreve o que a resposta mostra como ajustado.
 */
export function textoDescarte(parcelas: Lancamento['parcelas']): string {
  const total = parcelas.length;
  const ajustadas = parcelas.filter((p) => p.data_ajustada);
  const recalculo = `Ao mudar o valor total, as ${total} parcelas são recalculadas pelo vencimento do cartão`;
  if (ajustadas.length === 0) return `${recalculo} e os ajustes de data feitos à mão serão descartados.`;

  const nomes = lista.format(ajustadas.map((p) => `${p.numero}/${total}`));
  const datas = lista.format(ajustadas.map((p) => formatarDataCurta(p.data)));
  if (ajustadas.length === 1) {
    return `A parcela ${nomes} teve a data ajustada à mão (${datas}). ${recalculo} e esse ajuste será descartado.`;
  }
  return `As parcelas ${nomes} tiveram a data ajustada à mão (${datas}). ${recalculo} e esses ajustes serão descartados.`;
}
