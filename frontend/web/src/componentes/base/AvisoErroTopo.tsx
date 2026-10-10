import type { ReactNode } from 'react';
import { Icone } from './Icone';
import estilo from './AvisoErroTopo.module.css';

/** Erro do envio inteiro, no topo do formulário; o texto entra como filho e é sempre texto puro. */
export function AvisoErroTopo({ children }: { children: ReactNode }) {
  return (
    <p className={estilo['aviso-erro-topo']} role="alert">
      <Icone nome="alerta" />
      {children}
    </p>
  );
}
