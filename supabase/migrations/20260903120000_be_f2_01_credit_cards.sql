-- BE-F2-01 — Modelo de dados de Cartão de Crédito (RF-F2-01 AC1, SDD.md Seção 5.2,
-- entidade ausente nº 2 do Plano de Evolução) + vínculo com forma de pagamento
-- "crédito".
--
-- A coluna `payment_methods.credit_card_id` e o enum `payment_method_type.credit_card`
-- já existiam desde a Fase 1 (ver comentário original da coluna: "tabela que só
-- existe a partir da Fase 2 (F2-BE-01)... constraint de FK será adicionada via ALTER
-- TABLE na migration da Fase 2 que cria credit_cards, já que não é possível
-- referenciar uma tabela inexistente") — esta migration cumpre exatamente isso.
--
-- Escopo desta tarefa (TASK.md BE-F2-01): só o modelo de dados + o vínculo como
-- forma de pagamento (RF-F2-01 AC1). Fechamento de fatura, cálculo de limite
-- disponível (RN-06) e a tabela `invoice` ficam para BE-F2-02 — não antecipados aqui.
--
-- Extensão transparente de escopo (mesmo padrão já usado por BE-M-01/BE-M-02 ao
-- estender a tarefa literal por achado de auditoria): ao ligar `payment_methods.
-- credit_card_id` a uma tabela "ownable" nova, as policies `payment_methods_
-- insert_own`/`payment_methods_update_own` (que hoje só checam `auth.uid() =
-- user_id`) reabririam exatamente o gap de IDOR que BE-M-13/Bloqueio 010/SEC-DEBT-002
-- acabou de corrigir para budget/transactions, se a FK nova ficasse sem checagem de
-- ownership — o próprio racional do CTO em BE-M-13 ("toda tabela nova de Fase 2/3
-- com FK para outra tabela 'ownable' herdaria o mesmo padrão incorreto por cópia se a
-- convenção não for corrigida agora") se aplica aqui ao pé da letra. Corrigido já
-- nesta migration (mesmo padrão EXISTS de BE-M-13), não como débito novo.
--
-- 100% aditiva (DIR-03): CREATE TABLE, CREATE FUNCTION, CREATE TRIGGER, ALTER TABLE
-- ADD CONSTRAINT (FK nova sobre coluna já existente, hoje inteiramente NULL — 0
-- linhas de payment_methods com type='credit_card' hoje), DROP+CREATE de 2 policies
-- (mesmo precedente de BE-M-02/BE-M-13 — redefinição de regra de acesso, não perda
-- de dado). Nenhuma linha real de public é alterada.
-- Rollback: supabase/migrations_down/20260903120000_be_f2_01_credit_cards.down.sql

-- =============================================================================
-- 1. CreditCard (RF-F2-01, SDD.md Seção 5.2)
-- =============================================================================

create table public.credit_cards (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  limit_cents  bigint not null,
  closing_day  smallint not null,
  due_day      smallint not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint credit_cards_limit_positive check (limit_cents > 0),
  constraint credit_cards_closing_day_range check (closing_day between 1 and 31),
  constraint credit_cards_due_day_range check (due_day between 1 and 31)
);

comment on table public.credit_cards is
  'RF-F2-01 — cartão de crédito do usuário (limite, dia de fechamento, dia de '
  'vencimento). Criada por BE-F2-01 (SDD.md Seção 5.2, entidade ausente nº 2). '
  '"name" é campo físico não listado no modelo lógico do SDD (que só cita limite/'
  'fechamento/vencimento) — necessário para identificar o cartão na lista (S-CARD-01) '
  'e como nome da forma de pagamento "crédito" gerada automaticamente (ver trigger '
  'abaixo); decisão de física de coluna delegada ao Backend pelo próprio SDD.md.';

create trigger credit_cards_set_updated_at
  before update on public.credit_cards
  for each row execute function public.set_updated_at();

alter table public.credit_cards enable row level security;

-- Mesmo padrão de accounts/payment_methods/budget (DIR-27): RLS + gate de MFA.
-- credit_cards não é uma das 4 tabelas cujo gate é OBRIGATÓRIO por DIR-27, mas é
-- dado financeiro sensível referenciado por payment_methods (que exige o gate) —
-- mesma decisão de consistência já tomada para budget em BE-M-01.
create policy credit_cards_select_own on public.credit_cards
  for select to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

create policy credit_cards_insert_own on public.credit_cards
  for insert to authenticated
  with check (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

create policy credit_cards_update_own on public.credit_cards
  for update to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true')
  with check (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

create policy credit_cards_delete_own on public.credit_cards
  for delete to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

-- =============================================================================
-- 2. FK de payment_methods.credit_card_id -> credit_cards.id (coluna antecipada
--    desde a Fase 1, sem FK até agora por a tabela-alvo não existir).
--    ON DELETE CASCADE — simétrico à FK já existente payment_methods_account_id_fkey
--    (accounts -> payment_methods). Se houver transactions.payment_method_id
--    apontando para a forma de pagamento derivada, o CASCADE esbarra na FK RESTRICT
--    já existente de transactions (sem ON DELETE), abortando o DELETE do cartão —
--    mesma proteção implícita de dado histórico já em vigor para payment_methods
--    hoje, sem precisar de trigger novo (nenhuma RN específica de cartão exige isso
--    no MVP/Fase 2 além da proteção já herdada).
-- =============================================================================

alter table public.payment_methods
  add constraint payment_methods_credit_card_id_fkey
  foreign key (credit_card_id) references public.credit_cards(id) on delete cascade;

-- =============================================================================
-- 3. Ownership de credit_card_id em payment_methods_insert_own/_update_own
--    (extensão transparente — ver nota de escopo no topo do arquivo).
--    DROP+CREATE de policy (mesmo precedente de BE-M-02/BE-M-13).
-- =============================================================================

drop policy if exists payment_methods_insert_own on public.payment_methods;
create policy payment_methods_insert_own on public.payment_methods
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and (credit_card_id is null or exists (
      select 1 from public.credit_cards cc
      where cc.id = credit_card_id and cc.user_id = auth.uid()
    ))
  );

drop policy if exists payment_methods_update_own on public.payment_methods;
create policy payment_methods_update_own on public.payment_methods
  for update to authenticated
  using (auth.uid() = user_id and is_system_default = false and (auth.jwt() ->> 'app_email_mfa_verified') = 'true')
  with check (
    auth.uid() = user_id
    and is_system_default = false
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and (credit_card_id is null or exists (
      select 1 from public.credit_cards cc
      where cc.id = credit_card_id and cc.user_id = auth.uid()
    ))
  );

-- =============================================================================
-- 4. Vínculo automático como forma de pagamento "crédito" (RF-F2-01 AC1) — mesmo
--    princípio de accounts_seed_default_payment_methods (BE-M-02): trigger roda
--    como invoker (não SECURITY DEFINER), a policy payment_methods_insert_own
--    acima já permite (user_id = auth.uid() e credit_card_id aponta para um
--    credit_cards recém-criado do mesmo auth.uid()). is_system_default fica no
--    default (false) — diferente de Pix/Débito/Boleto/Dinheiro, cada "crédito" é
--    um objeto gerenciado pelo próprio usuário (1 por cartão cadastrado), não um
--    valor fixo do sistema.
-- =============================================================================

create function public.credit_cards_seed_payment_method()
returns trigger
language plpgsql
as $$
begin
  insert into public.payment_methods (user_id, credit_card_id, type, name)
  values (new.user_id, new.id, 'credit_card', new.name);
  return new;
end;
$$;

comment on function public.credit_cards_seed_payment_method() is
  'RF-F2-01 AC1 — ao cadastrar um cartão, disponibiliza automaticamente "crédito" '
  'como forma de pagamento vinculada (payment_methods.credit_card_id = novo cartão).';

create trigger credit_cards_after_insert_seed_payment_method
  after insert on public.credit_cards
  for each row
  when (new.is_active = true)
  execute function public.credit_cards_seed_payment_method();
