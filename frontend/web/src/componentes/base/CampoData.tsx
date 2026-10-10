import type { InputHTMLAttributes, Ref } from 'react';
import { Campo, type PropsCampoBase } from './Campo';
import estilo from './Campo.module.css';

type Props = PropsCampoBase &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'disabled' | 'type' | 'className'> & {
    ref?: Ref<HTMLInputElement>;
  };

/** `value` e o valor entregue em `onChange` são sempre AAAA-MM-DD. */
export function CampoData({ rotulo, ajuda, erro, desabilitado, id, ref, ...resto }: Props) {
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} erro={erro} id={id}>
      {(ligacao) => (
        <input {...resto} {...ligacao} ref={ref} type="date" disabled={desabilitado} className={estilo.entrada} />
      )}
    </Campo>
  );
}
