import type { ResumoMes } from '@mymoney/contrato/respostas/resumo-mes';
import { BlocoInicio } from './BlocoInicio';
import { CasaFixas } from './CasaFixas';
import { CasaMetas } from './CasaMetas';
import { CasaOrcamento } from './CasaOrcamento';
import { CasaPorCategoria } from './CasaPorCategoria';
import { CasaQuemPagou } from './CasaQuemPagou';
import { CasaResultado } from './CasaResultado';
import { CasaTotal } from './CasaTotal';
import { EuContas } from './EuContas';
import { EuCartoes } from './EuCartoes';
import { EuMetas } from './EuMetas';
import { EuOrcamento } from './EuOrcamento';
import { EuPorCategoria } from './EuPorCategoria';
import { EuReceitas } from './EuReceitas';
import { EuTotal } from './EuTotal';
import { PrimeirosPassos } from './PrimeirosPassos';

interface Props {
  resumo: ResumoMes;
  /** 'AAAA-MM' */
  mes: string;
  nome?: string;
  temConta: boolean;
  temForma: boolean;
  instalado: boolean;
}

/** Os dois blocos da Início; cada seção recebe só a fatia da resposta que lhe cabe. */
export function ConteudoInicio({ resumo, mes, nome, temConta, temForma, instalado }: Props) {
  const { conjunto, individual } = resumo;
  return (
    <>
      <PrimeirosPassos temConta={temConta} temForma={temForma} instalado={instalado} />
      <BlocoInicio bloco="casa">
        <CasaTotal conjunto={conjunto} mes={mes} mesVazio={false} />
        <CasaQuemPagou conjunto={conjunto} mes={mes} />
        <CasaFixas conjunto={conjunto} mes={mes} />
        <CasaOrcamento conjunto={conjunto} mes={mes} />
        <CasaPorCategoria conjunto={conjunto} mes={mes} />
        <CasaResultado conjunto={conjunto} mes={mes} />
        <CasaMetas conjunto={conjunto} mes={mes} />
      </BlocoInicio>
      <BlocoInicio bloco="eu" nome={nome}>
        <EuTotal individual={individual} mes={mes} mesVazio={false} />
        <EuReceitas individual={individual} mes={mes} />
        <EuOrcamento individual={individual} mes={mes} />
        <EuPorCategoria individual={individual} mes={mes} />
        <EuContas individual={individual} mes={mes} />
        <EuCartoes individual={individual} mes={mes} />
        <EuMetas individual={individual} mes={mes} />
      </BlocoInicio>
    </>
  );
}
