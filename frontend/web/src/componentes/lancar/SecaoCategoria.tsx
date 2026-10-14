import type { DadosLancamento } from '@mymoney/contrato/respostas/dados-lancamento';

interface Props {
  categorias: DadosLancamento['categorias_despesa'];
  valor: string | null;
  aoMudar: (id: string) => void;
  erro?: string;
}

export function SecaoCategoria(_props: Props) {
  return null;
}
