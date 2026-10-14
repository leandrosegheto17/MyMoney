import { linkOrcamento } from '../../formatacao/links';
import { formatarNomeMes } from '../../formatacao/mes';
import { LinkMais } from '../base/LinkMais';
import { ResumoOrcamento } from '../ResumoOrcamento';
import type { PropsCasa } from './tipos';

export function CasaOrcamento({ conjunto, mes }: PropsCasa) {
  const destino = linkOrcamento({ mes, escopo: 'conjunto' });
  return (
    <ResumoOrcamento
      titulo="Orçamento da casa"
      bloco="casa"
      orcamento={conjunto.orcamento}
      linkVer={destino}
      textoVer="Ver orçamento"
      textoVazio="Sem orçamento em outubro."
      acaoVazio={
        <LinkMais seta para={destino}>
          Definir orçamento
        </LinkMais>
      }
    />
  );
}
