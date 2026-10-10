# ADR-012: As funções auxiliares de RLS `app.membro_atual()` e `app.lar_atual()` são `SECURITY DEFINER` e entram na lista fechada

- **Status:** Aceito em 2026-10-09 (decisão do stakeholder na rodada 2 do Loop C, opção A da lacuna L-01 do TASK.md)
- **Data:** 2026-10-09
- **Decisores:** Coordenador (proposta); stakeholder (aprovação)
- **Complementa:** ADR-003 §3 (lista fechada de `SECURITY DEFINER`) e ADR-008 §2 (vínculo pela tabela `membro`). Não
  substitui nenhum ADR.

## Contexto

O ADR-008 manda toda política de RLS passar por `app.membro_atual()`. O SDD §5 diz que os 2 membros do lar se veem
(id e nome) na tabela `app.membro`. Para isso, a política de leitura de `membro` precisa saber o lar do membro
atual, o que exige ler a própria `membro`.

Com a função auxiliar em `SECURITY INVOKER`, a leitura de `membro` dentro da política aplica de novo a mesma
política. O Postgres para com o erro "infinite recursion detected in policy for relation membro". As outras tabelas
(`categoria`, `lancamento`, `ocorrencia_fixa`…) também dependem do lar do membro atual e herdariam o problema.

O SDD §7 e o ADR-003 §3 só permitem `SECURITY DEFINER` numa lista fechada, que hoje tem uma entrada
(`api.editar_lancamento`), e exigem ADR para qualquer entrada nova.

## Decisão

1. `app.membro_atual()` e `app.lar_atual()` são `SECURITY DEFINER` e entram na lista fechada do SDD §7.
2. Elas são **mínimas**:
   - `language sql`, `stable`, `set search_path = ''`;
   - leem só `app.membro` filtrando por `user_id = auth.uid()`;
   - devolvem só o id do membro ou o id do lar do próprio chamador, nunca dado do outro membro;
   - sem parâmetros, então não há como pedir o membro de outra pessoa;
   - usuário sem linha em `membro` recebe `null`, e toda política que compara com `null` nega o acesso.
3. Elas **não são expostas**: ficam no schema `app`, que o PostgREST não publica. `execute` só para `authenticated`
   (revogado de `public` e `anon`).
4. Valem para elas as regras do ADR-003 §3 que se aplicam a funções sem escrita: `search_path` vazio, identificação
   por `auth.uid()` na primeira linha, nenhum campo privado devolvido e teste próprio.
5. O teste de catálogo (TP-0017) compara as funções `security definer` com a lista fechada atualizada:
   `{api.editar_lancamento, app.membro_atual, app.lar_atual}`.

## Consequências

**Positivas**
- As políticas ficam simples (`lar_id = app.lar_atual()`, `dono_id = app.membro_atual()`) e sem recursão.
- É o padrão documentado pelo Supabase para esse caso.
- O modelo de dados do SDD §5 não muda.

**Negativas**
- A lista fechada passa de 1 para 3 entradas. Mitigação: as 2 novas não escrevem nada, não recebem parâmetro e
  devolvem só o id do próprio chamador; há teste de catálogo e teste de isolamento próprio (o usuário sem membro
  recebe `null`; A nunca obtém o id de B por elas).

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Manter tudo INVOKER, com `membro` lendo só a própria linha e uma tabela nova `app.membro_perfil` (id, lar, nome) | Muda o modelo do SDD §5 e duplica o cadastro do membro, só para contornar a recursão |
| Guardar o lar no JWT (custom access token hook) | Mais uma peça de configuração do Auth para manter, e o local e a produção precisariam do mesmo hook |
