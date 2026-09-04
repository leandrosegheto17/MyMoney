-- BE-F2-02 — Fechamento de fatura (RN-01) + limite disponível (RN-06) +
-- geração/atualização de `invoice` para competência atual + 2 futuras
-- (RF-F2-05 AC2/AC3 parcial — a projeção completa somando parcelas/recorrências
-- é FE-F2-02/BE-F2-04/05, ainda não implementadas; esta tarefa só cobre o que
-- já é possível hoje: lançamento manual em cartão, BE-M-06).
--
-- DIR-33 (auditoria de Edge Function antes de código novo): `supabase functions
-- list` não mostrou nenhuma function de fatura/cartão pré-existente — ao
-- contrário de BE-M-09, nada a reaproveitar aqui, implementação nova.
--
-- Arquitetura (DIR-06 "uma função só, chamada tanto pela Edge Function de
-- geração quanto por qualquer leitura — nunca reimplementada no Frontend"):
--   `credit_card_effective_closing_date` — único ponto que sabe calcular a data
--   real de fechamento de uma competência para um cartão (clampada ao último
--   dia do mês, ex. closing_day=31 em fevereiro). Reaproveitada por:
--     (a) `credit_card_invoice_competencia` — decide se uma data de lançamento
--         cai na fatura corrente ou na próxima (RN-01/AC2), usada pelo trigger
--         síncrono de `transactions` (toda escrita já resolve a fatura certa
--         na hora, sem esperar nenhum job assíncrono — DIR-12);
--     (b) `close_due_invoices` — job periódico (Edge Function `invoice-close`
--         via pg_cron/pg_net, mesmo padrão de `trigger_backup_export`/BE-M-10)
--         que só cuida do status "aberta"->"fechada" para leitura (RF-F2-05
--         AC3, Frontend) e da geração antecipada das 3 competências (DIR-13);
--         nunca decide sozinho onde um lançamento cai, só reflete o que o
--         trigger síncrono já decidiu.
--
-- 100% aditiva (DIR-03): CREATE TYPE, CREATE TABLE, CREATE FUNCTION, CREATE
-- TRIGGER, ALTER TABLE ADD CONSTRAINT (FK nova sobre `transactions.
-- card_invoice_id`, coluna antecipada desde a Fase 1, hoje inteiramente NULL).
-- Nenhuma linha real de public é alterada.
-- Rollback: supabase/migrations_down/20260903130000_be_f2_02_invoices.down.sql

-- =============================================================================
-- 1. Invoice (RF-F2-05, SDD.md Seção 5.2 — "competência, status, total
--    calculado". "total calculado" é exposto sob demanda via
--    get_credit_cards_available_limit (RN-06), não persistido como coluna —
--    decisão física do Backend (SDD.md: "modelo lógico, não modelagem física
--    detalhada"): evita manter uma soma redundante sincronizada a cada
--    INSERT/UPDATE/DELETE/reatribuição de transactions.card_invoice_id.
-- =============================================================================

create type public.invoice_status as enum ('aberta', 'fechada');

create table public.invoices (
  id             uuid primary key default gen_random_uuid(),
  credit_card_id uuid not null references public.credit_cards(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  competencia    date not null,
  status         public.invoice_status not null default 'aberta',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint invoices_competencia_is_first_of_month check (competencia = date_trunc('month', competencia)::date),
  constraint invoices_credit_card_competencia_unique unique (credit_card_id, competencia)
);

comment on table public.invoices is
  'RF-F2-05 — fatura projetada de um cartão (competência + status). Criada por '
  'BE-F2-02 (SDD.md Seção 5.2, entidade ausente nº 3). "status" só é escrito por '
  '`close_due_invoices` (SECURITY DEFINER, bypassa RLS) — nenhuma policy de UPDATE '
  'é concedida a `authenticated`, o client nunca reabre/fecha fatura manualmente.';

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

alter table public.invoices enable row level security;

-- Só SELECT/INSERT para authenticated (DIR-27 + gate MFA, mesma decisão de
-- consistência de credit_cards/budget em BE-F2-01/BE-M-01). INSERT é
-- necessário porque `credit_cards_get_or_create_invoice` roda como invoker
-- dentro do trigger de `transactions` (mesmo princípio de
-- `accounts_seed_default_payment_methods`, BE-M-02) — a 1ª vez que um
-- lançamento cai numa competência nova, o próprio INSERT do usuário cria a
-- fatura. UPDATE/DELETE propositalmente sem policy: status só muda via
-- `close_due_invoices` (SECURITY DEFINER); nenhuma tarefa/RN pede exclusão de
-- fatura pelo client.
create policy invoices_select_own on public.invoices
  for select to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

create policy invoices_insert_own on public.invoices
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and exists (
      select 1 from public.credit_cards cc
      where cc.id = credit_card_id and cc.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 2. FK de transactions.card_invoice_id -> invoices.id (coluna antecipada
--    desde a Fase 1, sem FK até agora por a tabela-alvo não existir — mesmo
--    padrão de payment_methods.credit_card_id em BE-F2-01). Sem ON DELETE:
--    RESTRICT padrão — protege lançamento histórico (mesmo princípio
--    implícito já em vigor para transactions.payment_method_id).
-- =============================================================================

alter table public.transactions
  add constraint transactions_card_invoice_id_fkey
  foreign key (card_invoice_id) references public.invoices(id);

-- =============================================================================
-- 3. Núcleo de cálculo (RN-01) — única fonte de verdade da data de fechamento
--    de uma competência, clampada ao último dia do mês (ex. closing_day=31 num
--    cartão cujo ciclo cai em fevereiro fecha dia 28/29, não estoura pro mês
--    seguinte por overflow).
-- =============================================================================

create function public.credit_card_effective_closing_date(p_competencia date, p_closing_day smallint)
returns date
language sql
immutable
as $$
  select least(
    date_trunc('month', p_competencia)::date + (p_closing_day - 1),
    (date_trunc('month', p_competencia) + interval '1 month - 1 day')::date
  );
$$;

comment on function public.credit_card_effective_closing_date(date, smallint) is
  'RN-01 — data real de fechamento de uma competência para um closing_day, '
  'clampada ao último dia do mês. Única fonte de verdade, reaproveitada por '
  'credit_card_invoice_competencia (atribuição síncrona) e close_due_invoices '
  '(job periódico) — DIR-06.';

-- "Fatura corrente vs. próxima" (RN-01/RF-F2-05 AC2): dado um lançamento numa
-- data, decide a competência (1º dia do mês da fatura) a que ele pertence.
create function public.credit_card_invoice_competencia(p_closing_day smallint, p_transaction_date date)
returns date
language sql
immutable
as $$
  select case
    when p_transaction_date > public.credit_card_effective_closing_date(p_transaction_date, p_closing_day)
      then (date_trunc('month', p_transaction_date) + interval '1 month')::date
    else date_trunc('month', p_transaction_date)::date
  end;
$$;

comment on function public.credit_card_invoice_competencia(smallint, date) is
  'RN-01/RF-F2-05 AC2 — "lançamento pós-fechamento entra na próxima fatura, '
  'nunca na já fechada". Função pura, sem acesso a tabela — testável isolada.';

-- Upsert idempotente de 1 fatura para uma competência já conhecida — primitiva
-- reaproveitada tanto pela atribuição síncrona quanto pela geração antecipada.
create function public.credit_cards_ensure_invoice(p_credit_card_id uuid, p_competencia date)
returns uuid
language plpgsql
as $$
declare
  v_user_id    uuid;
  v_invoice_id uuid;
begin
  select user_id into v_user_id from public.credit_cards where id = p_credit_card_id;
  if v_user_id is null then
    raise exception 'credit_card % not found', p_credit_card_id using errcode = '23503';
  end if;

  insert into public.invoices (credit_card_id, user_id, competencia)
  values (p_credit_card_id, v_user_id, date_trunc('month', p_competencia)::date)
  on conflict (credit_card_id, competencia) do update set competencia = excluded.competencia
  returning id into v_invoice_id;

  return v_invoice_id;
end;
$$;

comment on function public.credit_cards_ensure_invoice(uuid, date) is
  'Upsert idempotente de invoices(credit_card_id, competencia). Roda como '
  'invoker — dentro do trigger de transactions (usuário dono do cartão, RLS '
  'normal) ou dentro de generate_upcoming_invoices (SECURITY DEFINER, todos os '
  'usuários).';

-- Ponto de entrada usado pelo trigger de transactions: resolve a competência
-- a partir da data do lançamento e garante que a fatura exista.
create function public.credit_cards_get_or_create_invoice(p_credit_card_id uuid, p_transaction_date date)
returns uuid
language plpgsql
as $$
declare
  v_closing_day smallint;
  v_competencia date;
begin
  select closing_day into v_closing_day from public.credit_cards where id = p_credit_card_id;
  if v_closing_day is null then
    raise exception 'credit_card % not found', p_credit_card_id using errcode = '23503';
  end if;

  v_competencia := public.credit_card_invoice_competencia(v_closing_day, p_transaction_date);
  return public.credit_cards_ensure_invoice(p_credit_card_id, v_competencia);
end;
$$;

comment on function public.credit_cards_get_or_create_invoice(uuid, date) is
  'RN-01/RF-F2-05 AC2 — chamada pelo trigger de transactions (invoker rights: '
  'só resolve fatura de cartão do próprio usuário, RLS de credit_cards/invoices '
  'garante isso).';

-- =============================================================================
-- 4. Atribuição automática e síncrona (transactions.card_invoice_id nunca é
--    aceito do client — mesmo princípio já em vigor para "status", DIR-12: o
--    saldo/fatura já refletem o lançamento na resposta da própria escrita).
-- =============================================================================

create function public.transactions_assign_card_invoice()
returns trigger
language plpgsql
as $$
declare
  v_card_id uuid;
begin
  if new.payment_method_id is null then
    new.card_invoice_id := null;
    return new;
  end if;

  select credit_card_id into v_card_id
  from public.payment_methods
  where id = new.payment_method_id and type = 'credit_card';

  if v_card_id is null then
    new.card_invoice_id := null;
    return new;
  end if;

  new.card_invoice_id := public.credit_cards_get_or_create_invoice(v_card_id, new.transaction_date);
  return new;
end;
$$;

comment on function public.transactions_assign_card_invoice() is
  'RN-01/RF-F2-05 AC2 — resolve transactions.card_invoice_id a partir de '
  'payment_method_id (quando type=credit_card) + transaction_date, sempre '
  'recalculado pelo servidor, nunca aceito do client (mesmo padrão de '
  '"status", transactions_set_status).';

create trigger transactions_before_insert_assign_card_invoice
  before insert on public.transactions
  for each row execute function public.transactions_assign_card_invoice();

create trigger transactions_before_update_assign_card_invoice
  before update of transaction_date, payment_method_id on public.transactions
  for each row execute function public.transactions_assign_card_invoice();

-- =============================================================================
-- 5. Geração antecipada (DIR-13: competência atual + 2 futuras, 3 abas) e
--    fechamento de fatura vencida (RF-F2-05 AC3) — SECURITY DEFINER porque
--    operam sobre cartões de TODOS os usuários (job global via pg_cron),
--    mesmo padrão de auth_users_restrict_signup (BE-M-12) / accounts_block_
--    delete_when_linked (BE-M-13). Chamadas pela Edge Function invoice-close.
-- =============================================================================

create function public.generate_upcoming_invoices()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_card   record;
  v_count  integer := 0;
begin
  for v_card in select id from public.credit_cards where is_active = true loop
    perform public.credit_cards_ensure_invoice(v_card.id, date_trunc('month', current_date)::date);
    perform public.credit_cards_ensure_invoice(v_card.id, date_trunc('month', current_date + interval '1 month')::date);
    perform public.credit_cards_ensure_invoice(v_card.id, date_trunc('month', current_date + interval '2 months')::date);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

comment on function public.generate_upcoming_invoices() is
  'DIR-13 — garante que todo cartão ativo tenha fatura para competência atual + '
  '2 futuras. SECURITY DEFINER: itera cartão de todos os usuários (job global). '
  'Retorna nº de cartões processados.';

create function public.close_due_invoices()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_count integer;
begin
  update public.invoices i
  set status = 'fechada'
  from public.credit_cards cc
  where i.credit_card_id = cc.id
    and i.status = 'aberta'
    and current_date > public.credit_card_effective_closing_date(i.competencia, cc.closing_day);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.close_due_invoices() is
  'RF-F2-05 AC3 — fecha (status=fechada) toda fatura cuja data de fechamento já '
  'passou. Só reflete para leitura: a atribuição de lançamento (RN-01, item 4 '
  'acima) já é resolvida por data, independente deste job. SECURITY DEFINER: '
  'cobre fatura de todos os usuários. Retorna nº de faturas fechadas.';

-- =============================================================================
-- 6. Limite disponível (RN-06) — "reduz o limite desde o lançamento da '
--    compra, não só quando cai na fatura": soma TODA transação de despesa já
--    lançada em qualquer fatura (aberta ou fechada) do cartão, sem esperar
--    pagamento — não há estado "paga" no modelo (SDD.md Seção 5.2 só lista '
--    aberta/fechada; rastreamento de pagamento de fatura não é requisito '
--    desta tarefa nem de RF-F2-05/BE-F2-02).
-- =============================================================================

create function public.get_credit_cards_available_limit()
returns table (
  credit_card_id  uuid,
  name            text,
  limit_cents     bigint,
  committed_cents bigint,
  available_cents bigint
)
language sql
stable
as $$
  select
    cc.id,
    cc.name,
    cc.limit_cents,
    coalesce(sum(t.amount_cents), 0)::bigint as committed_cents,
    (cc.limit_cents - coalesce(sum(t.amount_cents), 0))::bigint as available_cents
  from public.credit_cards cc
  left join public.invoices i
    on i.credit_card_id = cc.id and i.status in ('aberta', 'fechada')
  left join public.transactions t
    on t.card_invoice_id = i.id and t.kind = 'expense'
  where cc.is_active = true
  group by cc.id, cc.name, cc.limit_cents;
$$;

comment on function public.get_credit_cards_available_limit() is
  'RN-06 — limite disponível por cartão do usuário autenticado (RLS de '
  'credit_cards/invoices/transactions escopa às linhas do próprio dono, função '
  'não é SECURITY DEFINER de propósito).';
