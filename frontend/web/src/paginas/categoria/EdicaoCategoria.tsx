import type { LinhaCategorias } from '@mymoney/contrato/respostas/categorias';
import { useState } from 'react';
import { AvisoErroTopo } from '../../componentes/base/AvisoErroTopo';
import { Botao } from '../../componentes/base/Botao';
import { DialogoConfirmacao } from '../../componentes/base/DialogoConfirmacao';
import { FormularioCategoria } from '../../componentes/FormularioCategoria';
import { useAcoesCategoria } from './useAcoesCategoria';

const TEXTO_EM_USO =
  'Esta categoria tem lançamentos, orçamentos ou despesas fixas ligados a ela. Arquive para tirá-la das opções; o histórico continua.';

export function EdicaoCategoria({ categoria }: { categoria: LinhaCategorias }) {
  const acoes = useAcoesCategoria(categoria.id, categoria.tipo);
  const [confirmando, setConfirmando] = useState(false);

  return (
    <>
      {acoes.emUso ? <AvisoErroTopo>{TEXTO_EM_USO}</AvisoErroTopo> : null}
      <FormularioCategoria
        inicial={{
          nome: categoria.nome,
          tipo: categoria.tipo,
          escopo: categoria.escopo,
          variavel: categoria.variavel ?? false,
        }}
        tipoEscopoFixos
        erroNome={acoes.erroNome}
        aoSalvar={acoes.salvar}
      >
        {acoes.emUso ? (
          <>
            <Botao variante="principal" salvando={acoes.arquivando} rotuloOcupado="Arquivando…" onClick={acoes.arquivar}>
              Arquivar categoria
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
            {categoria.pode_excluir ? (
              <Botao variante="perigo" icone="lixo" onClick={() => setConfirmando(true)}>
                Excluir
              </Botao>
            ) : null}
          </>
        )}
      </FormularioCategoria>
      <DialogoConfirmacao
        aberto={confirmando}
        titulo="Excluir esta categoria?"
        texto="A categoria será excluída de vez e não dá para desfazer."
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
