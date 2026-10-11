import estilo from './Segmentado.module.css';

export interface OpcaoSegmentado {
  valor: string;
  rotulo: string;
  desabilitada?: boolean;
}

interface Props {
  /** Nome do grupo para tecnologia assistiva; não aparece na tela. */
  legenda: string;
  /** `name` dos rádios nativos (as setas do teclado trocam a opção). */
  nome: string;
  opcoes: OpcaoSegmentado[];
  valor: string;
  aoMudar: (valor: string) => void;
}

/** Escolha de uma opção entre poucas, em rádios nativos. */
export function Segmentado({ legenda, nome, opcoes, valor, aoMudar }: Props) {
  return (
    <fieldset className={estilo.segmentado}>
      <legend className="visualmente-oculto">{legenda}</legend>
      {opcoes.map((opcao) => (
        <label key={opcao.valor}>
          <input
            type="radio"
            name={nome}
            value={opcao.valor}
            checked={opcao.valor === valor}
            disabled={opcao.desabilitada}
            onChange={() => aoMudar(opcao.valor)}
          />
          <span>{opcao.rotulo}</span>
        </label>
      ))}
    </fieldset>
  );
}
