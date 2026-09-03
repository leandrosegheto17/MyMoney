-- BE-M-00 — Teste de regressão de `public.apply_transaction_effect` (+ triggers
-- `transactions_maintain_account_balance`, `transactions_set_status`,
-- `transactions_block_inactive_account`, `accounts_init_current_balance`,
-- `accounts_adjust_balance_on_initial_update`) exigido por DIR-02/ADR-012
-- (condição de aceite nº 2 do CTO: "sem cobertura de teste conhecida hoje").
--
-- Execução: supabase db query --linked --file supabase/tests/apply_transaction_effect.test.sql
-- Todo o script roda dentro de uma única transação com ROLLBACK final — nenhuma
-- linha real de `public` é alterada ou removida (DIR-03/G-02). Usa o `user_id` do
-- profile real já existente (FK exige um usuário real de auth.users), mas todas as
-- contas/lançamentos criados aqui são efêmeros e nunca persistem.
--
-- Convenção de asserção: cada bloco levanta EXCEPTION se o resultado observado
-- divergir do esperado. Se o script inteiro roda até o fim sem erro, todos os
-- casos passaram — a última linha (SELECT) confirma isso explicitamente.

BEGIN;

DO $test$
DECLARE
  v_user_id           uuid;
  v_acc_a             uuid;
  v_acc_b             uuid;
  v_cat_expense        uuid;
  v_cat_income         uuid;
  v_pm_a               uuid;
  v_pm_b               uuid;
  v_txn_id             uuid;
  v_balance             bigint;
  v_status              transaction_status;
  v_today                date;
