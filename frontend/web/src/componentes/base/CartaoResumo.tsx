import { useId, type ReactNode } from 'react';
import { Esqueleto, type VarianteEsqueleto } from './Esqueleto';
import { LinhaVazia } from './LinhaVazia';
import estilos from './CartaoResumo.module.css';

interface Props {
  titulo: ReactNode;
  total?: boolean;
  /** `section` com `h2` quando o cartão é uma seção da tela e não um item de grade (`article` com `h3`). */
  secao?: boolean;
  /** Cor da borda do topo; o bloco em si é da tela. */
  bloco: 'casa' | 'eu';
  estado: 'dado' | 'vazio' | 'carregando';
  textoVazio: string;
  acaoVazio?: ReactNode;
  /** Peças do esqueleto no estado `carregando`; o padrão é título, valor e duas linhas. */
  formaEsqueleto?: readonly VarianteEsqueleto[];
  children?: ReactNode;
}

const FORMA_PADRAO: readonly VarianteEsqueleto[] = ['titulo', 'valor', 'linha', 'linha-curta'];

/** Cartão de resumo com os três estados: dado, vazio e carregando. */
export function CartaoResumo({
  titulo,
  total = false,
  secao = false,
  bloco,
  estado,
  textoVazio,
  acaoVazio,
  formaEsqueleto = FORMA_PADRAO,
  children,
}: Props) {
  const idTitulo = useId();
  const classes = [estilos.cartao, estilos[bloco], total ? estilos['cartao-total'] : ''].filter(Boolean).join(' ');

  const Raiz = secao ? 'section' : 'article';
  const Titulo = secao ? 'h2' : 'h3';

  if (estado === 'carregando') {
    return (
      <Raiz className={classes} aria-hidden="true">
        {formaEsqueleto.map((variante, i) => (
          <Esqueleto key={i} variante={variante} />
        ))}
      </Raiz>
    );
  }

  return (
    <Raiz className={classes} aria-labelledby={idTitulo}>
      <Titulo id={idTitulo}>{titulo}</Titulo>
      {estado === 'vazio' ? (
        <>
          <LinhaVazia>{textoVazio}</LinhaVazia>
          {acaoVazio}
        </>
      ) : (
        children
      )}
    </Raiz>
  );
}
