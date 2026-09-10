-- BE-F3-07 — Exportação CSV/PDF de lançamentos por período (RF-F3-06 AC1-2,
-- TASK.md Seção 3.3, lote "Relatórios & Exportação (Fase 3)").
--
-- `DIR-33` checado antes de escrever qualquer código novo: `supabase
-- functions list` no projeto linkado não mostrou nenhuma function de
-- exportação/relatório pré-existente (mesmas 8 já conhecidas de
-- `BE-F3-01`/`02`/`03`/`06` — nenhuma sobreposição, sem necessidade de
-- `BLOCKERS.md`).
--
-- Duas peças, ambas 100% aditivas (DIR-03/G-03):
--
--   (1) `public.get_report_export_rows(p_start_date, p_end_date)` — 1 RPC de
--       leitura (SECURITY INVOKER, escopada por auth.uid(), mesma família de
--       get_income_expense_report/BE-F2-10 e get_net_worth_evolution/BE-F3-06)
--       devolvendo cada lançamento do usuário no período com os campos
--       exigidos por RF-F3-06 AC1: data, conta, forma de pagamento,
--       categoria, subcategoria, descrição, tipo, valor. A agregação para o
--       resumo do PDF (AC2: saldo, entradas, saídas, distribuição por
--       categoria) é feita em código de aplicação
--       (`supabase/functions/report-export/lib.ts`), não em SQL — mesma
--       decisão de "I/O mínimo aqui, lógica pura testável no Edge Function"
--       já usada por `statement-import` (BE-F3-03), e permite cobrir a
--       agregação com `deno test` sem depender de fixture de banco.
--       Decisão de interpretação pequena (RF-F3-06 AC1 não define o
--       critério de categoria/subcategoria quando o lançamento usa uma
--       subcategoria de 2º nível): `category_name` é sempre a categoria de
--       TOPO (a própria, se já for topo, ou a categoria-pai, se o
--       lançamento usa uma subcategoria) e `subcategory_name` só é
--       preenchida quando o lançamento usa uma subcategoria (categoria com
--       `parent_category_id` não nulo) — nunca os dois níveis invertidos.
--       `kind = transfer` é INCLUÍDO aqui (diferente de
--       get_income_expense_report/BE-F2-10, que o exclui do comparativo
--       entrada x saída) porque este é um extrato/ledger completo do
--       período, não um comparativo — a exclusão de transfer do
--       ENTRADAS/SAÍDAS do resumo do PDF continua acontecendo, só em
--       código de aplicação, documentada em `lib.ts`.
--
--   (2) Bucket privado de Supabase Storage `exports` (SDD.md Seção 7 —
--       "Storage: bucket privado por padrão, sem listagem pública"; ADR-011
--       tabela-resumo, linha "Exports gerados sob demanda (CSV/PDF)" —
--       "signed URL de curta duração já prevista em Seção 7") + policies de
--       `storage.objects` restringindo cada usuário autenticado à própria
--       pasta (`<user_id>/...`), mesmo princípio de isolamento de `G-18`
--       (hoje escrito só para fotos de recibo, mas o mesmo texto de SDD.md
--       Seção 7 que origina G-18 é a política geral de Storage do produto,
--       não uma exceção só de recibo). Isto é o bucket que a futura
--       `BE-F3-08` (job de expurgo, "export gerado há mais de 24h é
--       removido do bucket de exports", ainda Não iniciada) vai precisar
--       existir para ter o que expurgar — nenhuma tabela de metadado nova é
--       criada para rastrear a idade do export: o próprio `created_at` do
--       objeto no Storage já é suficiente para aquele job filtrar por
--       idade, sem duplicar dado.
--
-- Nenhuma linha real de dado de usuário em `public` é alterada por esta
-- migration.
-- Rollback: supabase/migrations_down/20260909110000_be_f3_07_report_export.down.sql

create function public.get_report_export_rows(
  p_start_date date,
  p_end_date date
)
returns table (
  transaction_date date,
  account_name text,
  payment_method_name text,
  category_name text,
  subcategory_name text,
  description text,
  kind public.transaction_kind,
  amount_cents bigint
)
language sql
stable
set search_path to 'public'
as $$
  select
    t.transaction_date,
    a.name as account_name,
    pm.name as payment_method_name,
    coalesce(parent_cat.name, cat.name) as category_name,
    case when cat.parent_category_id is not null then cat.name else null end as subcategory_name,
    t.description,
    t.kind,
    t.amount_cents
  from public.transactions t
  join public.accounts a on a.id = t.account_id
  left join public.payment_methods pm on pm.id = t.payment_method_id
  left join public.categories cat on cat.id = t.category_id
  left join public.categories parent_cat on parent_cat.id = cat.parent_category_id
  where t.user_id = auth.uid()
    and t.transaction_date >= p_start_date
    and t.transaction_date <= p_end_date
  order by t.transaction_date asc, t.created_at asc;
$$;

comment on function public.get_report_export_rows(date, date) is
  'RF-F3-06 AC1 (BE-F3-07) — linhas de lançamento do usuário autenticado no '
  'período [p_start_date, p_end_date], já com conta/forma de pagamento/ '
  'categoria (topo)/subcategoria resolvidos, prontas para a Edge Function '
  '`report-export` montar o CSV (AC1) e agregar o resumo do PDF (AC2, em '
  'código de aplicação). Inclui kind=transfer (extrato completo do '
  'período, diferente do comparativo de get_income_expense_report). '
  'category_name é sempre a categoria de topo; subcategory_name só quando '
  'o lançamento usa uma subcategoria de 2º nível.';

-- ---------------------------------------------------------------------------
-- Bucket privado de exports + isolamento por usuário (pasta = user_id).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do nothing;

create policy "exports_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "exports_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
