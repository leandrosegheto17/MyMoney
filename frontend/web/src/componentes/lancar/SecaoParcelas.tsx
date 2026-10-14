import type { TipoForma } from '@mymoney/contrato/enums';

interface Props {
  tipoForma: TipoForma | null;
  valor: number;
  aoMudar: (parcelas: number) => void;
}

export function SecaoParcelas(_props: Props) {
  return null;
}
