import estilos from './LinhasValores.module.css';

interface Props {
  /** `texto`: o valor não é número (ex.: um mês) e usa a fonte do texto. */
  linhas: readonly { rotulo: string; valor: string; texto?: boolean }[];
}

/** Pares rótulo/valor de um cartão; o valor já vem formatado. */
export function LinhasValores({ linhas }: Props) {
  return (
    <dl className={estilos.linhas}>
      {linhas.map((l) => (
        <div key={l.rotulo}>
          <dt>{l.rotulo}</dt>
          <dd className={l.texto ? undefined : 'valor'}>{l.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
