import type { LinhaContas } from '@mymoney/contrato/respostas/contas';
import { formatarMoeda } from '../formatacao/moeda';
import lista from './base/Lista.module.css';
import { ItemLink } from './base/ItemLink';
import estilo from './ListaContas.module.css';

/** Contas com nome e saldo; o saldo vem pronto da API. */
export function ListaContas({ contas }: { contas: LinhaContas[] }) {
  return (
    <ul className={`${lista.lista} ${estilo.lista}`}>
      {contas.map((conta) => (
        <ItemLink
          key={conta.id}
          icone="banco"
          rotulo={conta.nome}
          para={`/ajustes/contas/${conta.id}`}
          nota={conta.arquivada ? 'Arquivada' : undefined}
          valor={formatarMoeda(conta.saldo_centavos)}
        />
      ))}
    </ul>
  );
}
