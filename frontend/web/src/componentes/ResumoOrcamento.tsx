import type { ReactNode } from 'react';
import type { ResumoOrcamento as DadosOrcamento } from '@mymoney/contrato/respostas/resumo-mes';
import { formatarMoeda } from '../formatacao/moeda';
import { BarraProgresso } from './base/BarraProgresso';
import { CartaoResumo } from './base/CartaoResumo';
import { LinkMais } from './base/LinkMais';
import { SeloSituacao } from './base/SeloSituacao';
import estilos from './ResumoOrcamento.module.css';

interface Props {
  titulo: string;
  bloco: 'casa' | 'eu';
  orcamento: DadosOrcamento | null;
  linkVer: string;
  textoVer: string;
  textoVazio: string;
  acaoVazio: ReactNode;
}

const textoValores = (realizado: number, orcado: number) =>
  `${formatarMoeda(realizado)} de ${formatarMoeda(orcado)}`;

/** Cartão de orçamento do mês: total e os destaques que a API escolheu. */
export function ResumoOrcamento({ titulo, bloco, orcamento, linkVer, textoVer, textoVazio, acaoVazio }: Props) {
  if (orcamento === null) {
    return <CartaoResumo titulo={titulo} bloco={bloco} estado="vazio" textoVazio={textoVazio} acaoVazio={acaoVazio} />;
  }

  return (
    <CartaoResumo
      titulo={
        <>
          {titulo} <SeloSituacao situacao={orcamento.situacao} />
        </>
      }
      bloco={bloco}
      estado="dado"
      textoVazio={textoVazio}
    >
      <BarraProgresso
        rotulo={titulo}
        percentual={orcamento.percentual}
        situacao={orcamento.situacao}
        topo={
          <>
            <span className="valor">{textoValores(orcamento.realizado_centavos, orcamento.orcado_centavos)}</span>
            <span className="valor">{orcamento.percentual}%</span>
          </>
        }
      />
      {orcamento.destaques.map((d) => (
        <div className={estilos['orc-linha']} key={d.categoria_id}>
          <BarraProgresso
            rotulo={d.nome}
            percentual={d.percentual}
            situacao={d.situacao}
            topo={
              <>
                <span className={estilos['item-titulo']}>{d.nome}</span>
                <SeloSituacao situacao={d.situacao} />
              </>
            }
            topoSecundario={
              <>
                <span className="valor">{textoValores(d.realizado_centavos, d.orcado_centavos)}</span>
                <span className="valor">{d.percentual}%</span>
              </>
            }
          />
        </div>
      ))}
      <LinkMais para={linkVer}>{textoVer}</LinkMais>
    </CartaoResumo>
  );
}
