-- BE-M-11 — Suíte de testes de RLS (ownership), SDD Seção 7 (Autorização).
-- Para TODA tabela de `public` associada a este produto, confirma que um
-- usuário B (simulado via JWT, nunca inserido em auth.users — não precisa
-- existir de fato para o teste de isolamento ser válido) nunca lê nem escreve
-- dado pertencente ao usuário A real (`profiles` já existente).
--
-- Tabelas cobertas (9): accounts, categories, payment_methods, transactions,
-- budget, profiles, webauthn_credentials (ownership `auth.uid() = user_id`,
-- as 4 primeiras + accounts/transactions/budget também com gate de MFA,
-- DIR-27) e email_mfa_challenges/webauthn_challenges (sem nenhuma policy para
-- `authenticated` — deny-all por padrão, service_role only).
--
-- Padrão: `SET LOCAL ROLE authenticated` + `request.jwt.claims` simulado
-- (mesmo padrão já usado em BE-M-04/BE-M-08, RLS real, não como
-- owner/postgres que ignora RLS).
--
-- Execução: supabase db query --linked --file supabase/tests/be_m11_rls_cross_user.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_a   uuid;
  v_user_b   uuid := gen_random_uuid(); -- nunca existe em auth.users, de propósito
  v_acc      uuid;
  v_cat      uuid;
  v_pm       uuid;
  v_txn      uuid;
  v_budget   uuid;
  v_cred     uuid;
  v_mfa_chal uuid;
  v_wa_chal  uuid;
