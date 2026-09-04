-- BE-REF-02 (Seção 3.4, TASK.md) — RF-REF-03 (AC1, AC2, AC7, AC8), RN-12, RN-13,
-- RNF-12, RNF-14. Implementa o algoritmo de ranqueamento de atalhos de
-- lançamento rápido descrito em ADR-015, Decisão 1 e Decisão 2. Migration
-- aditiva (DIR-38): nova função + nova coluna, nenhum ALTER/DROP destrutivo.
--
-- Revisão de spec-compliance/qualidade (2026-09-04, fix-loop tentativa 1/2)
-- corrigiu 3 achados nesta mesma migration (ainda não promovida a nenhum lote
-- fechado — seguro reescrever antes de qualquer deploy):
--   Achado 1 — janela de 90 dias sem limite superior (bug real, média): os 4
--     CTEs de agregação agora também filtram transaction_date <= hoje, para
--     não deixar lançamento futuro (conta fixa/recorrência/parcelamento
--     pending, gerado com data futura) vencer o desempate de recência de
--     RN-12/RN-13 contra atividade real já ocorrida — mesmo padrão de
--     get_month_transaction_count/get_income_expense_report (ambos já
--     limitam os dois lados da janela).
--   Achado 2 — cobertura de teste do corte em 10 linhas quando a janela já
--     tem >=10 subcategorias distintas (lacuna, média): novo CASO 6 em
--     supabase/tests/be_ref_02_transaction_shortcuts.test.sql (12 categorias
--     distintas na janela + as 7 já existentes = 19, sem fallback). Nota de
--     revisão (2026-09-04, re-revisão): o predicado "(select n from
--     cat_window_count) < 10" em cat_history_agg é um short-circuit de
--     performance (evita computar a agregação de histórico à toa quando a
--     janela já basta) — o ORDER BY cc.grp asc já garante por si só que
--     nenhuma linha de histórico (grp=1) jamais entra em rn <= 10 quando a
--     janela (grp=0) já tem >=10 linhas, então remover o predicado não muda
--     nenhum resultado hoje (provado por mutação pelo revisor). CASO 6
--     continua validando o COMPORTAMENTO observável (count=10, CAT_OLD
--     ausente), não a presença desse predicado específico.
--   Achado 3 — kind='transfer' entrando no ranking sem decisão registrada
--     (baixa/média): decisão explícita documentada no passo 1 do algoritmo,
--     abaixo — mantida a inclusão (racional completo lá).
--
-- Re-revisão (2026-09-04, tentativa 2/2) encontrou 2 achados residuais,
-- ambos corrigidos sem alterar a lógica desta função:
--   R1 (média) — a correção do Achado 1 (limite superior da janela) não
--     tinha nenhum teste protegendo-a (mutação removendo os 4 "<= hoje" ainda
--     passava a suíte inteira). Corrigido só no teste: 1 linha de fixture
--     nova (2ª transação de CAT_D, data futura v_today+30) faz a asserção já
--     existente de CASO 3a (desempate por recência) detectar a regressão.
--   R2 (baixa, cosmética) — a narrativa do Achado 2/CASO 6 acima e no teste
--     sugeria que o predicado "< 10" era necessário para o resultado de hoje;
--     corrigido para short-circuit de performance sem efeito semântico
--     observável (ver nota de revisão dentro do próprio Achado 2, acima).

-- =============================================================================
-- Decisão 2 (ADR-015) — RNF-12: coluna ortogonal a transactions.source (DIR-35).
-- =============================================================================
alter table public.transactions
  add column "created_via_shortcut" boolean default false not null;

comment on column public.transactions.created_via_shortcut is
  'RNF-12/RF-REF-03 AC6 — true quando o lançamento foi criado a partir de um '
  'clique em ShortcutChip (atalho de lançamento rápido), false para lançamento '
  'via formulário completo e para todo lançamento pré-existente (migration '
  'aditiva, DEFAULT false). Ortogonal a transactions.source (DIR-35): source '
  'representa o canal de captura (manual/audio/ocr/import/openfinance); '
  'created_via_shortcut representa o ponto de entrada dentro da captura manual. '
  'Nunca inferir uma coluna a partir da outra, nem misturar as duas semânticas '
  'em nenhuma consulta/regra nova.';

