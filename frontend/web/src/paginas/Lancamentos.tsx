import { PuxarParaAtualizar } from '../componentes/base/PuxarParaAtualizar';
import { EstadoVazio } from '../componentes/base/EstadoVazio';
import { CabecalhoMes } from '../componentes/CabecalhoMes';
import { EstadosDeLeitura } from '../componentes/EstadosDeLeitura';
import { EsqueletoLancamentos } from '../componentes/lancamentos/EsqueletoLancamentos';
import { FiltrosLancamentos } from '../componentes/lancamentos/FiltrosLancamentos';
import { ListaLancamentosMes } from '../componentes/lancamentos/ListaLancamentosMes';
import { TotalFiltrado } from '../componentes/lancamentos/TotalFiltrado';
import { formatarNomeMes } from '../formatacao/mes';
import { useContexto } from '../ganchos/useContexto';
import { useDadosLancamento } from '../ganchos/useDadosLancamento';
import { useLancamentosMes, type FiltrosDaLista } from '../ganchos/useLancamentosMes';
import { useLeituraComCache } from '../ganchos/useLeituraComCache';
import { useMesDaUrl } from '../ganchos/useMesDaUrl';
import { usePendentes } from '../ganchos/usePendentes';
import { useRevalidarPagina } from '../ganchos/useRevalidarPagina';

const SEM_FILTROS: FiltrosDaLista = {};

export function Lancamentos() {
  const [mes, definirMes] = useMesDaUrl();
  const consulta = useLancamentosMes(mes, SEM_FILTROS);
  const leitura = useLeituraComCache(consulta);
  const membroId = useContexto().data?.membro?.id ?? '';
  const dadosLancamento = useDadosLancamento().data?.dados;
  const { total: pendentes } = usePendentes();
  const revalidar = useRevalidarPagina();
  const carregando = leitura.situacao === 'carregando';
  const erroSemCache = leitura.situacao === 'erro';

  const filtrosAtivos = (
    <FiltrosLancamentos
      filtros={SEM_FILTROS}
      aoMudar={() => undefined}
      categorias={dadosLancamento?.categorias_despesa ?? []}
      formas={dadosLancamento?.formas ?? []}
    />
  );

  const principal = (
    <main aria-busy={carregando}>
      {erroSemCache ? null : filtrosAtivos}
      <EstadosDeLeitura
        leitura={leitura}
        esqueleto={<EsqueletoLancamentos />}
        anuncioCarregando="Carregando os lançamentos…"
        aoTentarDeNovo={() => void consulta.refetch()}
      >
        {(lista) => (
          <>
            <TotalFiltrado totalCentavos={lista.total_filtrado_centavos} quantidade={lista.quantidade} />
            {lista.itens.length === 0 ? (
              <EstadoVazio icone="busca" titulo={`Nenhum lançamento em ${formatarNomeMes(mes)}`} />
            ) : (
              <ListaLancamentosMes itens={lista.itens} membroAtualId={membroId} />
            )}
          </>
        )}
      </EstadosDeLeitura>
    </main>
  );

  return (
    <>
      <CabecalhoMes mes={mes} aoMudarMes={definirMes} pendentes={pendentes} prefixoOculto="Lançamentos de " />
      {/* O gesto só vale com a página pronta: a região viva dele competiria com o anúncio de carregamento. */}
      {carregando ? principal : <PuxarParaAtualizar aoAtualizar={revalidar}>{principal}</PuxarParaAtualizar>}
    </>
  );
}
