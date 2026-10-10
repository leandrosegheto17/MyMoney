import type { ButtonHTMLAttributes } from 'react';
import { Icone, type NomeIcone } from './Icone';
import styles from './BotaoIcone.module.css';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  icone: NomeIcone;
  /** Nome acessível: o botão não tem texto visível. */
  rotulo: string;
}

export function BotaoIcone({ icone, rotulo, className, type = 'button', ...resto }: Props) {
  return (
    <button
      {...resto}
      type={type}
      className={className ? `${styles.botao} ${className}` : styles.botao}
      aria-label={rotulo}
    >
      <Icone nome={icone} />
    </button>
  );
}
