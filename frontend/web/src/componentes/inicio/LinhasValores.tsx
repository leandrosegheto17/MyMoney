import estilos from './LinhasValores.module.css';

interface Props {
  linhas: readonly { rotulo: string; valor: string }[];
}

/** Pares rótulo/valor de um cartão; o valor já vem formatado. */
export function LinhasValores({ linhas }: Props) {
  return (
    <dl className={estilos.linhas}>
      {linhas.map((l) => (
        <div key={l.rotulo}>
          <dt>{l.rotulo}</dt>
          <dd className="valor">{l.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
