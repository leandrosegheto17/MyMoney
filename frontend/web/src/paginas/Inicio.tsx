import { PuxarParaAtualizar } from '../componentes/base/PuxarParaAtualizar';
import { EstadosDeLeitura } from '../componentes/EstadosDeLeitura';
import { CabecalhoInicio } from '../componentes/inicio/CabecalhoInicio';
import { ConteudoInicio } from '../componentes/inicio/ConteudoInicio';
import { EsqueletoInicio } from '../componentes/inicio/EsqueletoInicio';
import { FaixasInicio } from '../componentes/inicio/FaixasInicio';
import { textoErroInicio } from '../componentes/inicio/textoErroInicio';
import { formatarNomeMes } from '../formatacao/mes';
import { useConectado } from '../ganchos/useConectado';
import { useContexto } from '../ganchos/useContexto';
import { useDadosLancamento } from '../ganchos/useDadosLancamento';
import { useLeituraComCache } from '../ganchos/useLeituraComCache';
import { useMesDaUrl } from '../ganchos/useMesDaUrl';
import { usePendentes } from '../ganchos/usePendentes';
import { useResumoMes } from '../ganchos/useResumoMes';
import { useRevalidarPagina } from '../ganchos/useRevalidarPagina';

interface Props {
  instalado: boolean;
}

export function Inicio({ instalado }: Props) {
  const [mes, definirMes] = useMesDaUrl();
  const consulta = useResumoMes(mes);
  const leitura = useLeituraComCache(consulta);
  const nome = useContexto().data?.membro?.nome;
  const dadosLancamento = useDadosLancamento().data?.dados;
  const { total: pendentes } = usePendentes();
  const conectado = useConectado();
  const revalidar = useRevalidarPagina();
  const carregando = leitura.situacao === 'carregando';
  const erro = textoErroInicio(consulta.error, mes);

  const principal = (
    <main aria-busy={carregando}>
      <FaixasInicio mes={mes} conectado={conectado} pendentes={pendentes} />
      <EstadosDeLeitura
        leitura={leitura}
        esqueleto={<EsqueletoInicio nome={nome} />}
        anuncioCarregando={`Carregando o resumo de ${formatarNomeMes(mes)}…`}
        tituloErro={erro.titulo}
        textoErro={erro.texto}
        aoTentarDeNovo={() => void consulta.refetch()}
      >
        {(resumo) => (
          <ConteudoInicio
            resumo={resumo}
            mes={mes}
            nome={nome}
            // Sem a resposta de cadastro ainda, não se mostra "Primeiros passos" por engano.
            temConta={dadosLancamento ? dadosLancamento.contas.length > 0 : true}
            temForma={dadosLancamento ? dadosLancamento.formas.length > 0 : true}
            instalado={instalado}
          />
        )}
      </EstadosDeLeitura>
    </main>
  );

  return (
    <>
      <CabecalhoInicio mes={mes} aoMudarMes={definirMes} pendentes={pendentes} />
      {/* O gesto só vale com a página pronta: a região viva dele competiria com o anúncio de carregamento. */}
      {carregando ? principal : <PuxarParaAtualizar aoAtualizar={revalidar}>{principal}</PuxarParaAtualizar>}
    </>
  );
}
