-- BE-REF-05 — Backfill de formas de pagamento para contas ativas pré-existentes.
-- Prova:
--
--   (1) conta ativa pré-existente (simulada via fixture, "criada" ANTES do
--       INSERT...SELECT do backfill rodar de novo dentro desta transação de
--       teste) SEM suas 4 formas próprias recebe as 4 linhas faltantes;
--   (2) conta que já tinha as 4 (ex.: a mais antiga do usuário, ou qualquer
--       conta seedada pelo trigger de BE-REF-03) não é duplicada;
--   (3) idempotência: rodar a MESMA instrução de backfill 2x não duplica
--       nenhuma linha (RE-EXECUTA o INSERT...SELECT literal da migration).
--
-- Este teste reexecuta a instrução INSERT...SELECT da migration diretamente
-- (não só chama uma função), porque BE-REF-05 é uma migration de dado, sem
-- função/trigger associado — mesmo padrão de "prova estrutural" já usado em
-- be_f2_10 (GROUP BY) quando não há uma função isolada para chamar.
--
-- Execução: supabase db query --linked --file supabase/tests/be_ref_05_payment_methods_backfill.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_id     uuid := gen_random_uuid();
  v_acc_oldest  uuid;
  v_acc_gap     uuid;
  v_count_gap   integer;
  v_count_total integer;
BEGIN
  -- Usuário sintético isolado (não o profile real) — controle total sobre o
  -- conjunto de contas, sem depender/poluir dado real de produção.
  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-ref05@example.com', 'BE-REF-05 — usuário fixture, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user_id, 'test-ref05@example.com');

  -- 1ª conta (mais antiga) — já semeada pelo trigger de BE-REF-03, tem as 4.
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_id, 'TEST_ACC_REF05_OLDEST', 'checking', 'BRL', 1000)
  RETURNING id INTO v_acc_oldest;

  -- 2ª conta, "com o gap" — simula uma conta pré-existente que nunca recebeu
  -- seed (estado real encontrado em produção antes desta migration): remove as
  -- 4 linhas que o trigger de BE-REF-03 já teria criado, para reproduzir
  -- fielmente o estado que o backfill precisa corrigir.
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_id, 'TEST_ACC_REF05_GAP', 'savings', 'BRL', 1000)
  RETURNING id INTO v_acc_gap;

  DELETE FROM public.payment_methods WHERE account_id = v_acc_gap;

  SELECT count(*) INTO v_count_gap FROM public.payment_methods WHERE account_id = v_acc_gap;
  IF v_count_gap <> 0 THEN
    RAISE EXCEPTION 'FIXTURE: conta TEST_ACC_REF05_GAP deveria estar sem nenhuma forma de pagamento antes do backfill, obtido %', v_count_gap;
  END IF;

  -- ===================== Reexecuta o backfill (mesma instrução da migration) =====================
  INSERT INTO public.payment_methods (user_id, account_id, type, name, is_system_default)
  SELECT a.user_id, a.id, v.type, v.name, true
  FROM public.accounts a
  CROSS JOIN (
    VALUES
      ('pix'::public.payment_method_type,       'Pix'),
      ('debit_card'::public.payment_method_type, 'Débito'),
      ('boleto'::public.payment_method_type,     'Boleto'),
      ('cash'::public.payment_method_type,       'Dinheiro')
  ) AS v(type, name)
  WHERE a.is_active = true
    AND a.user_id = v_user_id
    AND a.id <> (
      SELECT a2.id FROM public.accounts a2
      WHERE a2.user_id = a.user_id AND a2.is_active = true
      ORDER BY a2.created_at ASC
      LIMIT 1
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.payment_methods pm
      WHERE pm.account_id = a.id AND pm.type = v.type AND pm.is_system_default = true
    );

  -- CASO 1: conta com gap recebeu as 4 linhas faltantes.
  SELECT count(*) INTO v_count_gap FROM public.payment_methods WHERE account_id = v_acc_gap AND is_system_default = true;
  IF v_count_gap <> 4 THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: backfill deveria ter inserido as 4 formas faltantes na conta com gap, obtido %', v_count_gap;
  END IF;

  -- CASO 2: 1ª conta (já tinha as 4, via BE-REF-03) não foi duplicada.
  SELECT count(*) INTO v_count_total FROM public.payment_methods WHERE account_id = v_acc_oldest AND is_system_default = true;
  IF v_count_total <> 4 THEN
    RAISE EXCEPTION 'CASO 2 FALHOU: backfill não deveria alterar a conta mais antiga (já semeada), esperado 4, obtido %', v_count_total;
  END IF;

  -- ===================== CASO 3 — idempotência: reexecuta o backfill de novo =====================
  INSERT INTO public.payment_methods (user_id, account_id, type, name, is_system_default)
  SELECT a.user_id, a.id, v.type, v.name, true
  FROM public.accounts a
  CROSS JOIN (
    VALUES
      ('pix'::public.payment_method_type,       'Pix'),
      ('debit_card'::public.payment_method_type, 'Débito'),
      ('boleto'::public.payment_method_type,     'Boleto'),
      ('cash'::public.payment_method_type,       'Dinheiro')
  ) AS v(type, name)
  WHERE a.is_active = true
    AND a.user_id = v_user_id
    AND a.id <> (
      SELECT a2.id FROM public.accounts a2
      WHERE a2.user_id = a.user_id AND a2.is_active = true
      ORDER BY a2.created_at ASC
      LIMIT 1
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.payment_methods pm
      WHERE pm.account_id = a.id AND pm.type = v.type AND pm.is_system_default = true
    );

  SELECT count(*) INTO v_count_gap FROM public.payment_methods WHERE account_id = v_acc_gap AND is_system_default = true;
  IF v_count_gap <> 4 THEN
    RAISE EXCEPTION 'CASO 3 FALHOU: rodar o backfill 2x não deveria duplicar linhas na conta com gap, esperado 4, obtido %', v_count_gap;
  END IF;

  SELECT count(*) INTO v_count_total FROM public.payment_methods WHERE account_id = v_acc_oldest AND is_system_default = true;
  IF v_count_total <> 4 THEN
    RAISE EXCEPTION 'CASO 3b FALHOU: rodar o backfill 2x não deveria duplicar linhas na conta mais antiga, esperado 4, obtido %', v_count_total;
  END IF;

  RAISE NOTICE 'BE-REF-05 (backfill de payment_methods, casos 1-3): TODOS PASSARAM';
END;
$test$;

SELECT 'BE-REF-05 payment_methods backfill: PASS' AS result;

ROLLBACK;
