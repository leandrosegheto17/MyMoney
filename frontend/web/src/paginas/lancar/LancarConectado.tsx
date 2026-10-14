import type { Ref } from 'react';
import { FolhaLancar } from '../../componentes/lancar/FolhaLancar';
import { useDadosLancamento } from '../../ganchos/useDadosLancamento';

interface Props {
  aberta: boolean;
  aoFechar: () => void;
  refValor: Ref<HTMLInputElement>;
}

/** Liga a folha de lançamento aos dados de `dados_lancamento`. */
export function LancarConectado({ aberta, aoFechar, refValor }: Props) {
  const { data } = useDadosLancamento();
  return <FolhaLancar aberta={aberta} aoFechar={aoFechar} refValor={refValor} dados={data?.dados} />;
}