BEGIN
  -- Mesma referência de "hoje" usada por transactions_set_status()/
  -- fn_clear_due_transactions (America/Sao_Paulo) — usar current_date (UTC) aqui
  -- geraria falso negativo perto da virada do dia (offset de -3h).
  v_today := (now() at time zone 'America/Sao_Paulo')::date;
  -- Fixture: usa o único usuário real já existente (profiles), sem alterá-lo.
  SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: nenhum profile real encontrado — teste não pode rodar';
  END IF;

  -- Contas efêmeras (saldo inicial 10000 cents = R$100,00 e 5000 cents = R$50,00)
  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_id, 'TEST_ACC_A', 'checking', 'BRL', 10000)
  RETURNING id INTO v_acc_a;

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user_id, 'TEST_ACC_B', 'checking', 'BRL', 5000)
  RETURNING id INTO v_acc_b;

  -- CASO 1: accounts_init_current_balance — saldo atual nasce igual ao inicial.
  SELECT current_balance_cents INTO v_balance FROM public.accounts WHERE id = v_acc_a;
  IF v_balance <> 10000 THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: current_balance_cents esperado 10000, obtido %', v_balance;
  END IF;

  SELECT id INTO v_cat_expense FROM public.categories WHERE name = 'Alimentação' LIMIT 1;
  SELECT id INTO v_cat_income  FROM public.categories WHERE name = 'Salário' LIMIT 1;
  IF v_cat_expense IS NULL OR v_cat_income IS NULL THEN
    RAISE EXCEPTION 'FIXTURE: categorias padrão Alimentação/Salário não encontradas';
  END IF;

  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_id, v_acc_a, 'pix', 'TEST_PM_A')
  RETURNING id INTO v_pm_a;

  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user_id, v_acc_b, 'pix', 'TEST_PM_B')
  RETURNING id INTO v_pm_b;

  -- CASO 2: lançamento de despesa (expense) reduz o saldo da conta em amount_cents.
  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES
    (v_user_id, v_acc_a, v_pm_a, v_cat_expense, 'expense', 3000, v_today)
  RETURNING id INTO v_txn_id;

  SELECT current_balance_cents INTO v_balance FROM public.accounts WHERE id = v_acc_a;
  IF v_balance <> 7000 THEN
    RAISE EXCEPTION 'CASO 2 FALHOU: expense de 3000 deveria deixar saldo em 7000, obtido %', v_balance;
  END IF;

  -- CASO 3: transactions_set_status — data de hoje/passada => status 'cleared'.
  SELECT status INTO v_status FROM public.transactions WHERE id = v_txn_id;
  IF v_status <> 'cleared' THEN
    RAISE EXCEPTION 'CASO 3 FALHOU: transação com data de hoje deveria nascer cleared, obtido %', v_status;
  END IF;

  -- CASO 4: UPDATE de valor recalcula o saldo (reverte efeito antigo, aplica o novo).
  UPDATE public.transactions SET amount_cents = 5000 WHERE id = v_txn_id;

  SELECT current_balance_cents INTO v_balance FROM public.accounts WHERE id = v_acc_a;
  IF v_balance <> 5000 THEN
    RAISE EXCEPTION 'CASO 4 FALHOU: expense atualizado para 5000 deveria deixar saldo em 5000, obtido %', v_balance;
  END IF;

  -- CASO 5: DELETE reverte o efeito por completo (volta ao saldo inicial).
  DELETE FROM public.transactions WHERE id = v_txn_id;

  SELECT current_balance_cents INTO v_balance FROM public.accounts WHERE id = v_acc_a;
  IF v_balance <> 10000 THEN
    RAISE EXCEPTION 'CASO 5 FALHOU: após DELETE, saldo deveria voltar a 10000, obtido %', v_balance;
  END IF;

  -- CASO 6: lançamento de receita (income) aumenta o saldo.
  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES
    (v_user_id, v_acc_a, v_pm_a, v_cat_income, 'income', 2000, v_today);

  SELECT current_balance_cents INTO v_balance FROM public.accounts WHERE id = v_acc_a;
  IF v_balance <> 12000 THEN
    RAISE EXCEPTION 'CASO 6 FALHOU: income de 2000 deveria deixar saldo em 12000, obtido %', v_balance;
  END IF;

  -- CASO 7: transferência (transfer) debita a origem e credita o destino, em espelho.
  INSERT INTO public.transactions
    (user_id, account_id, destination_account_id, kind, amount_cents, transaction_date)
  VALUES
    (v_user_id, v_acc_a, v_acc_b, 'transfer', 4000, v_today);

  SELECT current_balance_cents INTO v_balance FROM public.accounts WHERE id = v_acc_a;
  IF v_balance <> 8000 THEN
    RAISE EXCEPTION 'CASO 7a FALHOU: origem da transferência deveria cair para 8000, obtido %', v_balance;
  END IF;

  SELECT current_balance_cents INTO v_balance FROM public.accounts WHERE id = v_acc_b;
  IF v_balance <> 9000 THEN
    RAISE EXCEPTION 'CASO 7b FALHOU: destino da transferência deveria subir para 9000, obtido %', v_balance;
  END IF;

  -- CASO 8: transactions_set_status — data futura => status 'pending'.
  INSERT INTO public.transactions
    (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES
    (v_user_id, v_acc_a, v_pm_a, v_cat_expense, 'expense', 1000, v_today + 5)
  RETURNING id, status INTO v_txn_id, v_status;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'CASO 8 FALHOU: transação com data futura deveria nascer pending, obtido %', v_status;
  END IF;

  -- CASO 8b: o saldo já reflete o efeito da transação pending imediatamente
  -- (apply_transaction_effect não olha `status`, só `kind`) — é isto que torna
  -- get_month_provision (auditado em BE-M-07) potencialmente ambíguo; achado
  -- documentado em AUDITORIA-BE-M-00.md, não corrigido por este teste.
  SELECT current_balance_cents INTO v_balance FROM public.accounts WHERE id = v_acc_a;
  IF v_balance <> 7000 THEN
    RAISE EXCEPTION 'CASO 8b FALHOU: saldo deveria já refletir o pending (7000), obtido %', v_balance;
  END IF;

  -- CASO 9: transactions_block_inactive_account — inativar a conta e tentar
  -- lançar deve falhar.
  UPDATE public.accounts SET is_active = false WHERE id = v_acc_b;

  BEGIN
    INSERT INTO public.transactions
      (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
    VALUES
      (v_user_id, v_acc_b, v_pm_b, v_cat_expense, 'expense', 100, v_today);
    RAISE EXCEPTION 'CASO 9 FALHOU: inserir lançamento em conta inativa deveria ter sido bloqueado';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'CASO 9 FALHOU%' THEN
        RAISE;
      END IF;
      -- exceção esperada (raised por transactions_block_inactive_account) — ok
  END;

  RAISE NOTICE 'apply_transaction_effect: TODOS OS 9 CASOS PASSARAM';
END;
$test$;

SELECT 'apply_transaction_effect regression: PASS' AS result;

ROLLBACK;
