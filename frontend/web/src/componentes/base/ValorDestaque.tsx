import { formatarMoeda } from '../../formatacao/moeda';
import { RotuloParcial } from './RotuloParcial';
import estilos from './ValorDestaque.module.css';

interface Props {
  centavos: number;
  parcial?: boolean;
}

/** Valor grande de um cartão; `parcial` marca total de mês ainda aberto. */
export function ValorDestaque({ centavos, parcial = false }: Props) {
  return (
    <div className={estilos['linha-destaque']}>
      <p className={estilos['valor-destaque']}>{formatarMoeda(centavos)}</p>
      {parcial ? <RotuloParcial /> : null}
    </div>
  );
}