BEGIN
  SELECT id INTO v_user_a FROM public.profiles LIMIT 1;
  IF v_user_a IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  -- ===================== Fixtures de A (como postgres, ignora RLS) =====================

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_a, 'TEST_ACC_M11', 'checking', 'BRL', 1000)
  RETURNING id INTO v_acc;

  INSERT INTO public.categories (user_id, name, kind, is_system_default)
  VALUES (v_user_a, 'TEST_CAT_M11', 'expense', false)
  RETURNING id INTO v_cat;

  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_a, v_acc, 'pix', 'TEST_PM_M11')
  RETURNING id INTO v_pm;

  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user_a, v_acc, v_pm, v_cat, 'expense', 500, current_date)
  RETURNING id INTO v_txn;

  INSERT INTO public.budget (user_id, category_id, month, limit_cents)
  VALUES (v_user_a, v_cat, date_trunc('month', current_date)::date, 10000)
  RETURNING id INTO v_budget;

  INSERT INTO public.webauthn_credentials (user_id, credential_id, public_key, sign_count)
  VALUES (v_user_a, 'TEST_CRED_M11', decode('00112233', 'hex'), 0)
  RETURNING id INTO v_cred;

  INSERT INTO public.email_mfa_challenges (user_id, session_id, code_hash, expires_at)
  VALUES (v_user_a, gen_random_uuid(), 'TEST_HASH_M11', now() + interval '10 minutes')
  RETURNING id INTO v_mfa_chal;

  INSERT INTO public.webauthn_challenges (user_id, challenge, ceremony_type, expires_at)
  VALUES (v_user_a, 'TEST_CHALLENGE_M11', 'registration', now() + interval '5 minutes')
  RETURNING id INTO v_wa_chal;

  -- ===================== Assume identidade de B (RLS real) =====================

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user_b::text, 'app_email_mfa_verified', 'true')::text,
    true);

  -- CASO 1 (accounts): B não lê nem escreve conta de A.
  PERFORM 1 FROM public.accounts WHERE id = v_acc;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 1 FALHOU (accounts): B conseguiu SELECT em conta de A';
  END IF;
  UPDATE public.accounts SET name = 'HACKED_BY_B' WHERE id = v_acc;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 1 FALHOU (accounts): B conseguiu UPDATE em conta de A';
  END IF;
  DELETE FROM public.accounts WHERE id = v_acc;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 1 FALHOU (accounts): B conseguiu DELETE em conta de A';
  END IF;

  -- CASO 2 (categories): B não lê nem escreve categoria CUSTOM de A
  -- (categorias de sistema, user_id IS NULL, continuam visíveis — não é leak).
  PERFORM 1 FROM public.categories WHERE id = v_cat;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 2 FALHOU (categories): B conseguiu SELECT em categoria custom de A';
  END IF;
  UPDATE public.categories SET name = 'HACKED_BY_B' WHERE id = v_cat;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 2 FALHOU (categories): B conseguiu UPDATE em categoria de A';
  END IF;
  DELETE FROM public.categories WHERE id = v_cat;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 2 FALHOU (categories): B conseguiu DELETE em categoria de A';
  END IF;

  -- CASO 3 (payment_methods): B não lê nem escreve forma de pagamento de A.
  PERFORM 1 FROM public.payment_methods WHERE id = v_pm;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 3 FALHOU (payment_methods): B conseguiu SELECT em forma de A';
  END IF;
  UPDATE public.payment_methods SET name = 'HACKED_BY_B' WHERE id = v_pm;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 3 FALHOU (payment_methods): B conseguiu UPDATE em forma de A';
  END IF;
  DELETE FROM public.payment_methods WHERE id = v_pm;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 3 FALHOU (payment_methods): B conseguiu DELETE em forma de A';
  END IF;

  -- CASO 4 (transactions): B não lê nem escreve lançamento de A.
  PERFORM 1 FROM public.transactions WHERE id = v_txn;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 4 FALHOU (transactions): B conseguiu SELECT em lançamento de A';
  END IF;
  UPDATE public.transactions SET amount_cents = 999999 WHERE id = v_txn;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 4 FALHOU (transactions): B conseguiu UPDATE em lançamento de A';
  END IF;
  DELETE FROM public.transactions WHERE id = v_txn;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 4 FALHOU (transactions): B conseguiu DELETE em lançamento de A';
  END IF;

  -- CASO 5 (budget): B não lê nem escreve orçamento de A.
  PERFORM 1 FROM public.budget WHERE id = v_budget;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 5 FALHOU (budget): B conseguiu SELECT em orçamento de A';
  END IF;
  UPDATE public.budget SET limit_cents = 1 WHERE id = v_budget;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 5 FALHOU (budget): B conseguiu UPDATE em orçamento de A';
  END IF;
  DELETE FROM public.budget WHERE id = v_budget;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 5 FALHOU (budget): B conseguiu DELETE em orçamento de A';
  END IF;

  -- CASO 6 (profiles): B não lê nem escreve o profile de A (sem policy de
  -- INSERT/DELETE via API — só SELECT/UPDATE são testáveis via RLS de cliente).
  PERFORM 1 FROM public.profiles WHERE id = v_user_a;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 6 FALHOU (profiles): B conseguiu SELECT no profile de A';
  END IF;
  UPDATE public.profiles SET full_name = 'HACKED_BY_B' WHERE id = v_user_a;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 6 FALHOU (profiles): B conseguiu UPDATE no profile de A';
  END IF;

  -- CASO 7 (webauthn_credentials): B não lê nem apaga a credencial de A.
  PERFORM 1 FROM public.webauthn_credentials WHERE id = v_cred;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 7 FALHOU (webauthn_credentials): B conseguiu SELECT na credencial de A';
  END IF;
  DELETE FROM public.webauthn_credentials WHERE id = v_cred;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 7 FALHOU (webauthn_credentials): B conseguiu DELETE na credencial de A';
  END IF;

  -- CASO 8 (email_mfa_challenges): deny-all para `authenticated` (sem policy
  -- nenhuma) — nem o próprio dono (A) alcançaria via API, muito menos B.
  PERFORM 1 FROM public.email_mfa_challenges WHERE id = v_mfa_chal;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 8 FALHOU (email_mfa_challenges): SELECT via authenticated deveria ser negado (sem policy)';
  END IF;
  DELETE FROM public.email_mfa_challenges WHERE id = v_mfa_chal;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 8 FALHOU (email_mfa_challenges): DELETE via authenticated deveria ser negado (sem policy)';
  END IF;

  -- CASO 9 (webauthn_challenges): mesmo padrão deny-all (reforça o teste
  -- dedicado de BE-M-09, agora dentro da suíte consolidada de BE-M-11).
  PERFORM 1 FROM public.webauthn_challenges WHERE id = v_wa_chal;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 9 FALHOU (webauthn_challenges): SELECT via authenticated deveria ser negado (sem policy)';
  END IF;
  DELETE FROM public.webauthn_challenges WHERE id = v_wa_chal;
  IF FOUND THEN
    RESET ROLE; RAISE EXCEPTION 'CASO 9 FALHOU (webauthn_challenges): DELETE via authenticated deveria ser negado (sem policy)';
  END IF;

  RESET ROLE;

  -- ===================== Confirma que os dados de A continuam intactos =====================
  -- (postgres, ignora RLS — só valida que nenhum DELETE/UPDATE acima "vazou").

  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = v_acc AND name = 'TEST_ACC_M11') THEN
    RAISE EXCEPTION 'RESÍDUO: conta de A foi alterada/apagada apesar dos blocos acima terem passado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.transactions WHERE id = v_txn AND amount_cents = 500) THEN
    RAISE EXCEPTION 'RESÍDUO: lançamento de A foi alterado/apagado apesar dos blocos acima terem passado';
  END IF;

  RAISE NOTICE 'BE-M-11 (RLS ownership, 9 tabelas): TODOS OS 9 CASOS PASSARAM';
END;
$test$;

SELECT 'BE-M-11 RLS cross-user (9 tabelas): PASS' AS result;

ROLLBACK;
