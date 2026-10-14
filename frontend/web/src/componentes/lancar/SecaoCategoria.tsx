import { useRef, useState } from 'react';
import type { DadosLancamento } from '@mymoney/contrato/respostas/dados-lancamento';
import { Icone } from '../base/Icone';
import { GrupoChips } from '../base/GrupoChips';
import { SeloEscopo } from '../base/SeloEscopo';
import estilosChip from '../base/Chips.module.css';
import { ListaCategorias } from './ListaCategorias';

type Categoria = DadosLancamento['categorias_despesa'][number];

interface Props {
  categorias: DadosLancamento['categorias_despesa'];
  valor: string | null;
  aoMudar: (id: string) => void;
  erro?: string;
}

const NA_GRADE = 8;

const selo = (c: Categoria) => (
  <span className={estilosChip['chip-escopo']}>
    <SeloEscopo escopo={c.escopo} />
  </span>
);

/** As 8 primeiras na ordem recebida (a API ordena por uso) e "Outras…" para o resto. */
export function SecaoCategoria({ categorias, valor, aoMudar, erro }: Props) {
  const [listaAberta, setListaAberta] = useState(false);
  const botaoOutras = useRef<HTMLButtonElement>(null);
  const naGrade = categorias.slice(0, NA_GRADE);
  const escolhidaFora = categorias.slice(NA_GRADE).find((c) => c.id === valor);

  const fechar = () => {
    setListaAberta(false);
    botaoOutras.current?.focus();
  };
  const escolher = (id: string) => {
    aoMudar(id);
    fechar();
  };

  const classeBotao = `${estilosChip.chip} ${escolhidaFora ? estilosChip['chip-escolhida'] : estilosChip['chip-outras']}`;
  const botao = (
    <button
      ref={botaoOutras}
      type="button"
      className={classeBotao}
      aria-expanded={listaAberta}
      onClick={() => setListaAberta((aberta) => !aberta)}
    >
      {escolhidaFora ? (
        <>
          <span className={estilosChip['chip-nome']}>{escolhidaFora.nome}</span>
          {selo(escolhidaFora)}
          <Icone nome="marcado" className={estilosChip['chip-marcado']} />
        </>
      ) : (
        'Outras…'
      )}
    </button>
  );

  return (
    <>
      <GrupoChips
        nome="categoria"
        rotulo="Categoria"
        variante="grade"
        opcoes={naGrade.map((c) => ({ valor: c.id, conteudo: c.nome, complemento: selo(c) }))}
        valor={valor ?? ''}
        aoMudar={aoMudar}
        erro={erro}
        extra={botao}
      />
      {listaAberta ? <ListaCategorias categorias={categorias} aoEscolher={escolher} aoFechar={fechar} /> : null}
    </>
  );
}
