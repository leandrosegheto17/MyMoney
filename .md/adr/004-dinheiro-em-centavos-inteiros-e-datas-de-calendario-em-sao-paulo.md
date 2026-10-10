# ADR-004: Valores monetários são centavos inteiros e datas de negócio são datas de calendário no fuso America/Sao_Paulo

- **Status:** Aceito em 2026-10-09 (Loop B aprovado pelo stakeholder; antes: Proposto, Loop B, rodada 1)
- **Data:** 2026-10-09
- **Decisores:** Coordenador

## Contexto

O RNF-09 exige cálculo exato: a soma das parcelas é igual ao total, e R$ 100,00 em 3x dá 33,34 + 33,33 + 33,33.
Também exige virada de mês e de ano correta no fuso de São Paulo.

Dois problemas conhecidos atrapalham isso:

- **`number` do JavaScript:** é ponto flutuante e erra em somas como 0,1 + 0,2.
- **`numeric` do Postgres:** o PostgREST pode serializá-lo como número JSON, que o cliente lê como float.

Há ainda o problema dos timestamps. Um `timestamptz` gravado às 22h de 31/10 em São Paulo vira 01/11 em UTC.
Para a competência, isso põe o valor no mês errado.

## Decisão

1. **Dinheiro:**
   - Todo valor é `bigint` em **centavos**, sempre positivo (RN-18), com `CHECK (valor_centavos > 0)` onde se
     aplica.
   - O JSON da API leva inteiros (`12345` = R$ 123,45).
   - A divisão em parcelas é inteira no banco: `base = total / n`, `resto = total % n`, e a 1ª parcela recebe
     `base + resto`.
   - O frontend nunca faz conta com dinheiro além de exibir. A formatação é
     `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})` sobre `centavos / 100`.
   - O campo de valor monta os centavos a partir dos dígitos digitados ("1", "12", "123" → R$ 1,23), sem vírgula.
2. **Datas de negócio:**
   - Data da operação, data da parcela, vencimento e competência são `date`, sem hora.
   - A competência é `date_trunc('month', data)`.
   - "Hoje" é `(now() at time zone 'America/Sao_Paulo')::date` no banco. No cliente, o padrão do formulário
     usa `Intl.DateTimeFormat` com `timeZone: 'America/Sao_Paulo'`.
   - Só auditoria (`criado_em`, `alterado_em`) usa `timestamptz`.
3. **Último dia do mês:** quando o dia de vencimento não existe no mês, vale o último dia daquele mês
   (CA-06.1a, CA-11.2). Uma única função SQL calcula isso: `app.dia_no_mes(ano_mes, dia)`.

## Consequências

**Positivas**
- A soma das parcelas é igual ao total por construção, e os testes de borda (virada de ano, 31 de fevereiro,
  centavos) ficam determinísticos.
- Nenhum valor monetário passa por float.

**Negativas**
- Quem lê o banco à mão vê `12345` em vez de `123,45`. Mitigação: as views de depuração formatam.
- O limite do `bigint` sobra (9,2 × 10^16 centavos). O JSON é seguro até 2^53, cerca de R$ 90 trilhões.
- O teclado de centavos ("1" → R$ 0,01) é um padrão de app bancário, mas pode estranhar quem espera digitar a
  vírgula. Isso foi validado como trade-off de UX no UX-SPEC §7.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| `numeric(12,2)` no banco e string no JSON | Funciona, mas obriga conversões e uma biblioteca decimal no cliente (decimal.js). Mais peças por nenhum ganho |
| `number` no frontend com arredondamento | Erro de float em somas; viola o RNF-09 |
| `timestamptz` para a data do lançamento | Risco de competência no mês errado perto da meia-noite |
