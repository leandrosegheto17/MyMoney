import { useState } from 'react';
import { BotaoLink } from '../componentes/base/BotaoLink';
import { CabecalhoPagina } from '../componentes/base/CabecalhoPagina';
import { DialogoConfirmacao } from '../componentes/base/DialogoConfirmacao';
import { EstadoVazio } from '../componentes/base/EstadoVazio';
import { LinhaVazia } from '../componentes/base/LinhaVazia';
import { useAviso } from '../componentes/base/useAviso';
import type { ErroDados } from '../dados/erros';
import { EstadosDeLeitura } from '../componentes/EstadosDeLeitura';
import { CartaoOcorrencias, type Ocorrencia } from '../componentes/fixas/CartaoOcorrencias';
import { EsqueletoFixas } from '../componentes/fixas/EsqueletoFixas';
import { ModelosFixas } from '../componentes/fixas/ModelosFixas';
import { SeletorMes } from '../componentes/SeletorMes';
import { formatarNomeMes } from '../formatacao/mes';
import { useComandosFixas } from '../ganchos/useComandosFixas';
import { useDespesasFixas } from '../ganchos/useDespesasFixas';
import { useLeituraComCache } from '../ganchos/useLeituraComCache';
import { useMesDaUrl } from '../ganchos/useMesDaUrl';
import { useOcorrenciasMes } from '../ganchos/useOcorrenciasMes';
import { mensagemErro } from '../rotulos/mensagensErro';

const NOVA = '/fixas/nova';

export function DespesasFixas() {
  const [mes, definirMes] = useMesDaUrl();
  const consulta = useOcorrenciasMes(mes);
  const leitura = useLeituraComCache(consulta);
  const modelos = useDespesasFixas();
  const { desfazerPagamento } = useComandosFixas();
  const { mostrar } = useAviso();
  const [desfazendo, setDesfazendo] = useState<Ocorrencia | null>(null);

  const ativos = modelos.data?.filter((m) => m.encerrada_em === null) ?? [];

  async function confirmarDesfazer() {
    const alvo = desfazendo;
    setDesfazendo(null);
    if (!alvo) return;
    try {
      await desfazerPagamento.mutateAsync(alvo.id);
      mostrar('sucesso', 'Pagamento desfeito');
    } catch (erro) {
      mostrar('erro', mensagemErro(erro as ErroDados));
    }
  }

  return (
    <>
      <CabecalhoPagina titulo="Despesas fixas" voltarPara="/" rotuloVoltar="Voltar para Início" />
      <main>
        <SeletorMes mes={mes} aoMudar={definirMes} elemento="span" />
        <EstadosDeLeitura
          leitura={leitura}
          esqueleto={<EsqueletoFixas />}
          anuncioCarregando="Carregando as despesas fixas…"
          aoTentarDeNovo={() => void consulta.refetch()}
        >
          {(dados) =>
            dados.total === 0 && modelos.data !== undefined && ativos.length === 0 ? (
              <EstadoVazio
                icone="relogio"
                titulo="Nenhuma despesa fixa cadastrada"
                texto="Cadastre as contas que se repetem todo mês (aluguel, luz, internet). O app cria uma ocorrência por mês e avisa quando atrasar."
                acao={<BotaoLink para={NOVA} variante="principal" icone="mais">Nova despesa fixa</BotaoLink>}
              />
            ) : (
              <>
                {dados.total === 0 ? (
                  <LinhaVazia>Nenhuma despesa fixa neste mês</LinhaVazia>
                ) : (
                  <>
                    {dados.pagas === dados.total ? <LinhaVazia>Todas pagas em {formatarNomeMes(mes)}</LinhaVazia> : null}
                    <CartaoOcorrencias
                      mes={mes}
                      resumo={dados}
                      ocorrencias={dados.ocorrencias}
                      aoDesfazer={setDesfazendo}
                    />
                  </>
                )}
                <ModelosFixas mes={mes} modelos={ativos} />
              </>
            )
          }
        </EstadosDeLeitura>
      </main>
      <DialogoConfirmacao
        aberto={desfazendo !== null}
        titulo={`Desfazer o pagamento de ${desfazendo?.descricao ?? ''}?`}
        texto="A ocorrência volta a Pendente e o lançamento do pagamento é excluído."
        rotuloConfirmar="Desfazer pagamento"
        variante="destrutiva"
        aoConfirmar={() => void confirmarDesfazer()}
        aoCancelar={() => setDesfazendo(null)}
      />
    </>
  );
}
