import type { Ref } from 'react';
import type { DadosLancamento } from '@mymoney/contrato/respostas/dados-lancamento';
import { CampoValor } from '../base/CampoValor';
import { Folha } from '../base/Folha';
import { Segmentado } from '../base/Segmentado';
import { MaisDetalhes } from './MaisDetalhes';
import { SecaoCategoria } from './SecaoCategoria';
import { SecaoForma } from './SecaoForma';
import { SecaoParcelas } from './SecaoParcelas';
import { useFormularioLancar } from './useFormularioLancar';
import estilo from './FolhaLancar.module.css';

interface Props {
  aberta: boolean;
  aoFechar: () => void;
  refValor: Ref<HTMLInputElement>;
  dados?: DadosLancamento;
}

const TIPOS = [
  { valor: 'despesa', rotulo: 'Despesa' },
  { valor: 'receita', rotulo: 'Receita', desabilitada: true },
];

/** Folha de lançamento: fica montada e oculta para o "+" poder focar o valor no mesmo clique. */
export function FolhaLancar({ aberta, aoFechar, refValor, dados }: Props) {
  const { estado, mudar } = useFormularioLancar(dados);
  const tipoForma = dados?.formas.find((forma) => forma.id === estado.formaId)?.tipo ?? null;

  return (
    <Folha
      aberta={aberta}
      aoFechar={aoFechar}
      titulo="Lançar"
      tituloOculto
      montadaOculta
      topo={<Segmentado legenda="Tipo de lançamento" nome="tipo-lancamento" opcoes={TIPOS} valor="despesa" aoMudar={() => {}} />}
    >
      <form id="form-lancar" className={estilo.formulario} onSubmit={(evento) => evento.preventDefault()}>
        <CampoValor id="valor" ref={refValor} centavos={estado.valorCentavos} aoMudar={(v) => mudar('valorCentavos', v)} />
        {dados ? (
          <>
            <SecaoCategoria
              categorias={dados.categorias_despesa}
              valor={estado.categoriaId}
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
    </Folha>
  );
}
