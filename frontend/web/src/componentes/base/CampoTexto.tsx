import type { InputHTMLAttributes, Ref } from 'react';
import { Campo, type PropsCampoBase } from './Campo';
import estilo from './Campo.module.css';

type Props = PropsCampoBase &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'disabled' | 'className'> & {
    ref?: Ref<HTMLInputElement>;
  };

export function CampoTexto({ rotulo, ajuda, erro, desabilitado, id, type = 'text', ref, ...resto }: Props) {
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} erro={erro} id={id}>
      {(ligacao) => (
        <input {...resto} {...ligacao} ref={ref} type={type} disabled={desabilitado} className={estilo.entrada} />
      )}
    </Campo>
  );
}