-- =============================================================================
-- Decisão 1 (ADR-015) — RPC get_transaction_shortcuts(): até 10 atalhos de
-- subcategoria (category_id, payment_method_id), ranqueados conforme RN-12/
-- RN-13. SECURITY INVOKER (padrão implícito, mesma convenção das demais RPCs
-- de dashboard já existentes — get_month_provision, get_monthly_category_summary,
-- get_month_transaction_count — nenhuma delas declara "security invoker"
-- explicitamente, pois é o comportamento padrão do Postgres para função sem
-- "security definer"), STABLE, filtrando por auth.uid() no próprio corpo.
--
-- Algoritmo (nível lógico, ADR-015 Decisão 1, passos 1-5):
--   1. Agrega transactions do usuário autenticado (category_id is not null) dos
--      últimos 90 dias corridos (transaction_date entre hoje-90 e hoje, AMBOS
--      os limites — achado de revisão: sem o limite superior, um lançamento
--      futuro pending de conta fixa/recorrência/parcelamento venceria o
--      desempate de recência contra atividade real já ocorrida; mesmo padrão
--      de get_month_transaction_count/get_income_expense_report), contando
--      ocorrências por category_id e capturando a data do lançamento mais
--      recente por categoria (grupo "janela", prioridade 0).
--      **Decisão explícita sobre kind='transfer' (achado de revisão, antes
--      não documentada)**: NÃO é excluído desta agregação (diferente de
--      get_monthly_category_summary/get_income_expense_report, que excluem
--      kind=transfer). Racional: aquelas duas RPCs somam amount_cents por
--      categoria para totais financeiros — incluir uma transferência
--      duplicaria dinheiro que só mudou de conta do próprio usuário, como se
--      fosse entrada/saída real. get_transaction_shortcuts() nunca soma
--      amount_cents — só CONTA ocorrências por category_id para ranquear
--      frequência de uso — a mesma distorção monetária não se aplica.
--      Adicionalmente, RN-16/SDD.md já estabelecem que kind=transfer não usa
--      category_id/payment_method_id no fluxo normal do produto (o CHECK
--      transactions_non_transfer_requires_method_and_category só TOLERA,
--      nunca EXIGE, category_id numa transferência) — na prática esta
--      distinção quase nunca é exercida. Mantida por fidelidade ao algoritmo
--      literal já revisado pelo CTO em ADR-015 (que fala só em "category_id
--      is not null", sem menção a kind), evitando reinterpretar a decisão do
--      Software Architect sem necessidade.
--   2. Se o resultado tiver menos de 10 categorias distintas, completa com a
--      mesma agregação sobre todo o histórico (mesmo limite superior de hoje,
--      excluindo categorias já selecionadas na janela), até atingir 10 ou
--      esgotar (grupo "histórico", prioridade 1 — sempre ordenado DEPOIS do
--      grupo "janela", nunca re-ranqueado por cima dele: RN-12 regra 5
--      descreve "completar" posições vazias, não uma re-classificação geral
--      por frequência).
--   3. Ordena o conjunto combinado por (i) grupo (janela antes de histórico),
--      (ii) frequência desc., (iii) data mais recente desc., (iv) nome da
--      subcategoria asc. — os 2 critérios de desempate literais de RN-12 — e
--      limita a 10. category_id é usado como desempate final adicional (v),
--      detalhe de implementação para determinismo em empate total, não uma
--      regra de negócio nova.
--   4. Para cada categoria selecionada, resolve payment_method_id como a forma
--      de pagamento mais frequente associada a ela, mesmo critério de janela+
--      fallback de histórico completo (RN-13 — "mesmo critério de RN-12"),
--      ambos com o mesmo limite superior de hoje, com empate por uso mais
--      recente; payment_method_id como desempate final determinístico. NULL
--      apenas quando a subcategoria nunca teve nenhum lançamento com
--      payment_method_id preenchido (RN-13, exceção) — dado que kind=transfer
--      permanece incluído no passo 1 (decisão acima), esse caso continua
--      alcançável no schema real via uma transferência com category_id
--      preenchido e payment_method_id NULL (permitido pelo CHECK, incomum no
--      fluxo normal do produto mas não proibido — ver
--      supabase/tests/be_ref_02_transaction_shortcuts.test.sql, CASO 4).
--   5. Se o usuário não tiver nenhum lançamento no histórico, retorna vazio.
create or replace function public.get_transaction_shortcuts()
returns table (
  category_id uuid,
  payment_method_id uuid
)
language sql
stable
set search_path to 'public'
as $$
  with window_bounds as (
    select
      ((now() at time zone 'America/Sao_Paulo')::date - 90) as since_date,
      ((now() at time zone 'America/Sao_Paulo')::date)       as until_date
  ),
  cat_window_agg as (
    select
      t.category_id,
      count(*)::bigint as freq,
      max(t.transaction_date) as last_date
    from public.transactions t, window_bounds wb
    where t.user_id = auth.uid()
      and t.category_id is not null
      and t.transaction_date >= wb.since_date
      and t.transaction_date <= wb.until_date
    group by t.category_id
  ),
  cat_window_count as (
    select count(*)::integer as n from cat_window_agg
  ),
  cat_history_agg as (
    select
      t.category_id,
      count(*)::bigint as freq,
      max(t.transaction_date) as last_date
    from public.transactions t, window_bounds wb
    where t.user_id = auth.uid()
      and t.category_id is not null
      and t.category_id not in (select category_id from cat_window_agg)
      and (select n from cat_window_count) < 10
      and t.transaction_date <= wb.until_date
    group by t.category_id
  ),
  cat_combined as (
    select category_id, freq, last_date, 0 as grp from cat_window_agg
    union all
    select category_id, freq, last_date, 1 as grp from cat_history_agg
  ),
  cat_ranked as (
    select
      cc.category_id,
      row_number() over (
        order by cc.grp asc, cc.freq desc, cc.last_date desc, c.name asc, cc.category_id asc
      ) as rn
    from cat_combined cc
    join public.categories c on c.id = cc.category_id
  ),
  cat_top10 as (
    select category_id, rn
    from cat_ranked
    where rn <= 10
  ),
  pm_window_agg as (
    select
      t.category_id,
      t.payment_method_id,
      count(*)::bigint as freq,
      max(t.transaction_date) as last_date
    from public.transactions t, window_bounds wb
    where t.user_id = auth.uid()
      and t.payment_method_id is not null
      and t.category_id in (select category_id from cat_top10)
      and t.transaction_date >= wb.since_date
      and t.transaction_date <= wb.until_date
    group by t.category_id, t.payment_method_id
  ),
  pm_window_ranked as (
    select
      category_id,
      payment_method_id,
      row_number() over (
        partition by category_id
        order by freq desc, last_date desc, payment_method_id asc
      ) as rn
    from pm_window_agg
  ),
  pm_history_agg as (
    select
      t.category_id,
      t.payment_method_id,
      count(*)::bigint as freq,
      max(t.transaction_date) as last_date
    from public.transactions t, window_bounds wb
    where t.user_id = auth.uid()
      and t.payment_method_id is not null
      and t.category_id in (select category_id from cat_top10)
      and t.transaction_date <= wb.until_date
    group by t.category_id, t.payment_method_id
  ),
  pm_history_ranked as (
    select
      category_id,
      payment_method_id,
      row_number() over (
        partition by category_id
        order by freq desc, last_date desc, payment_method_id asc
      ) as rn
    from pm_history_agg
  )
  select
    top10.category_id,
    coalesce(pw.payment_method_id, ph.payment_method_id) as payment_method_id
  from cat_top10 top10
  left join pm_window_ranked pw on pw.category_id = top10.category_id and pw.rn = 1
  left join pm_history_ranked ph on ph.category_id = top10.category_id and ph.rn = 1
  order by top10.rn;
$$;

comment on function public.get_transaction_shortcuts() is
  'RF-REF-03 (AC1, AC2, AC7, AC8), RN-12, RN-13, RNF-14 (ADR-015 Decisão 1). '
  'Até 10 (category_id, payment_method_id), ranqueados por frequência simples '
  'numa janela móvel de 90 dias (ambos os limites, hoje-90 a hoje), com '
  'fallback ao histórico completo (mesmo limite superior de hoje) quando há '
  'menos de 10 subcategorias distintas na janela, desempate por recência e '
  'ordem alfabética do nome da subcategoria. kind=transfer NÃO é excluído '
  '(decisão explícita, diferente de get_monthly_category_summary/'
  'get_income_expense_report — aquelas somam valor monetário, esta só conta '
  'ocorrências, a distorção que justifica excluir lá não se aplica aqui). '
  'payment_method_id resolvido pelo mesmo critério de janela+fallback, por '
  'subcategoria; NULL só quando a subcategoria nunca teve lançamento com '
  'forma de pagamento associada. SECURITY INVOKER (implícito) + STABLE, '
  'filtra por auth.uid() no próprio corpo (DIR-34) — única fonte de verdade '
  'do algoritmo, nenhum client duplica esta lógica.';
