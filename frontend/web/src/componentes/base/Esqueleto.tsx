import estilos from './Esqueleto.module.css';

type Variante = 'titulo' | 'valor' | 'linha' | 'linha-curta' | 'bloco-titulo';

interface Props {
  variante: Variante;
}

/** Peça de esqueleto; a forma de cada tela é montada pela tela. Decorativa (fica dentro de CarregandoComAtraso). */
export function Esqueleto({ variante }: Props) {
  return <div className={`${estilos.esqueleto} ${estilos[variante]}`} />;
}
