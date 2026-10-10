import { useId, type ReactNode } from 'react';
import { Icone } from './Icone';
import estilo from './Campo.module.css';

export interface PropsCampoBase {
  rotulo: string;
  ajuda?: string;
  erro?: string;
  desabilitado?: boolean;
}

export interface LigacaoControle {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

interface Props {
  rotulo: string;
  ajuda?: string;
  erro?: string;
  id?: string;
  /** Recebe o que o controle precisa para se ligar ao rótulo, à ajuda e ao erro. */
  children: (ligacao: LigacaoControle) => ReactNode;
}

/** Estrutura comum dos campos: rótulo visível, ajuda e erro ligados ao controle por aria-describedby. */
export function Campo({ rotulo, ajuda, erro, id, children }: Props) {
  const idGerado = useId();
  const idControle = id ?? idGerado;
  const idErro = `${idControle}-erro`;
  const idAjuda = `${idControle}-ajuda`;
  // Erro antes da ajuda: o leitor de tela diz primeiro o que precisa ser corrigido.
  const descritoPor = [erro ? idErro : null, ajuda ? idAjuda : null].filter(Boolean).join(' ');

  return (
    <div className={estilo.campo}>
      <label htmlFor={idControle}>{rotulo}</label>
      {children({
        id: idControle,
        'aria-invalid': erro ? true : undefined,
        'aria-describedby': descritoPor || undefined,
      })}
      {ajuda ? (
        <p id={idAjuda} className={estilo.ajuda}>
          {ajuda}
        </p>
      ) : null}
      {erro ? (
        <p id={idErro} className={estilo.erro}>
          <Icone nome="alerta" />
          {erro}
        </p>
      ) : null}
    </div>
  );
}
