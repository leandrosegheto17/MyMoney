# ADR-005: Todo lançamento gera uma ou mais parcelas, e as parcelas são a única fonte dos totais por mês

- **Status:** Aceito em 2026-10-09 (Loop B aprovado pelo stakeholder; antes: Proposto, Loop B, rodada 1)
- **Data:** 2026-10-09
- **Decisores:** Coordenador

## Contexto

Há 3 regras de competência diferentes (RN-14, RN-15 e I-20):

- **Pix e Débito:** conta no mês da compra.
- **Crédito:** cada parcela conta no mês da sua própria data, que é o dia de vencimento do cartão a partir do
  mês seguinte. A data pode ser ajustada à mão (CA-08.5).
- **Despesa fixa paga no crédito:** conta no mês da ocorrência, mas aparece no cartão no próximo vencimento.

Totais, orçamento, resultado e lista do mês precisam usar a mesma noção de "em que mês conta", sem cada consulta
reinventar a regra.

## Decisão

1. **Cabeçalho e parcelas.** Todo lançamento tem um cabeçalho (`lancamento`) e **1 ou mais parcelas**
   (`parcela`):
   - Pix, Débito, receita e fixa geram 1 parcela;
   - Crédito em N vezes gera N parcelas.
   Cada parcela tem `numero`, `valor_centavos`, `data` e `data_ajustada` (booleano).
2. **Competência.** A competência de qualquer valor é o mês de `parcela.data`. Todo total, orçamento, resultado
   e lista do mês soma **parcelas**, nunca cabeçalhos.
3. **Data das parcelas.** As datas são calculadas pelo banco no momento do lançamento:
   - **Crédito:** `parcela k = dia_no_mes(mes_da_compra + k meses, dia_vencimento_aplicado)`.
   - **Pix e Débito:** `data = data da operação`.
   - **Fixa:** `data = vencimento da ocorrência` (no mês da ocorrência), qualquer que seja a forma (I-20).
4. **Dia de vencimento congelado.** O dia de vencimento usado fica gravado na parte privada
   (`lancamento_pagamento.dia_vencimento_aplicado`). Mudar o dia no cadastro do cartão não altera as compras
   já lançadas (I-19). Recalcular a compra inteira (CA-08.5a) usa esse dia gravado, a menos que a forma de
   pagamento tenha sido trocada na edição. Nesse caso vale o dia atual da forma nova.
5. **Visão do cartão.** O "gasto no mês" e o "comprometido futuro" de uma forma de Crédito (CA-03.3) usam a
   **data de cartão** de cada parcela:
   - para compras, é a própria `parcela.data`;
   - para fixa paga no crédito, é o próximo vencimento depois da data do pagamento, calculado a partir da
     parte privada.
   Essa visão só existe para o dono da forma.
6. **Saldo.** O saldo da conta corrente (RN-12) não depende de competência. Ele soma movimentos pela **data da
   operação** (privada): receitas, despesas Pix e Débito, e `movimento_conta` (ajuste, aporte, retirada e
   pagamento de cartão).

## Consequências

**Positivas**
- Uma única regra de soma ("parcelas do mês visíveis a mim") alimenta tela principal, lista, orçamento e
  resultado. Os índices `(lar_id, data)` e `(dono_id, data)` atendem o RNF-03.
- O ajuste manual de uma parcela (CA-08.5) é só um `UPDATE` de `data` e `data_ajustada`.
- O aviso de descarte (I-21) é só verificar `bool_or(data_ajustada)`.

**Negativas**
- Lançamentos à vista têm uma linha a mais (a parcela). Com cerca de 6.000 linhas em 2 anos (RNF-03), o
  impacto é irrelevante.
- A "data de cartão" da fixa paga no crédito é um caso especial calculado. Ela precisa de teste próprio.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Uma coluna `mes_competencia` no lançamento e parcelas só para Crédito | São dois caminhos de soma, com divergência garantida entre consultas |
| Calcular as parcelas na hora da consulta, a partir do cabeçalho (sem gravar) | Impossibilita o ajuste manual da data de uma parcela e deixa o resumo mais caro |
