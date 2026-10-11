import { linkEnvios } from '../../formatacao/links';
import { BotaoIcone } from '../base/BotaoIcone';
import { SeletorMes } from '../SeletorMes';
import estilos from './CabecalhoInicio.module.css';

interface Props {
  /** 'AAAA-MM' */
  mes: string;
  aoMudarMes: (mes: string) => void;
  /** Itens na fila de envio; o ícone só aparece com pelo menos um. */
  pendentes: number;
}

export function CabecalhoInicio({ mes, aoMudarMes, pendentes }: Props) {
  return (
    <header className={estilos.cabecalho}>
      <SeletorMes mes={mes} aoMudar={aoMudarMes} />
      <div className={estilos.acoes}>
        {pendentes > 0 ? (
          <BotaoIcone
            icone="envio"
            rotulo={`Envios pendentes: ${pendentes}`}
            para={linkEnvios(mes)}
            contador={pendentes}
          />
        ) : null}
        <BotaoIcone icone="ajustes" rotulo="Ajustes" para="/ajustes" />
      </div>
    </header>
  );
}
