-- BE-REF-04 — Novo trigger transactions_default_account_from_payment_method
-- (ADR-016 Decisão 3, RF-REF-04 AC1/AC2/AC5, RN-16, DIR-36): resolve
-- transactions.account_id a partir de payment_method_id sempre que o client o
-- omite (NEW.account_id IS NULL), sem afetar nenhum fluxo que já envia
-- account_id explicitamente.
--
-- Lógica (fiel a ADR-016 Decisão 3):
--   1. kind = 'transfer' ou payment_method_id IS NULL: não faz nada — account_id
--      continua obrigatório e explícito (fora de escopo de RF-REF-04, transfer
--      não usa payment_method_id).
--   2. Busca a forma de pagamento com checagem PRÓPRIA de ownership
--      (WHERE id = NEW.payment_method_id AND user_id = auth.uid()) —
--      independente de RLS, defesa em profundidade (ADR-016 Decisão 5). Não
--      encontrada: erro explícito (23514 -> PostgREST mapeia para 400), nunca
--      deixa a violação de NOT NULL de account_id estourar sem contexto.
--   3. type <> 'credit_card': account_id := payment_methods.account_id (vínculo
--      já existente/auditado em ADR-012).
--   4. type = 'credit_card' (Opção D — nenhuma conta vinculada a credit_card_id
--      hoje): account_id := conta ativa mais antiga do usuário — preserva
--      EXATAMENTE o comportamento financeiro já observado hoje (toda transação
--      de cartão já debita/credita alguma conta via apply_transaction_effect,
--      mesmo antes deste pacote). Não corrige/inventa regra de negócio nova
--      (sinalizado ao BA/PM em ADR-016, fora do escopo desta tarefa).
--
-- Nome do trigger (não da função): "transactions_before_insert_account_from_
-- payment_method"/"..._before_update_..." em vez do nome único citado no
-- ADR/TASK.md ("transactions_default_account_from_payment_method", usado aqui
-- como nome da FUNÇÃO) — mesma convenção já em uso neste schema (função
-- accounts_seed_default_payment_methods() / trigger accounts_after_insert_
-- seed_default_payment_methods; função transactions_assign_card_invoice() /
-- triggers transactions_before_{insert,update}_assign_card_invoice).
-- Decisão de detalhe de implementação (documentada aqui, não uma reinterpretação
-- de ADR-016): o NOME do trigger precisa ordenar, alfabeticamente, ANTES de
-- "transactions_before_insert_block_inactive_account" — Postgres dispara
-- múltiplos triggers BEFORE do mesmo evento em ordem alfabética de nome, e
-- transactions_block_inactive_account (RN-08, pré-existente) lê NEW.account_id
-- para validar que a conta está ativa; se disparasse ANTES da resolução desta
-- migration, veria account_id ainda NULL e o SELECT não encontraria linha
-- (v_account_active permaneceria NULL, "IF v_account_active IS false" nunca
-- verdadeiro) — o bloqueio de RN-08 seria silenciosamente pulado sempre que o
-- client omitisse account_id. "account_from_payment_method" ordena antes de
-- "assign_card_invoice" e de "block_inactive_account" (mesmo prefixo
-- "transactions_before_insert_", 'a'<'a'<'b' e 'c'<'s' na 2ª letra de
-- account/assign) — preserva o RN-08 existente para o caminho novo, sem tocar
-- em transactions_block_inactive_account.
--
-- Migration 100% aditiva: CREATE FUNCTION + CREATE TRIGGER novos, account_id
-- continua NOT NULL na tabela, nenhum ALTER COLUMN, nenhuma linha existente
-- tocada (DIR-38, ADR-016 Decisão 4).
-- Rollback: supabase/migrations_down/20260904150000_be_ref_04_transactions_default_account_from_payment_method.down.sql
--
-- ============================================================================
-- Fix-loop (revisão de spec-compliance/qualidade, tentativa 1/2) — 3 achados
-- corrigidos na mesma migration (ainda não promovida a nenhum lote fechado —
-- reescrita segura, mesmo precedente de BE-REF-02, sem novo arquivo/down pair).
-- ============================================================================
--
-- Achado M-1 (médio, spec-compliance): o trigger BEFORE UPDATE original só
-- disparava com `WHEN (new.account_id IS NULL)` — em PATCH via PostgREST,
-- omitir account_id do payload NÃO produz NEW.account_id IS NULL (diferente de
-- INSERT): PostgREST preserva OLD.account_id para toda coluna ausente do JSON,
-- então o trigger nunca disparava ao editar só payment_method_id, contradizendo
-- API-CONTRACT.yaml v0.19.0 (que documentava a resolução automática para POST
-- **e PATCH**). Corrigido ampliando o WHEN do trigger de UPDATE para também
-- disparar quando payment_method_id muda — mesmo padrão idiomático já usado
-- por transactions_before_update_assign_card_invoice ("before update of
-- transaction_date, payment_method_id", BE-F2-02): `WHEN (new.account_id IS
-- NULL OR new.payment_method_id IS DISTINCT FROM old.payment_method_id)`. O
-- trigger de INSERT continua inalterado (`WHEN (new.account_id IS NULL)`) —
-- em INSERT, ausência de account_id no payload já produz NULL de fato, sem
-- esse gap. Trade-off documentado: se um client futuro enviar EXPLICITAMENTE
-- account_id + payment_method_id divergentes no mesmo PATCH (cenário não
-- observado em nenhum caller real hoje), o account_id explícito é
-- sobrescrito pelo resolvido — mesma prioridade dada por ADR-016 Decisão 3 à
-- consistência payment_method_id -> account_id sobre um valor client
-- potencialmente inconsistente; nenhum caller de Fase 2 muda payment_method_id
-- via UPDATE de uma transaction já gerada (só o formulário unificado o faz).
--
-- Achado M-2 (menor, cobertura): nenhum caso de teste original exercitava
-- BEFORE UPDATE, apesar do AC citar PATCH explicitamente — corrigido com o
-- CASO 8 novo em be_ref_04_transactions_default_account.test.sql (cobre
-- exatamente o cenário do M-1).
--
-- Achado M-3 (menor): o ramo credit_card sem nenhuma conta ativa do usuário
-- deixava new.account_id NULL e estourava a violação de NOT NULL da coluna
-- sem contexto — mesma classe de erro que o próprio AC pedia para evitar.
-- Corrigido com checagem explícita + exceção clara (errcode 23514 -> 400)
-- quando a busca não encontra nenhuma conta ativa.
--
-- Achado adicional (observação da revisão de frontend/FE-REF-04, mesma
-- rodada): transactions_block_inactive_account (RN-08) só existe como BEFORE
-- INSERT (baseline_legacy.sql:1405), nunca BEFORE UPDATE — lacuna
-- pré-existente do schema legado. O fix-loop M-1 tornou essa lacuna mais
-- alcançável na prática (editar payment_method_id agora pode mudar
-- account_id, inclusive para uma conta inativa, sem bloqueio de RN-08).
-- Decisão de escopo tomada aqui: em vez de expandir o trigger legado para
-- todo UPDATE de transactions (mudaria o comportamento de QUALQUER PATCH,
-- inclusive os que não tocam payment_method_id/account_id — ex. "marcar como
-- paga" de uma conta fixa vinculada a uma conta desde então inativada,
-- fluxo hoje permitido e fora do escopo desta tarefa), a função desta
-- migration passou a checar ela mesma se a conta RESOLVIDA está ativa
-- (INSERT e UPDATE), fechando a lacuna especificamente no caminho que este
-- trigger controla. A lacuna mais ampla (block_inactive_account nunca rodar
-- em UPDATE para os demais casos) permanece registrada como débito técnico
-- não-bloqueante em BLOCKERS.md Bloqueio 020, fora do escopo de BE-REF-04.

create function public.transactions_default_account_from_payment_method()
returns trigger
language plpgsql
as $$
declare
  v_pm_account_id  uuid;
  v_pm_type        public.payment_method_type;
  v_resolved_active boolean;
begin
  if new.kind = 'transfer' or new.payment_method_id is null then
    return new;
  end if;

  select account_id, type
  into v_pm_account_id, v_pm_type
  from public.payment_methods
  where id = new.payment_method_id and user_id = auth.uid();

  if not found then
    raise exception 'payment_method_id % does not belong to the authenticated user (or does not exist)', new.payment_method_id
      using errcode = '23514'; -- check_violation -> PostgREST mapeia para 400
  end if;

  if v_pm_type = 'credit_card' then
    -- Opção D (ADR-016 Decisão 3, item 4) — nenhuma conta vinculada a
    -- credit_card_id hoje; preserva o comportamento já observado (conta ativa
    -- mais antiga do usuário debita/credita a compra de cartão).
    select id into new.account_id
    from public.accounts
    where user_id = auth.uid() and is_active = true
    order by created_at asc
    limit 1;

    if new.account_id is null then
      -- Achado M-3 (fix-loop) — sem isto, a violação de NOT NULL de
      -- transactions.account_id estouraria sem contexto (mesma classe de
      -- erro que este trigger existe para evitar).
      raise exception 'user % has no active account to resolve account_id for a credit_card transaction (payment_method_id %)', auth.uid(), new.payment_method_id
        using errcode = '23514'; -- check_violation -> PostgREST mapeia para 400
    end if;
  else
    new.account_id := v_pm_account_id;
  end if;

  -- Achado adicional (fix-loop, apontado pela revisão de frontend/FE-REF-04):
  -- transactions_block_inactive_account (RN-08) só existe como BEFORE INSERT
  -- (baseline_legacy.sql:1405, lacuna pré-existente do schema legado, nunca
  -- BEFORE UPDATE — fora do escopo desta migration corrigir de forma geral,
  -- ver BLOCKERS.md). O fix-loop M-1 acima passou a permitir que ESTE trigger
  -- escreva account_id também em UPDATE (quando payment_method_id muda) — sem
  -- esta checagem própria, editar só payment_method_id poderia mover o
  -- lançamento para uma conta inativa sem nenhum bloqueio (nem em INSERT nem
  -- em UPDATE, já que block_inactive_account não roda em UPDATE de jeito
  -- nenhum). Fecha essa lacuna especificamente para o caminho que este
  -- trigger controla (INSERT e UPDATE), sem expandir o trigger legado
  -- (decisão de escopo — não altera comportamento de nenhum outro PATCH que
  -- não toque payment_method_id/account_id).
  select is_active into v_resolved_active from public.accounts where id = new.account_id;
  if v_resolved_active is false then
    raise exception 'resolved account % is inactive and cannot receive new transactions (RN-08)', new.account_id
      using errcode = '23514'; -- check_violation -> PostgREST mapeia para 400
  end if;

  return new;
end;
$$;

comment on function public.transactions_default_account_from_payment_method() is
  'ADR-016 Decisão 3 / RN-16 / DIR-36 (BE-REF-04) — resolve transactions.account_id '
  'a partir de payment_method_id quando o client o omite (NEW.account_id IS NULL). '
  'Forma não-cartão: account_id vinculado (payment_methods.account_id). Cartão de '
  'crédito: conta ativa mais antiga do usuário (Opção D — nenhuma conta vinculada '
  'a credit_card_id hoje, preserva o comportamento já observado). Checagem própria '
  'de ownership de payment_method_id (AND user_id = auth.uid()), independente de '
  'RLS. kind=transfer ou payment_method_id NULL: não atua, account_id continua '
  'obrigatório e explícito. Trigger de UPDATE (fix-loop M-1) também dispara '
  'quando payment_method_id muda, não só quando account_id é NULL — PostgREST '
  'preserva OLD.account_id em PATCH que omite a coluna, então só WHEN '
  '(account_id IS NULL) nunca disparava ao editar a forma de pagamento. '
  'Checa também se a conta RESOLVIDA está ativa (RN-08), já que '
  'transactions_block_inactive_account nunca roda em UPDATE (lacuna '
  'pré-existente do schema legado, BLOCKERS.md Bloqueio 020).';

create trigger transactions_before_insert_account_from_payment_method
  before insert on public.transactions
  for each row
  when (new.account_id is null)
  execute function public.transactions_default_account_from_payment_method();

create trigger transactions_before_update_account_from_payment_method
  before update on public.transactions
  for each row
  when (new.account_id is null or new.payment_method_id is distinct from old.payment_method_id)
  execute function public.transactions_default_account_from_payment_method();
