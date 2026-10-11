import { useId } from 'react';
import { ValorDestaque } from './base/ValorDestaque';
import estiloCartao from './CartaoConta.module.css';
import estilo from './CartaoSaldo.module.css';

interface Props {
  saldoCentavos: number;
}

/** Saldo atual da conta, só leitura: o valor vem pronto da view `contas`. */
export function CartaoSaldo({ saldoCentavos }: Props) {
  const idTitulo = useId();
  return (
    <section className={estiloCartao.cartao} aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className={`${estiloCartao.titulo} ${estiloCartao.total}`}>
        Saldo atual
      </h2>
      <ValorDestaque centavos={saldoCentavos} />
      <p className={estilo.formula}>
        Saldo inicial + receitas − Pix/Débito ± ajustes, aportes e pagamentos de cartão. Compras no crédito não mexem
        no saldo.
      </p>
    </section>
  );
}
