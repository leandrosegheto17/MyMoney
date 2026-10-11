import type { ResumoMes } from '@mymoney/contrato/respostas/resumo-mes';

/** Props de uma seção do bloco Casa: a fatia `conjunto` e o mês `AAAA-MM`. */
export interface PropsCasa {
  conjunto: ResumoMes['conjunto'];
  mes: string;
}

/** Props de uma seção do bloco Eu: a fatia `individual` e o mês `AAAA-MM`. */
export interface PropsEu {
  individual: ResumoMes['individual'];
  mes: string;
}
