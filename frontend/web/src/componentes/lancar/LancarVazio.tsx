import type { DadosLancamento } from '@mymoney/contrato/respostas/dados-lancamento';
import { BotaoLink } from '../base/BotaoLink';
import { EstadoVazio } from '../base/EstadoVazio';

interface Props {
  dados: DadosLancamento;
  /** Fecha a folha quando o link leva a outra tela. */
  aoFechar: () => void;
}

/** Sem forma de pagamento ou sem categoria ativa não há o que lançar: o caminho é cadastrar. */
export function LancarVazio({ dados, aoFechar }: Props) {
  if (dados.formas.length === 0) {
    return (
      <EstadoVazio
        nivel={3}
        semMargem
        icone="cartao"
        titulo="Cadastre uma forma de pagamento para lançar"
        texto="Pix, Débito ou um cartão de crédito. Só você vê as suas formas de pagamento."
        acao={
          <BotaoLink para="/ajustes/formas/nova" variante="principal" aoClicar={aoFechar}>
            Cadastrar forma
          </BotaoLink>
        }
      />
    );
  }
  return (
    <EstadoVazio
      nivel={3}
      semMargem
      icone="lista"
      titulo="Nenhuma categoria ativa"
      texto="Crie ou reative uma categoria para lançar suas despesas."
      acao={
        <BotaoLink para="/ajustes/categorias" variante="principal" aoClicar={aoFechar}>
          Gerenciar categorias
        </BotaoLink>
      }
    />
  );
}
