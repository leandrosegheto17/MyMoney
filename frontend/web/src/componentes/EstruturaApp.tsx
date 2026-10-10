import type { ReactNode } from 'react';
import { BarraNavegacao } from './BarraNavegacao';
import { TrilhoNavegacao } from './TrilhoNavegacao';
import estilos from './EstruturaApp.module.css';

interface Props {
  aoLancar: () => void;
  mes?: string;
  estreito?: boolean;
  children: ReactNode;
}

/** Moldura das telas autenticadas: trilho (PC), conteúdo e barra inferior (celular). */
export function EstruturaApp({ aoLancar, mes, estreito = false, children }: Props) {
  const classe = estreito ? `${estilos.conteudo} ${estilos['conteudo-estreito']}` : estilos.conteudo;
  return (
    <div className={estilos.app}>
      <TrilhoNavegacao aoLancar={aoLancar} mes={mes} />
      <div className={classe}>{children}</div>
      <BarraNavegacao aoLancar={aoLancar} mes={mes} />
    </div>
  );
}
