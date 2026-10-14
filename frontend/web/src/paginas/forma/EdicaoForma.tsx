import type { LinhaFormasPagamento } from '@mymoney/contrato/respostas/formas-pagamento';
import { useState } from 'react';
import { AvisoErroTopo } from '../../componentes/base/AvisoErroTopo';
import { Botao } from '../../componentes/base/Botao';
import { DialogoConfirmacao } from '../../componentes/base/DialogoConfirmacao';
import { FormularioForma } from '../../componentes/FormularioForma';
import { QuadroCartao } from '../../componentes/QuadroCartao';
import { useContas } from '../../ganchos/useContas';
import { useContexto } from '../../ganchos/useContexto';
import { formatarNomeMes } from '../../formatacao/mes';
import { PagamentoCartaoConectada } from '../formas/PagamentoCartaoConectada';
import estilo from './EdicaoForma.module.css';
import { useAcoesForma } from './useAcoesForma';

const TEXTO_EM_USO =
  'Esta forma tem lançamentos ligados a ela. Arquive para tirá-la das opções; o histórico continua.';

export function EdicaoForma({ forma }: { forma: LinhaFormasPagamento }) {
  const acoes = useAcoesForma(forma.id, forma.preferida);
  const contas = useContas();
  const contexto = useContexto();
  const [confirmando, setConfirmando] = useState(false);
  const mesCorrente = contexto.data?.mes_corrente;

  return (
    <>
      {acoes.emUso ? (
        <div className={estilo.erro}>
          <AvisoErroTopo>{TEXTO_EM_USO}</AvisoErroTopo>
        </div>
      ) : null}
      {forma.tipo === 'credito' && forma.gasto_mes_centavos !== null && forma.comprometido_futuro_centavos !== null ? (
        <QuadroCartao
          nome={forma.nome}
          gastoMesCentavos={forma.gasto_mes_centavos}
          comprometidoFuturoCentavos={forma.comprometido_futuro_centavos}
          mes={mesCorrente ? formatarNomeMes(mesCorrente) : undefined}
          destinoPagamento="?pagamento=1"
        />
      ) : null}
      <FormularioForma
        inicial={{
          nome: forma.nome,
          tipo: forma.tipo,
          dia: forma.dia_vencimento === null ? '' : String(forma.dia_vencimento),
          contaId: forma.conta?.id ?? '',
          preferida: forma.preferida,
        }}
        tipoFixo
        contas={contas.data ?? []}
        aoSalvar={acoes.salvar}
      >
        {acoes.emUso ? (
          <>
            <Botao variante="principal" salvando={acoes.arquivando} rotuloOcupado="Arquivando…" onClick={acoes.arquivar}>
              Arquivar forma
            </Botao>
            <Botao variante="secundario" onClick={acoes.cancelarEmUso}>
              Cancelar
            </Botao>
          </>
        ) : (
          <>
            <Botao variante="principal" tipo="submit" salvando={acoes.salvando}>
              Salvar
            </Botao>
            <Botao variante="secundario" salvando={acoes.arquivando} rotuloOcupado="Arquivando…" onClick={acoes.arquivar}>
              Arquivar
            </Botao>
            {forma.pode_excluir ? (
              <Botao variante="perigo" icone="lixo" onClick={() => setConfirmando(true)}>
                Excluir
              </Botao>
            ) : null}
          </>
        )}
      </FormularioForma>
      <PagamentoCartaoConectada forma={forma} />
      <DialogoConfirmacao
        aberto={confirmando}
        titulo="Excluir esta forma?"
        texto="A forma será excluída de vez e não dá para desfazer."
        rotuloConfirmar="Excluir"
        variante="destrutiva"
        iconeConfirmar="lixo"
        aoConfirmar={() => {
          setConfirmando(false);
          acoes.excluir();
        }}
        aoCancelar={() => setConfirmando(false)}
      />
    </>
  );
}
