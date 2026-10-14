import { useEffect, useRef, type Ref } from 'react';
import type { DadosLancamento } from '@mymoney/contrato/respostas/dados-lancamento';
import type { EntradaLancar, ResultadoLancar } from '../../ganchos/useLancarDespesa';
import { AvisoErroTopo } from '../base/AvisoErroTopo';
import { CampoValor } from '../base/CampoValor';
import { Faixa } from '../base/Faixa';
import { Folha } from '../base/Folha';
import { Segmentado } from '../base/Segmentado';
import { BotaoLancar } from './BotaoLancar';
import { LancarVazio } from './LancarVazio';
import { MaisDetalhes } from './MaisDetalhes';
import { SecaoCategoria } from './SecaoCategoria';
import { SecaoForma } from './SecaoForma';
import { SecaoParcelas } from './SecaoParcelas';
import { useEnvioLancar } from './useEnvioLancar';
import { useFormularioLancar, type EstadoLancar } from './useFormularioLancar';
import estilo from './FolhaLancar.module.css';

interface Props {
  aberta: boolean;
  aoFechar: () => void;
  refValor: Ref<HTMLInputElement>;
  dados?: DadosLancamento;
  /** Envia a despesa; sem ela a folha só valida. */
  aoLancar?: (entrada: EntradaLancar) => Promise<ResultadoLancar>;
  /** Sem rede: a faixa avisa que o lançamento fica guardado no aparelho. */
  offline?: boolean;
  /** Valores para abrir a folha já preenchida; cada `chave` nova substitui o que estava digitado. */
  correcao?: { chave: number; valores: EstadoLancar };
}

const TIPOS = [
  { valor: 'despesa', rotulo: 'Despesa' },
  { valor: 'receita', rotulo: 'Receita', desabilitada: true },
];

/** Folha de lançamento: fica montada e oculta para o "+" poder focar o valor no mesmo clique. */
export function FolhaLancar({ aberta, aoFechar, refValor, dados, aoLancar, offline, correcao }: Props) {
  const { estado, erros, mudar, validar, limpar, preencher } = useFormularioLancar(dados);
  const chaveAplicada = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!correcao || chaveAplicada.current === correcao.chave) return;
    chaveAplicada.current = correcao.chave;
    preencher(correcao.valores);
  });
  const { formulario, ocupado, erroTopo, aoEnviar, aoTeclar } = useEnvioLancar({
    dados,
    estado,
    validar,
    limpar,
    aoLancar,
  });
  const tipoForma = dados?.formas.find((forma) => forma.id === estado.formaId)?.tipo ?? null;
  const vazio = dados !== undefined && (dados.formas.length === 0 || dados.categorias_despesa.length === 0);

  return (
    <Folha
      aberta={aberta}
      aoFechar={aoFechar}
      titulo="Lançar"
      tituloOculto={!vazio}
      montadaOculta
      ocupada={ocupado}
      topo={
        vazio ? undefined : (
          <Segmentado legenda="Tipo de lançamento" nome="tipo-lancamento" opcoes={TIPOS} valor="despesa" aoMudar={() => {}} />
        )
      }
      rodape={
        vazio ? undefined : (
          <BotaoLancar centavos={estado.valorCentavos} parcelas={estado.parcelas} ocupado={ocupado} ativo={aberta} />
        )
      }
    >
      {vazio && dados ? (
        <LancarVazio dados={dados} aoFechar={aoFechar} />
      ) : (
        <>
          {offline ? <Faixa variante="offline" /> : null}
          {erroTopo ? <AvisoErroTopo>{erroTopo}</AvisoErroTopo> : null}
          <form
            ref={formulario}
            id="form-lancar"
            className={estilo.formulario}
            noValidate
            onSubmit={aoEnviar}
            onKeyDown={aoTeclar}
          >
            <CampoValor
              id="valor"
              ref={refValor}
              centavos={estado.valorCentavos}
              erro={erros.valor}
              anunciarErro
              aoMudar={(v) => mudar('valorCentavos', v)}
            />
            {dados ? (
              <>
                <SecaoCategoria
                  categorias={dados.categorias_despesa}
                  valor={estado.categoriaId}
                  erro={erros.categoria}
                  aoMudar={(id) => mudar('categoriaId', id)}
                />
                <SecaoForma formas={dados.formas} valor={estado.formaId} aoMudar={(id) => mudar('formaId', id)} />
                <SecaoParcelas tipoForma={tipoForma} valor={estado.parcelas} aoMudar={(n) => mudar('parcelas', n)} />
                <MaisDetalhes
                  data={estado.data}
                  descricao={estado.descricao}
                  aoMudarData={(d) => mudar('data', d)}
                  aoMudarDescricao={(d) => mudar('descricao', d)}
                />
              </>
            ) : null}
          </form>
        </>
      )}
    </Folha>
  );
}
