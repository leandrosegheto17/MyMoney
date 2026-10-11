import type { LinhaContas } from '@mymoney/contrato/respostas/contas';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { AvisoErroTopo } from '../../componentes/base/AvisoErroTopo';
import { Botao } from '../../componentes/base/Botao';
import { DialogoConfirmacao } from '../../componentes/base/DialogoConfirmacao';
import { AjusteSaldo } from '../../componentes/AjusteSaldo';
import { CartaoSaldo } from '../../componentes/CartaoSaldo';
import { FormularioConta } from '../../componentes/FormularioConta';
import { usePreviaAjuste } from '../../ganchos/useContas';
import { mensagemErro } from '../../rotulos/mensagensErro';
import estilo from './EdicaoConta.module.css';
import { saldoRealDaUrl } from './saldoRealDaUrl';
import { useAcoesConta } from './useAcoesConta';

const TEXTO_EM_USO =
  'Esta conta tem lançamentos ou formas de pagamento ligados a ela. Arquive para tirá-la das opções; o histórico continua.';

export function EdicaoConta({ conta }: { conta: LinhaContas }) {
  const acoes = useAcoesConta(conta.id);
  const [parametros] = useSearchParams();
  const [saldoReal, setSaldoReal] = useState(() => saldoRealDaUrl(parametros));
  const [confirmando, setConfirmando] = useState(false);
  const previa = usePreviaAjuste(conta.id, saldoReal);

  return (
    <>
      {acoes.emUso ? (
        <div className={estilo.erro}>
          <AvisoErroTopo>{TEXTO_EM_USO}</AvisoErroTopo>
        </div>
      ) : (
        <>
          <CartaoSaldo saldoCentavos={conta.saldo_centavos} />
          <AjusteSaldo
            saldoRealCentavos={saldoReal}
            aoMudar={setSaldoReal}
            diferencaCentavos={previa.data}
            erroPrevia={previa.isError && previa.error ? mensagemErro(previa.error) : undefined}
            aoAjustar={() => saldoReal !== undefined && acoes.ajustar(saldoReal, () => setSaldoReal(undefined))}
            ajustando={acoes.ajustando}
          />
        </>
      )}
      <FormularioConta
        nomeInicial={conta.nome}
        saldoInicialCentavos={conta.saldo_inicial_centavos}
        erroSaldoInicial={acoes.erroSaldoInicial}
        aoSalvar={acoes.salvar}
      >
        {acoes.emUso ? (
          <>
            <Botao variante="principal" salvando={acoes.arquivando} rotuloOcupado="Arquivando…" onClick={acoes.arquivar}>
              Arquivar conta
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
            {conta.pode_excluir ? (
              <Botao variante="perigo" icone="lixo" onClick={() => setConfirmando(true)}>
                Excluir
              </Botao>
            ) : null}
          </>
        )}
      </FormularioConta>
      <DialogoConfirmacao
        aberto={confirmando}
        titulo="Excluir esta conta?"
        texto="A conta será excluída de vez e não dá para desfazer."
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
