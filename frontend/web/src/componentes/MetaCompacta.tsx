import { Link } from 'react-router';
import type { ResumoMeta } from '@mymoney/contrato/respostas/resumo-mes';
import { formatarMesCurto } from '../formatacao/mes';
import { formatarMoeda } from '../formatacao/moeda';
import { BarraProgresso } from './base/BarraProgresso';
import { SeloSituacao } from './base/SeloSituacao';
import estilos from './MetaCompacta.module.css';

interface Props {
  meta: ResumoMeta;
  bloco: 'casa' | 'eu';
  href: string;
}

/** Meta em uma linha de cartão: nome, progresso, quanto falta e, se houver prazo, o ritmo mensal. */
export function MetaCompacta({ meta, bloco, href }: Props) {
  const mensal = meta.mensal_necessario_centavos;

  return (
    <Link to={href} className={`${estilos.meta} ${estilos['meta-link']}`}>
      <BarraProgresso
        elemento="span"
        rotulo={meta.nome}
        percentual={meta.percentual}
        situacao={meta.atingida ? 'atingida' : bloco}
        topo={
          <>
            <span className={estilos['item-titulo']}>{meta.nome}</span>
            {meta.atingida ? <SeloSituacao situacao="atingida" /> : <span className="valor">{meta.percentual}%</span>}
          </>
        }
        posicaoSecundario="depois"
        topoSecundario={
          <>
            <span className="valor">
              {formatarMoeda(meta.guardado_centavos)} de {formatarMoeda(meta.alvo_centavos)}
            </span>
            <span className="valor">faltam {formatarMoeda(meta.falta_centavos)}</span>
          </>
        }
      />
      {meta.prazo !== null && mensal !== null ? (
        <span className={estilos['item-sub']}>
          até {formatarMesCurto(meta.prazo)} · {formatarMoeda(mensal)} por mês
        </span>
      ) : null}
    </Link>
  );
}
