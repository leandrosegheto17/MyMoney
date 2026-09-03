-- BE-M-06 — Confirma que `fn_clear_due_transactions` (pg_cron */15) transiciona
-- corretamente pending → cleared quando a data de vencimento chega (achado de
-- auditoria: a citação de "RN-11" no TASK.md/ADR-012 estava incorreta — a regra
-- real não tem número RN-NN próprio no MVP; ver AUDITORIA-BE-M-00.md Seção 5).
--
-- Execução: supabase db query --linked --file supabase/tests/be_m06_transactions.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user_id   uuid;
  v_acc       uuid;
  v_pm        uuid;
  v_cat       uuid;
  v_txn_id    uuid;
  v_status    transaction_status;
BEGIN
  SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_id, 'TEST_ACC_M06', 'checking', 'BRL', 1000)
  RETURNING id INTO v_acc;

  SELECT id INTO v_pm FROM public.payment_methods WHERE user_id = v_user_id AND is_system_default AND type = 'pix' LIMIT 1;
  SELECT id INTO v_cat FROM public.categories WHERE name = 'Moradia' LIMIT 1;

  -- Simula um lançamento que nasceu 'pending' (data futura na época da inserção)
  -- e cuja data de vencimento já passou (sem o cron ter rodado ainda) — via
  -- INSERT com data futura seguido de UPDATE forçando o status de volta a
  -- 'pending' com data já vencida (o trigger BEFORE INSERT não se aplica a
  -- UPDATE, então isto reproduz fielmente o estado que fn_clear_due_transactions
  -- deve corrigir).
  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES
    (v_user_id, v_acc, v_pm, v_cat, 'expense', 200, (now() at time zone 'America/Sao_Paulo')::date + 10)
  RETURNING id INTO v_txn_id;

  UPDATE public.transactions
  SET status = 'pending', transaction_date = (now() at time zone 'America/Sao_Paulo')::date - 3
  WHERE id = v_txn_id;

  SELECT status INTO v_status FROM public.transactions WHERE id = v_txn_id;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'FIXTURE FALHOU: transação deveria estar pending antes do cron rodar, obtido %', v_status;
  END IF;

  PERFORM public.fn_clear_due_transactions();

  SELECT status INTO v_status FROM public.transactions WHERE id = v_txn_id;
  IF v_status <> 'cleared' THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: fn_clear_due_transactions deveria ter transicionado pending (vencida) -> cleared, obtido %', v_status;
  END IF;

  -- CASO 2: transação pending com data ainda futura NÃO é afetada pelo cron.
  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES
    (v_user_id, v_acc, v_pm, v_cat, 'expense', 200, (now() at time zone 'America/Sao_Paulo')::date + 10)
  RETURNING id INTO v_txn_id;

  PERFORM public.fn_clear_due_transactions();

  SELECT status INTO v_status FROM public.transactions WHERE id = v_txn_id;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'CASO 2 FALHOU: transação com vencimento futuro não deveria ter sido alterada pelo cron, obtido %', v_status;
  END IF;

  RAISE NOTICE 'BE-M-06 (fn_clear_due_transactions): TODOS OS 2 CASOS PASSARAM';
END;
$test$;

SELECT 'BE-M-06 fn_clear_due_transactions: PASS' AS result;

ROLLBACK;
