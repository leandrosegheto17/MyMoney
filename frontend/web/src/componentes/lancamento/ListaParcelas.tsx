import type { Lancamento } from '@mymoney/contrato/respostas/lancamento';
import { useId } from 'react';
import { formatarData } from '../../formatacao/data';
import { formatarMoeda } from '../../formatacao/moeda';
import estilo from './ListaParcelas.module.css';

interface Props {
  parcelas: Lancamento['parcelas'];
  numParcelas: number;
}

/** Parcelas da compra (número, data e valor), só leitura. */
export function ListaParcelas({ parcelas, numParcelas }: Props) {
  const idTitulo = useId();
  return (
    <section className={estilo.secao} aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className={estilo.titulo}>
        Parcelas
      </h2>
      <ul className={estilo.lista}>
        {parcelas.map((p) => (
          <li key={p.id}>
            <span className="valor texto-2">
              {p.numero}/{numParcelas}
            </span>
            <span className="valor">{formatarData(p.data)}</span>
            <span className="valor">{formatarMoeda(p.valor_centavos)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
