# ADR-003: As regras de negócio e toda escrita rodam em funções SQL do Postgres, expostas como RPC

- **Status:** Aceito em 2026-10-09 (Loop B aprovado pelo stakeholder; antes: Proposto, Loop B, rodada 1)
- **Data:** 2026-10-09
- **Decisores:** Coordenador

## Contexto

As regras que mudam dado são várias:

- gerar N parcelas no vencimento do cartão, com os centavos na 1ª (RN-14);
- gerar exatamente 1 ocorrência de fixa por mês (RN-15);
- permitir ou não uma edição conforme pagador e autor (RN-06, RN-07);
- calcular saldo, totais, orçamento e resultado (RN-12, RN-16a a RN-16e).

Essas regras precisam valer para qualquer caminho de escrita (RN-10). A convenção do ambiente
(`CONVENCOES-DE-CODIGO.md` §2) proíbe a tela de recalcular regra de negócio. Sem servidor próprio (ADR-001),
o único lugar do lado do servidor é o Postgres.

## Decisão

1. **Escrita só por funções `api.*`.** Exemplos: `api.lancar_despesa`, `api.pagar_ocorrencia`. Cada função
   roda numa transação. O papel `authenticated` não tem `INSERT`, `UPDATE` nem `DELETE` direto pela API,
   porque as tabelas ficam no schema `app`, não exposto.
2. **`SECURITY INVOKER` por padrão.** As funções rodam com o JWT do membro, e as políticas de escrita do RLS
   (`WITH CHECK`) valem junto com as checagens da função. É uma defesa em duas camadas.
3. **`SECURITY DEFINER` só numa lista fechada**, registrada no SDD (Seção 7). Hoje há uma única entrada:
   - `api.editar_lancamento`, porque o membro que não pagou pode alterar valor, data ou categoria de uma
     despesa conjunta (CA-08.2), e o recálculo pela RN-14 lê e regrava a parte privada do pagador.
   Toda função `DEFINER` obedece a 5 regras:
   - usa `set search_path = ''`;
   - identifica o membro por `auth.uid()` na primeira linha;
   - checa explicitamente cada permissão de RN-04, RN-06 e RN-07;
   - nunca devolve um campo privado de outro membro;
   - tem caso de teste de isolamento próprio.
   Uma entrada nova na lista exige um ADR novo.
4. **Leitura por views e funções `api.*` com `security_invoker`.** Os totais da tela principal saem prontos de
   `api.resumo_mes(mes)`. A tela só formata.
5. **Organização do SQL.** Os schemas são declarativos, com um arquivo por tabela, view ou função em
   `backend/supabase/schemas/`. As migrations são geradas por `supabase db diff`, então a fonte de verdade de
   cada função é um arquivo só. Os testes pgTAP ficam em `backend/supabase/tests/`, um arquivo por regra.
6. **Idempotência.** As funções de criação recebem o `id` (uuid) gerado pelo cliente. Se esse id já existe e é
   do mesmo membro, a função devolve o resultado anterior em vez de duplicar (necessário para a fila offline,
   ADR-007).

## Consequências

**Positivas**
- Uma regra mora num lugar só e vale para tela, API e testes.
- Lançar uma despesa custa 1 ida ao servidor (RNF-01, RNF-03).
- As regras de cálculo (parcelas, competência, totais) ficam testáveis em SQL puro, sem tela.

**Negativas**
- plpgsql é menos ergonômico que TypeScript, e o mantenedor precisa ler SQL. Mitigação: funções pequenas,
  pgTAP e schemas declarativos.
- A função `DEFINER` contorna o RLS. Um defeito nela pode alterar dado privado do pagador. Mitigação: lista
  fechada, revisão obrigatória do Validador e testes específicos.
- `resumo_mes` gera as ocorrências do mês quando faltam, ou seja, uma leitura com efeito colateral. O efeito é
  idempotente e protegido por restrição única `(despesa_fixa_id, mes)`.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Escrita direta nas tabelas pelo cliente (`supabase.from(...).insert`), com regra no frontend | Parcelas, saldo e permissões ficariam no navegador. Viola a convenção §2 e o RN-10 |
| Gatilhos (`triggers`) nas tabelas | Regras escondidas e difíceis de testar. A ordem entre gatilhos é frágil |
| Tudo `SECURITY DEFINER` (padrão comum em tutoriais) | Perde a segunda camada do RLS. Um esquecimento numa função vira vazamento |
| Edge Functions em TypeScript | Ver ADR-001 |
