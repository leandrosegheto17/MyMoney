import estilos from './ValorDestaque.module.css';

/** Selo "parcial" ao lado de um total que ainda não fechou o mês. */
export function RotuloParcial() {
  return <span className={estilos['rotulo-parcial']}>parcial</span>;
}
