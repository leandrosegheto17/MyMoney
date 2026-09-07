-- BE-F3-00 — Modelo de dados de captura automatizada: `candidate_transaction`,
-- `import_batch` (SDD.md Seção 5.2, entidades ausentes nº 10/11) — base
-- compartilhada por voz (BE-F3-01/02), foto/OCR (BE-F3-01), importação OFX/CSV
-- (BE-F3-03) e Open Finance (BE-F3-04). Critério de aceite literal: nenhuma
-- linha em `candidate_transaction` é promovida a `transaction` sem evento de
-- confirmação explícito + `confirmed_at` gravado (RNF-01/RNF-08, DIR-20).
--
-- ============================================================================
-- Nota de interpretação (desvio pequeno, documentado — GUARDRAILS.md permite
-- resolver e documentar quando é detalhe de implementação, não desvio grande
-- de escopo/estimativa): SDD.md Seção 5.1 descreve `transactions` como já
-- tendo uma coluna `confirmed_at` ("Adotada como está... colunas
-- antecipatórias reaproveitadas, não redesenhadas"), mas a inspeção do schema
-- real (baseline_legacy.sql, `CREATE TABLE transactions`) NÃO tem essa coluna
-- — só `recurring_rule_id`, `installment_plan_id`, `card_invoice_id`,
-- `attachment_id`, `source`, `import_staging_id`, `external_ref`. Isto é
-- exatamente o tipo de coluna antecipatória que a Seção 5.4 do SDD.md prevê
-- completar por migration aditiva quando a entidade correspondente (esta
-- tarefa) é implementada — não uma reinterpretação de ADR/diretriz, é
-- preencher uma lacuna factual da auditoria anterior dentro do que a própria
-- Seção 5.4 já autoriza ("ALTER TABLE transactions ADD ..." aditivo). Adiciona
-- `transactions.confirmed_at` (nullable) nesta migration — sem essa coluna,
-- RNF-08 ("todo lançamento de origem automatizada deve manter registro... com
-- timestamp") não teria onde gravar o timestamp de confirmação no PRÓPRIO
-- lançamento (só no candidato, que pode em tese ser referenciado só
-- indiretamente). `confirm_candidate_transaction` (abaixo) grava o mesmo
-- `now()` tanto em `candidate_transaction.confirmed_at` quanto em
-- `transactions.confirmed_at` — nenhuma discrepância entre os dois.
--
-- Desenho do mecanismo de confirmação (item 4 da tarefa): NENHUM trigger
-- automático promove candidate_transaction -> transaction (DIR-20 "nunca
-- silenciosamente"). A ÚNICA forma de uma linha de candidate_transaction sair
-- de status='pending' é através de uma das 2 RPCs SECURITY DEFINER abaixo
-- (`confirm_candidate_transaction`/`discard_candidate_transaction`) — não há
-- policy de UPDATE nenhuma para o role `authenticated` nesta tabela (RLS nega
-- por padrão qualquer PATCH direto via PostgREST), e a policy de INSERT só
-- aceita linha nova com status='pending' e os 3 campos de "resultado"
-- (confirmed_at/discarded_at/resulting_transaction_id) nulos — fecha o
-- caminho de um client malicioso simplesmente fazer POST já com
-- status='confirmed'/confirmed_at preenchido "fingindo" uma confirmação que
-- nunca aconteceu. `candidate_transaction_status_consistency` (CHECK de
-- tabela) reforça a mesma máquina de estados em qualquer camada que grave
-- nesta tabela, inclusive fora do PostgREST.
--
-- Fora de escopo desta tarefa (propositalmente — ver TASK.md, é o escopo
-- explícito de QA-F3-01): endurecer a policy geral de INSERT de `transactions`
-- para rejeitar `source <> 'manual'` vindo direto do client sem passar pelo
-- fluxo de candidato. Essa é uma mudança cross-cutting na tabela já existente
-- de MVP/Fase 1/2, não faz parte de "modelo de dados de captura automatizada"
-- literal desta tarefa, e é exatamente o teste que QA-F3-01 (Seção 4 do
-- TASK.md) descreve fazer propositalmente falhar para provar (ou não) esse
-- gap especificamente. Se QA-F3-01 confirmar um gap real ali, vira uma nova
-- tarefa/migration de Backend nessa data, não uma reinterpretação silenciosa
-- de escopo aqui.
--
-- 100% aditiva (DIR-03): CREATE TYPE x2, CREATE TABLE x2, ALTER TABLE ADD
-- COLUMN/ADD CONSTRAINT (FK) em `transactions` (aditiva, não altera linha
-- real nenhuma — coluna nova sempre NULL para todo lançamento já existente),
-- CREATE FUNCTION x2. Nenhuma linha real de `public` é alterada/removida.
-- Rollback: supabase/migrations_down/20260904170000_be_f3_00_candidate_transaction_import_batch.down.sql

-- =============================================================================
-- 1. import_batch (SDD.md Seção 5.2, "ImportBatch") — fonte (ofx/csv/open
--    finance) + status do lote. Reaproveita o enum `transaction_source` já
--    existente (não cria um tipo paralelo) restrito, via CHECK, aos 2 valores
--    que fazem sentido para um LOTE (voz/foto não produzem lote — 1 candidato
--    avulso cada, `import_batch_id` fica null nesses casos, ver seção 2).
-- =============================================================================

create type public.import_batch_status as enum ('processing', 'ready_for_review', 'completed', 'failed');

create table public.import_batch (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  source       public.transaction_source not null,
  status       public.import_batch_status not null default 'processing',
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint import_batch_source_check check (source in ('import', 'openfinance'))
);

comment on table public.import_batch is
  'RF-F3-03/RF-F3-04 (BE-F3-00, SDD.md Seção 5.2, entidade ausente nº 10) — '
  'lote de importação (OFX/CSV via RF-F3-03, ou sincronização Open Finance via '
  'RF-F3-04), agrupa N linhas de candidate_transaction. "source" reaproveita o '
  'enum transaction_source já existente (mesmo domínio de valores de '
  'Transaction.source), restrito por CHECK a import/openfinance — voz/foto '
  '(audio/ocr) nunca formam um lote, o candidato correspondente tem '
  'import_batch_id null (ver candidate_transaction). "status" é '
  'responsabilidade física do Backend (SDD.md não detalha valores): '
  'processing (arquivo/sync ainda sendo parseado) -> ready_for_review '
  '(candidatos já gerados, aguardando revisão do usuário, RF-F3-03 AC1) -> '
  'completed (todo candidato do lote saiu de pending, confirmado ou '
  'descartado) | failed (erro de parsing/sync, ex. arquivo corrompido). '
  '"raw_metadata" guarda metadado leve não normalizado (nome do arquivo, '
  'referência de conexão Open Finance) — "conciliar na implementação" (nota '
  'literal do SDD.md 5.2); modelagem definitiva de OpenFinanceConnection fica '
  'para BE-F3-04, fora de escopo aqui.';

create trigger import_batch_set_updated_at
  before update on public.import_batch
  for each row execute function public.set_updated_at();

alter table public.import_batch enable row level security;

create policy import_batch_select_own on public.import_batch
  for select to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

create policy import_batch_insert_own on public.import_batch
  for insert to authenticated
  with check (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

create policy import_batch_update_own on public.import_batch
  for update to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true')
  with check (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

create policy import_batch_delete_own on public.import_batch
  for delete to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

-- =============================================================================
-- 2. candidate_transaction (SDD.md Seção 5.2, "CandidateTransaction") — dado
--    bruto extraído (voz/OCR/OFX/CSV/Open Finance), possível duplicata
--    (nullable), status (pendente/confirmado/descartado). Entidade central do
--    critério de aceite de BE-F3-00.
-- =============================================================================

create type public.candidate_transaction_status as enum ('pending', 'confirmed', 'discarded');

create table public.candidate_transaction (
  id                           uuid primary key default gen_random_uuid(),
  user_id                      uuid not null references auth.users(id) on delete cascade,
  import_batch_id              uuid references public.import_batch(id) on delete cascade,
  source                       public.transaction_source not null,
  status                       public.candidate_transaction_status not null default 'pending',
  raw_payload                  jsonb not null default '{}'::jsonb,
  duplicate_of_transaction_id  uuid references public.transactions(id) on delete set null,
  resulting_transaction_id     uuid references public.transactions(id) on delete set null,
  confirmed_at                 timestamptz,
  discarded_at                 timestamptz,
  created_at                   timestamptz not null default now(),
  constraint candidate_transaction_source_not_manual check (source <> 'manual'),
  constraint candidate_transaction_status_consistency check (
    (status = 'pending'   and confirmed_at is null     and discarded_at is null     and resulting_transaction_id is null)
    or (status = 'confirmed' and confirmed_at is not null and discarded_at is null     and resulting_transaction_id is not null)
    or (status = 'discarded' and discarded_at is not null and confirmed_at is null     and resulting_transaction_id is null)
  )
);

comment on table public.candidate_transaction is
  'RF-F3-01/02/03/04, RNF-01, RNF-08 (BE-F3-00, SDD.md Seção 5.2, entidade '
  'ausente nº 11) — candidato de lançamento extraído automaticamente (voz, '
  'foto/OCR, importação OFX/CSV, Open Finance), nunca persistido diretamente '
  'como Transaction (DIR-20). "raw_payload" é o dado bruto da extração '
  '(transcrição/campos de OCR/linha OFX/registro Open Finance — schema livre '
  'por fonte, decisão física do Backend). import_batch_id é NULL para '
  'voz/foto (candidato avulso, sem lote) e preenchido para importação/Open '
  'Finance. duplicate_of_transaction_id sinaliza possível duplicata de um '
  'lançamento já existente (RF-F3-03 AC2), nunca bloqueia a confirmação — só '
  'informa o Frontend. resulting_transaction_id só é preenchido pela própria '
  'confirm_candidate_transaction, nunca por INSERT/UPDATE do client (ver '
  'policies abaixo + candidate_transaction_status_consistency). Máquina de '
  'estados (pending -> confirmed | discarded) é sempre terminal — nenhuma '
  'transição de volta a pending.';

comment on column public.candidate_transaction.confirmed_at is
  'RNF-08 — timestamp do evento de confirmação humana explícita. Só gravado '
  'por confirm_candidate_transaction (nunca por INSERT/UPDATE direto do '
  'client — sem policy de UPDATE nesta tabela para authenticated, RLS nega '
  'por padrão). Espelhado em transactions.confirmed_at no mesmo instante.';

comment on column public.candidate_transaction.resulting_transaction_id is
  'Preenchido só por confirm_candidate_transaction — a Transaction real criada '
  'a partir deste candidato (0:1, SDD.md Seção 5.3 diagrama '
  'CANDIDATE_TRANSACTION |o--o| TRANSACTION). ON DELETE SET NULL: excluir a '
  'transação gerada não apaga o histórico do candidato (mesmo princípio de '
  'RN-07 para recurring_rule_id/installment_plan_id).';

create index candidate_transaction_user_status_idx on public.candidate_transaction (user_id, status);
create index candidate_transaction_import_batch_idx on public.candidate_transaction (import_batch_id);

alter table public.candidate_transaction enable row level security;

create policy candidate_transaction_select_own on public.candidate_transaction
  for select to authenticated
  using (auth.uid() = user_id and (auth.jwt() ->> 'app_email_mfa_verified') = 'true');

-- INSERT só cria candidato "em branco" (status=pending, sem nenhum dos 3
-- campos de resultado preenchido) — impede um client já criar a linha
-- "fingindo" que já passou por confirmação/descarte (G-19 + DIR-20). Ownership
-- de import_batch_id/duplicate_of_transaction_id validada (mesmo padrão de
-- BE-M-13/BE-F2-08 para FK a outra tabela "ownable").
create policy candidate_transaction_insert_own on public.candidate_transaction
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'app_email_mfa_verified') = 'true'
    and status = 'pending'
    and confirmed_at is null
    and discarded_at is null
    and resulting_transaction_id is null
    and (import_batch_id is null or exists (
      select 1 from public.import_batch ib where ib.id = import_batch_id and ib.user_id = auth.uid()
    ))
    and (duplicate_of_transaction_id is null or exists (
      select 1 from public.transactions t where t.id = duplicate_of_transaction_id and t.user_id = auth.uid()
    ))
  );

-- Sem policy de UPDATE para authenticated, de propósito (DIR-20/critério de
-- aceite): a ÚNICA forma de status sair de 'pending' é via
-- confirm_candidate_transaction/discard_candidate_transaction (SECURITY
-- DEFINER, bypassa RLS depois de validar ownership+estado no próprio corpo).
-- Qualquer PATCH direto via PostgREST em /candidate_transaction é negado pela
-- RLS (nenhuma policy de UPDATE = deny por padrão) — coberto em
-- supabase/tests/be_f3_00_candidate_transaction_import_batch.test.sql (CASO
-- de bypass).

-- DELETE só permitido enquanto ainda 'pending' — cobre RF-F3-01 AC4 ("cancelar
-- a captura antes de confirmar... descartar o rascunho"), sem exigir uma
-- viagem a discard_candidate_transaction quando o rascunho nem chegou a ser
-- revisado. Candidato já confirmado/descartado nunca pode ser excluído
-- fisicamente (preserva o registro de auditoria de RNF-08).
create policy candidate_transaction_delete_own_pending on public.candidate_transaction
  for delete to authenticated
  using (auth.uid() = user_id and status = 'pending');

-- =============================================================================
-- 3. transactions.confirmed_at (coluna antecipatória completada agora — ver
--    nota de interpretação no cabeçalho) + FK de transactions.import_staging_id
--    -> candidate_transaction.id (coluna antecipada desde a Fase 1, "conciliar
--    com CandidateTransaction na implementação", SDD.md Seção 5.2/5.4). ON
--    DELETE SET NULL, nunca CASCADE (mesmo princípio de RN-07 já aplicado a
--    recurring_rule_id/installment_plan_id/card_invoice_id).
-- =============================================================================

alter table public.transactions add column confirmed_at timestamptz;

comment on column public.transactions.confirmed_at is
  'RNF-08 — timestamp do evento de confirmação humana explícita, para '
  'lançamento de origem automatizada (source <> manual). NULL para '
  'lançamento manual (nunca passou por candidate_transaction) e para '
  'lançamento automatizado gerado por outro caminho de sistema (recorrência/ '
  'parcelamento/conta fixa — geração automática já é o próprio evento, não '
  'uma "confirmação humana" no sentido de RNF-01/08). Gravado exclusivamente '
  'por confirm_candidate_transaction, nunca aceito do client em INSERT/UPDATE '
  'direto de /transactions (mesmo princípio de "status"/"card_invoice_id" — '
  'campo calculado/atribuído pelo servidor, não pelo client). Coluna '
  'antecipada por BE-F3-00 (SDD.md Seção 5.1 já descrevia esta coluna como '
  'existente; auditoria anterior não a encontrou no schema real — completada '
  'agora, aditivamente).';

alter table public.transactions
  add constraint transactions_import_staging_id_fkey
  foreign key (import_staging_id) references public.candidate_transaction(id) on delete set null;

-- =============================================================================
-- 4. Mecanismo de confirmação explícita (item central do critério de aceite)
--    — SECURITY DEFINER porque precisa fazer 2 escritas atômicas (INSERT em
--    transactions + UPDATE em candidate_transaction) sob a identidade de quem
--    chama (auth.uid()), nunca um trigger silencioso. Cada FK final é
--    validada explicitamente contra auth.uid() dentro do corpo da função
--    (SECURITY DEFINER bypassa RLS — precisa reimplementar o mesmo G-19 que
--    RLS faria, mesmo padrão de credit_cards_ensure_invoice/BE-F2-02 quando
--    uma função SECURITY DEFINER escreve em nome de um usuário específico).
-- =============================================================================

create function public.confirm_candidate_transaction(
  p_candidate_id uuid,
  p_account_id uuid,
  p_payment_method_id uuid,
  p_category_id uuid,
  p_kind public.transaction_kind,
  p_amount_cents bigint,
  p_transaction_date date,
  p_description text default null,
  p_destination_account_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_candidate public.candidate_transaction%rowtype;
  v_new_transaction_id uuid;
begin
  select * into v_candidate from public.candidate_transaction where id = p_candidate_id;

  if v_candidate.id is null then
    raise exception 'candidate_transaction % not found', p_candidate_id
      using errcode = '23503'; -- foreign_key_violation -> PostgREST mapeia para 409/400
  end if;

  if v_candidate.user_id <> auth.uid() then
    raise exception 'candidate_transaction % does not belong to the authenticated user', p_candidate_id
      using errcode = '42501'; -- insufficient_privilege -> PostgREST mapeia para 403
  end if;

  if v_candidate.status <> 'pending' then
    raise exception 'candidate_transaction % is not pending (current status: %) — cannot confirm', p_candidate_id, v_candidate.status
      using errcode = '23001'; -- restrict_violation -> PostgREST mapeia para 409 Conflict
  end if;

  -- Ownership das FKs FINAIS (RF-F3-01 AC3: usuário pode ter editado qualquer
  -- campo pré-preenchido antes de confirmar — o valor final vem sempre destes
  -- parâmetros explícitos, nunca de raw_payload/campos sugeridos internos).
  if not exists (select 1 from public.accounts a where a.id = p_account_id and a.user_id = auth.uid()) then
    raise exception 'account % does not belong to the authenticated user', p_account_id using errcode = '42501';
  end if;

  if p_category_id is not null and not exists (
    select 1 from public.categories c where c.id = p_category_id and (c.user_id = auth.uid() or c.user_id is null)
  ) then
    raise exception 'category % does not belong to the authenticated user', p_category_id using errcode = '42501';
  end if;

  if p_payment_method_id is not null and not exists (
    select 1 from public.payment_methods pm where pm.id = p_payment_method_id and pm.user_id = auth.uid()
  ) then
    raise exception 'payment_method % does not belong to the authenticated user', p_payment_method_id using errcode = '42501';
  end if;

  if p_destination_account_id is not null and not exists (
    select 1 from public.accounts da where da.id = p_destination_account_id and da.user_id = auth.uid()
  ) then
    raise exception 'destination account % does not belong to the authenticated user', p_destination_account_id using errcode = '42501';
  end if;

  -- INSERT normal em transactions: transactions_set_status (status),
  -- transactions_assign_card_invoice (card_invoice_id) e
  -- apply_transaction_effect (saldo da conta) continuam disparando
  -- normalmente — nenhuma duplicação de lógica aqui, mesmo caminho de
  -- qualquer INSERT em transactions feito pelo próprio usuário.
  insert into public.transactions (
    user_id, account_id, destination_account_id, payment_method_id, category_id,
    kind, amount_cents, description, transaction_date,
    source, import_staging_id, confirmed_at
  ) values (
    auth.uid(), p_account_id, p_destination_account_id, p_payment_method_id, p_category_id,
    p_kind, p_amount_cents, p_description, p_transaction_date,
    v_candidate.source, v_candidate.id, now()
  )
  returning id into v_new_transaction_id;

  update public.candidate_transaction
    set status = 'confirmed', confirmed_at = now(), resulting_transaction_id = v_new_transaction_id
    where id = p_candidate_id;

  return v_new_transaction_id;
end;
$$;

comment on function public.confirm_candidate_transaction(uuid, uuid, uuid, uuid, public.transaction_kind, bigint, date, text, uuid) is
  'RF-F3-01/02/03/04 AC (confirmação explícita), RNF-01, RNF-08, DIR-20 — '
  'ÚNICO caminho para promover um candidate_transaction pendente a uma '
  'Transaction real. Grava confirmed_at (candidate_transaction E '
  'transactions) no mesmo now(). Rejeita candidato de outro usuário (42501), '
  'candidato já confirmado/descartado (23001) e qualquer FK final que não '
  'pertença ao usuário autenticado (42501, G-19). SECURITY DEFINER: '
  'candidate_transaction não tem policy de UPDATE para authenticated — só '
  'esta função (e discard_candidate_transaction) pode transicionar o status.';

create function public.discard_candidate_transaction(p_candidate_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_candidate public.candidate_transaction%rowtype;
begin
  select * into v_candidate from public.candidate_transaction where id = p_candidate_id;

  if v_candidate.id is null then
    raise exception 'candidate_transaction % not found', p_candidate_id using errcode = '23503';
  end if;

  if v_candidate.user_id <> auth.uid() then
    raise exception 'candidate_transaction % does not belong to the authenticated user', p_candidate_id using errcode = '42501';
  end if;

  if v_candidate.status <> 'pending' then
    raise exception 'candidate_transaction % is not pending (current status: %) — cannot discard', p_candidate_id, v_candidate.status
      using errcode = '23001';
  end if;

  update public.candidate_transaction
    set status = 'discarded', discarded_at = now()
    where id = p_candidate_id;
end;
$$;

comment on function public.discard_candidate_transaction(uuid) is
  'RF-F3-03 status "descartado" (SDD.md Seção 5.2) — descarta explicitamente '
  'um candidato pendente (ex. usuário desmarca/rejeita um item da lista de '
  'importação) sem excluir a linha (mantém o registro, diferente de '
  'candidate_transaction_delete_own_pending, que remove fisicamente um '
  'rascunho de voz/foto cancelado antes de qualquer revisão, RF-F3-01 AC4). '
  'Mesmas checagens de ownership/estado de confirm_candidate_transaction.';
