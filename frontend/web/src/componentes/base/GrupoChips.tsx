import { useId, type ReactNode } from 'react';
import { ChipOpcao } from './ChipOpcao';
import estilos from './Chips.module.css';

export interface OpcaoChip {
  valor: string;
  conteudo: ReactNode;
  desabilitada?: boolean;
}

interface Props {
  nome: string;
  rotulo: string;
  opcoes: OpcaoChip[];
  valor: string;
  aoMudar: (valor: string) => void;
  variante: 'grade' | 'linha';
  erro?: string;
}

export function GrupoChips({ nome, rotulo, opcoes, valor, aoMudar, variante, erro }: Props) {
  const idErro = useId();
  return (
    <fieldset
      role="radiogroup"
      className={estilos.campo}
      aria-describedby={erro ? idErro : undefined}
      aria-invalid={erro ? true : undefined}
    >
      <legend className={estilos.rotulo}>{rotulo}</legend>
      <div className={variante === 'grade' ? estilos.chips : estilos['chips-linha']}>
        {opcoes.map((o) => (
          <ChipOpcao
            key={o.valor}
            nome={nome}
            valor={o.valor}
            conteudo={o.conteudo}
            marcado={o.valor === valor}
            desabilitado={o.desabilitada}
            comIcone={variante === 'grade'}
            aoMudar={aoMudar}
          />
        ))}
      </div>
      {erro ? (
        <p id={idErro} className={estilos['campo-erro']}>
          {erro}
        </p>
      ) : null}
    </fieldset>
  );
}
