-- BE-M-14 — Regressão de `SEC-DEBT-008` (`SECURITY-REVIEW.md` Seção 1.12;
-- `BLOCKERS.md` Bloqueio 015): confirma que `ALTER COLUMN user_id SET DEFAULT
-- auth.uid()` (20260903260000_be_m14_user_id_default_auth_uid.sql) resolve, na
-- própria camada de banco, a ausência de `user_id` no payload de `.insert()` do
-- Frontend — sem depender de `withOwnerId` (defesa em profundidade complementar,
-- Frontend) já ter sido aplicada em todo módulo de API.
--
-- Cobre 3 tabelas representativas (`categories`, `transactions`, `accounts` —
-- pedido explícito do orquestrador), via RLS real (`SET LOCAL ROLE authenticated`
-- + `request.jwt.claims`, mesmo padrão de BE-M-03/04/05/BE-M-11), não como
-- owner/postgres (que ignora RLS e não exerceria o DEFAULT do mesmo jeito que
-- PostgREST exerceria em produção — toda sessão real chega como `authenticated`).
--
-- Execução: supabase db query --linked --file supabase/tests/be_m14_user_id_default_auth_uid.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_a   uuid;
  v_user_b   uuid := gen_random_uuid(); -- nunca existe em auth.users, de propósito
  v_acc_a    uuid;
  v_pm_a     uuid;
  v_cat_id   uuid;
  v_txn_id   uuid;
  v_acc_id   uuid;
  v_got_user uuid;
  v_blocked  boolean;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  -- Fixtures de apoio (como postgres, ignora RLS) — conta/forma de pagamento de A
  -- para satisfazer FK de transactions.
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_M14_FIXTURE', 'checking', 'BRL', 1000)
  RETURNING id INTO v_acc_a;

  SELECT id INTO v_pm_a FROM public.payment_methods
  WHERE user_id = v_user_a AND account_id = v_acc_a AND is_system_default = true
  LIMIT 1;

  -- ===================== Assume identidade real de A (RLS real, MFA ok) =====================

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'app_email_mfa_verified', 'true')::text,
    true);

  -- CASO 1 (categories) — RED→GREEN: INSERT sem user_id na lista de colunas
  -- (exatamente o payload que `frontend/src/lib/api/categories.ts` envia quando
  -- `withOwnerId` não é usado / antes da correção Frontend complementar) agora é
  -- aceito e resolve user_id = auth.uid() via DEFAULT (BE-M-14), não mais rejeitado
  -- por RLS (42501 pré-correção, já que user_id NULL != auth.uid()).
  INSERT INTO public.categories (name, kind, is_system_default)
  VALUES ('TEST_CAT_M14_NO_USERID', 'expense', false)
  RETURNING id, user_id INTO v_cat_id, v_got_user;

  IF v_got_user IS DISTINCT FROM v_user_a THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 1 FALHOU (categories): DEFAULT auth.uid() não preencheu user_id corretamente (esperado %, obtido %)', v_user_a, v_got_user;
  END IF;

  -- CASO 2 (transactions) — mesma confirmação RED→GREEN, tabela com user_id NOT NULL
  -- (pré-correção falharia com 23502, não só 42501).
  INSERT INTO public.transactions (account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_acc_a, v_pm_a, v_cat_id, 'expense', 500, current_date)
  RETURNING id, user_id INTO v_txn_id, v_got_user;

  IF v_got_user IS DISTINCT FROM v_user_a THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 2 FALHOU (transactions): DEFAULT auth.uid() não preencheu user_id corretamente (esperado %, obtido %)', v_user_a, v_got_user;
  END IF;

  -- CASO 3 (accounts) — mesma confirmação RED→GREEN.
  INSERT INTO public.accounts (name, type, currency, initial_balance_cents)
  VALUES ('TEST_ACC_M14_NO_USERID', 'checking', 'BRL', 100)
  RETURNING id, user_id INTO v_acc_id, v_got_user;

  IF v_got_user IS DISTINCT FROM v_user_a THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 3 FALHOU (accounts): DEFAULT auth.uid() não preencheu user_id corretamente (esperado %, obtido %)', v_user_a, v_got_user;
  END IF;

  -- CASO 4 (defesa não enfraquecida, categories) — se o payload enviar user_id de
  -- OUTRO usuário explicitamente, o DEFAULT nem entra em jogo (só se aplica quando
  -- a coluna é omitida) e a RLS continua rejeitando exatamente como antes de BE-M-14.
  v_blocked := false;
  BEGIN
    INSERT INTO public.categories (user_id, name, kind, is_system_default)
    VALUES (v_user_b, 'TEST_CAT_M14_SPOOF', 'expense', false);
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 4 FALHOU (categories): INSERT com user_id explícito de outro usuário deveria ser rejeitado pela RLS (defesa não pode ter sido enfraquecida por BE-M-14)';
  END IF;

  -- CASO 5 (defesa não enfraquecida, accounts, NOT NULL) — mesma checagem.
  v_blocked := false;
  BEGIN
    INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
    VALUES (v_user_b, 'TEST_ACC_M14_SPOOF', 'checking', 'BRL', 100);
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
    v_blocked := true;
  END;
  IF NOT v_blocked THEN
    RESET ROLE;
    RAISE EXCEPTION 'CASO 5 FALHOU (accounts): INSERT com user_id explícito de outro usuário deveria ser rejeitado pela RLS';
  END IF;

  RESET ROLE;

  RAISE NOTICE 'BE-M-14 (DEFAULT auth.uid(), RED->GREEN + defesa não enfraquecida): TODOS OS 5 CASOS PASSARAM';
END;
$test$;

SELECT 'BE-M-14 user_id DEFAULT auth.uid() (SEC-DEBT-008/Bloqueio 015): PASS' AS result;

ROLLBACK;
