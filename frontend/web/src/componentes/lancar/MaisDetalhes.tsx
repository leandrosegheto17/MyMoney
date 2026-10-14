import { formatarData, hojeEmSaoPaulo } from '../../formatacao/data';
import { CampoData } from '../base/CampoData';
import { CampoTexto } from '../base/CampoTexto';
import { Icone } from '../base/Icone';
import estilo from './MaisDetalhes.module.css';

interface Props {
  data: string;
  descricao: string;
  aoMudarData: (data: string) => void;
  aoMudarDescricao: (descricao: string) => void;
}

export function MaisDetalhes({ data, descricao, aoMudarData, aoMudarDescricao }: Props) {
  const quando = data === hojeEmSaoPaulo() ? 'hoje' : formatarData(data);
  return (
    <details className={estilo['mais-detalhes']}>
      <summary>
        <Icone nome="dir" />
        Mais detalhes (data: {quando})
      </summary>
      <div className={estilo.campos}>
        <CampoData id="data" rotulo="Data" value={data} onChange={(e) => aoMudarData(e.target.value)} />
        <CampoTexto
          id="descricao"
          rotulo="Descrição (opcional)"
          value={descricao}
          onChange={(e) => aoMudarDescricao(e.target.value)}
        />
      </div>
    </details>
  );
}
