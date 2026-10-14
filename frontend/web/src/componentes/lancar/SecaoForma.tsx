import type { DadosLancamento } from '@mymoney/contrato/respostas/dados-lancamento';

interface Props {
  formas: DadosLancamento['formas'];
  valor: string | null;
  aoMudar: (id: string) => void;
}

export function SecaoForma(_props: Props) {
  return null;
}
