import type { ReactNode } from 'react';
import { Icone, type NomeIcone } from './Icone';
import estilos from './Faixa.module.css';

type Variante = 'offline' | 'pendentes' | 'instalar' | 'cache';

interface Props {
  variante: Variante;
  children?: ReactNode;
  /** Botões ou links da faixa (Ver, Instalar, Dispensar), montados por quem chama. */
  acoes?: ReactNode;
  /** Hora já formatada; só na variante `cache`. */
  hora?: string;
}

const ICONE: Record<Variante, NomeIcone> = {
  offline: 'envio',
  pendentes: 'envio',
  instalar: 'adicionar',
  cache: 'relogio',
};

/** Faixa de instalar tem controles: região comum, não região viva. As demais só informam. */
export function Faixa({ variante, children, acoes, hora }: Props) {
  const destaque = variante === 'offline' || variante === 'pendentes' ? ` ${estilos['faixa-aviso']}` : '';
  const papel = variante === 'instalar' ? { role: 'region', 'aria-label': 'Instalar o app' } : { role: 'status' };
  return (
    <div className={`${estilos.faixa}${destaque}`} {...papel}>
      <Icone nome={ICONE[variante]} />
      <span className={estilos['texto-faixa']}>
        {variante === 'cache' ? `Mostrando dados de ${hora ?? ''}` : children}
      </span>
      {acoes ? <div className={estilos.acoes}>{acoes}</div> : null}
    </div>
  );
}
