import { Link } from 'react-router';
import { Icone, type NomeIcone } from './Icone';
import estilo from './Lista.module.css';

type Props = {
  icone?: NomeIcone;
  rotulo: string;
  /** Número exibido antes da seta. */
  contagem?: number;
  /** Cor de ação destrutiva (via classe). */
  destrutivo?: boolean;
} & ({ para: string; aoClicar?: never } | { aoClicar: () => void; para?: never });

/** Item de `ul.lista`: link de navegação (`para`, com seta) ou botão (`aoClicar`). */
export function ItemLink({ icone, rotulo, contagem, destrutivo, para, aoClicar }: Props) {
  const classe = destrutivo ? `${estilo.link} ${estilo.perigo}` : estilo.link;
  const titulo = (
    <span className={estilo.titulo}>
      {icone ? <Icone nome={icone} /> : null}
      {rotulo}
    </span>
  );
  if (para === undefined) {
    return (
      <li>
        <button type="button" className={classe} onClick={aoClicar}>
          {titulo}
        </button>
      </li>
    );
  }
  return (
    <li>
      <Link to={para} className={classe}>
        {titulo}
        <span className={estilo.sub}>
          {contagem}
          <Icone nome="dir" className={estilo.seta} />
        </span>
      </Link>
    </li>
  );
}
