-- BE-REF-02 — Testes de `public.get_transaction_shortcuts()` (RF-REF-03 AC1,
-- AC2, AC7, AC8; RN-12; RN-13) e da coluna `transactions.created_via_shortcut`
-- (RNF-12). Roda via RLS real (SET LOCAL ROLE authenticated + request.jwt.claims
-- simulado, mesmo padrão de BE-M-07/BE-M-11/BE-M-13) — nunca como owner/postgres,
-- porque a RPC filtra por auth.uid() no próprio corpo (DIR-34).
--
-- Usa um usuário sintético (v_user), inserido de fato em `auth.users` só dentro
-- desta transação (mesmo padrão de BE-M-13: allow-list temporária de BE-M-12 +
-- INSERT direto, desfeitos pelo ROLLBACK final), em vez do usuário real único
-- do produto. Necessário porque o algoritmo de RN-12/RN-13 é sensível à
-- MASSA COMPLETA de lançamentos do usuário (não dá para isolar por categoria
-- só com nomes exclusivos de teste) — rodar as asserções de ranking/fallback/
-- desempate sob o usuário real misturaria os lançamentos de produção já
-- existentes com os fixtures do teste, tornando as asserções de posição/
-- contagem não-determinísticas. Isolamento cross-user (CASO 5) continua
-- usando um segundo usuário nunca inserido em lugar nenhum (mesmo padrão de
-- BE-M-11), que é exatamente o que aquele caso precisa provar.
--
-- Cobertura exigida pelo critério de aceite de BE-REF-02:
--   CASO 1 — ranking simples (frequência desc.) dentro da janela de 90 dias;
--   CASO 2 — fallback de AC7 (menos de 10 subcategorias na janela, completa com
--            o histórico fora da janela);
--   CASO 3 — desempate (i) recência e (ii) ordem alfabética do nome;
--   CASO 4 — resolução de payment_method_id (RN-13), incluindo o caso NULL
--            quando a subcategoria nunca teve lançamento com forma de
--            pagamento associada;
--   CASO 5 — isolamento cross-user (a RPC nunca retorna dado de outro usuário)
--            e AC2 (retorna vazio quando o usuário não tem nenhum lançamento);
--   CASO 6 — corte em exatamente 10 linhas quando a janela já tem >=10
--            subcategorias distintas, com CAT_OLD (fallback) ausente do
--            resultado (achado de revisão: corte/ramo sem fallback nunca
--            exercitados pela fixture original, só 8 categorias). Nota:
--            o predicado "< 10" de cat_history_agg é short-circuit de
--            performance, não a causa semântica da ausência de CAT_OLD aqui
--            — quem garante isso é o ORDER BY grp asc (janela sempre antes
--            de histórico), ver comentário da migration (re-revisão).
--
-- Regressão de mutação (2026-09-04, R1 da re-revisão): CAT_D tem uma 2ª
-- transação com transaction_date futura (v_today + 30) — sem o limite
-- superior "transaction_date <= hoje" nos 4 CTEs de agregação da função
-- (Achado 1 do fix-loop anterior), esse lançamento futuro venceria o
-- desempate de recência do CASO 3a; a asserção já existente lá (v_rn_c <
-- v_rn_d) é quem detecta essa regressão — nenhuma variável/asserção nova.
--
-- Execução: supabase db query --linked --file supabase/tests/be_ref_02_transaction_shortcuts.test.sql
-- BEGIN;...ROLLBACK; — nenhuma linha real alterada.

BEGIN;

DO $test$
DECLARE
  v_user         uuid := gen_random_uuid(); -- usuário sintético, real em auth.users só nesta transação
  v_attacker     uuid := gen_random_uuid(); -- nunca existe em auth.users, de propósito (mesmo padrão de BE-M-11)
  v_acc          uuid;
  v_acc2         uuid; -- só para satisfazer destination_account_id do truque de transfer (CASO 4)
  v_pm_pix       uuid;
  v_pm_debit     uuid;
  v_today        date := (now() at time zone 'America/Sao_Paulo')::date;

  v_cat_a        uuid; -- freq=3 na janela — deve ranquear 1º
  v_cat_b        uuid; -- freq=2 na janela — deve ranquear 2º
  v_cat_c        uuid; -- freq=1, mais recente (desempate recência vence cat_d)
  v_cat_d        uuid; -- freq=1, mais antigo (dentro da janela)
  v_cat_e        uuid; -- "AAA_..." freq=1, mesma data de v_cat_f (desempate alfabético vence cat_f)
  v_cat_f        uuid; -- "ZZZ_..." freq=1, mesma data de v_cat_e
  v_cat_old      uuid; -- só fora da janela (200 dias) — deve entrar via fallback AC7, por último
  v_cat_pmnull   uuid; -- só 1 txn kind=transfer, payment_method_id NULL — RN-13 exceção

  v_cat_g        uuid[]; -- CASO 6 — 12 categorias distintas na janela (sem fallback)
  v_new_cat      uuid;
  i              integer;

  v_cat_ids      uuid[];
  v_pm_ids       uuid[];
  v_cat_ids2     uuid[]; -- CASO 6 — resultado da 2ª chamada da RPC, após inflar a janela para >=10
  v_result_count  integer;
  v_result_count2 integer;
  v_rn_a         integer;
  v_rn_b         integer;
  v_rn_c         integer;
  v_rn_d         integer;
  v_rn_e         integer;
  v_rn_f         integer;
  v_rn_old       integer;
  v_rn_null      integer;
  v_pm_for_a     uuid;
  v_pm_for_old   uuid;
  v_pm_for_null  uuid;
  v_created_via  boolean;
BEGIN
  -- ===================== Fixtures (como postgres, ignora RLS) =====================

  -- Allow-list temporária (BE-M-12) só dentro desta transação, desfeita pelo
  -- ROLLBACK final — nenhum resíduo real (mesmo padrão de BE-M-13).
  INSERT INTO public.allowed_signup_emails (email, note)
  VALUES ('test-ref02@example.com', 'BE-REF-02 — usuário sintético fixture, só dentro desta transação de teste');
  INSERT INTO auth.users (id, email) VALUES (v_user, 'test-ref02@example.com');

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user, 'TEST_ACC_REF02', 'checking', 'BRL', 100000)
  RETURNING id INTO v_acc;

  INSERT INTO public.accounts (user_id, name, type, currency, initial_balance_cents)
  VALUES (v_user, 'TEST_ACC_REF02_DEST', 'checking', 'BRL', 100000)
  RETURNING id INTO v_acc2;

  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user, v_acc, 'pix', 'TEST_PM_REF02_PIX')
  RETURNING id INTO v_pm_pix;

  INSERT INTO public.payment_methods (user_id, account_id, type, name)
  VALUES (v_user, v_acc, 'debit_card', 'TEST_PM_REF02_DEBIT')
  RETURNING id INTO v_pm_debit;

  -- RETURNING em INSERT multi-linha só devolve a última linha em uma variável
  -- escalar — inserindo categoria por categoria para capturar cada id.
  INSERT INTO public.categories (user_id, name, kind, is_system_default) VALUES (v_user, 'TEST_CAT_REF02_A', 'expense', false) RETURNING id INTO v_cat_a;
  INSERT INTO public.categories (user_id, name, kind, is_system_default) VALUES (v_user, 'TEST_CAT_REF02_B', 'expense', false) RETURNING id INTO v_cat_b;
  INSERT INTO public.categories (user_id, name, kind, is_system_default) VALUES (v_user, 'TEST_CAT_REF02_C', 'expense', false) RETURNING id INTO v_cat_c;
  INSERT INTO public.categories (user_id, name, kind, is_system_default) VALUES (v_user, 'TEST_CAT_REF02_D', 'expense', false) RETURNING id INTO v_cat_d;
  INSERT INTO public.categories (user_id, name, kind, is_system_default) VALUES (v_user, 'AAA_TEST_CAT_REF02_E', 'expense', false) RETURNING id INTO v_cat_e;
  INSERT INTO public.categories (user_id, name, kind, is_system_default) VALUES (v_user, 'ZZZ_TEST_CAT_REF02_F', 'expense', false) RETURNING id INTO v_cat_f;
  INSERT INTO public.categories (user_id, name, kind, is_system_default) VALUES (v_user, 'TEST_CAT_REF02_OLD', 'expense', false) RETURNING id INTO v_cat_old;
  INSERT INTO public.categories (user_id, name, kind, is_system_default) VALUES (v_user, 'TEST_CAT_REF02_PMNULL', 'expense', false) RETURNING id INTO v_cat_pmnull;

  -- CAT_A: freq=3 na janela, 2x pix + 1x débito (pix deve vencer no RN-13).
  INSERT INTO public.transactions (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES
    (v_user, v_acc, v_pm_pix,   v_cat_a, 'expense', 1000, v_today),
    (v_user, v_acc, v_pm_pix,   v_cat_a, 'expense', 1000, v_today - 5),
    (v_user, v_acc, v_pm_debit, v_cat_a, 'expense', 1000, v_today - 10);

  -- CAT_B: freq=2 na janela, sempre débito.
  INSERT INTO public.transactions (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES
    (v_user, v_acc, v_pm_debit, v_cat_b, 'expense', 1000, v_today - 1),
    (v_user, v_acc, v_pm_debit, v_cat_b, 'expense', 1000, v_today - 2);

  -- CAT_C: freq=1, mais recente (v_today - 3) — deve vencer CAT_D no desempate por recência.
  INSERT INTO public.transactions (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user, v_acc, v_pm_pix, v_cat_c, 'expense', 1000, v_today - 3);

  -- CAT_D: freq=1, mais antigo (v_today - 40, ainda dentro da janela de 90 dias).
  INSERT INTO public.transactions (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user, v_acc, v_pm_pix, v_cat_d, 'expense', 1000, v_today - 40);

  -- CAT_D: 2ª transação, futura (v_today + 30, status pending — mesmo padrão de
  -- conta fixa/recorrência/parcelamento gerando lançamento com data futura).
  -- Guarda de regressão do Achado 1 (limite superior da janela, fix-loop
  -- 2026-09-04): sem o "transaction_date <= hoje" nos 4 CTEs de agregação da
  -- função, esta linha futura venceria o desempate de recência de CASO 3a
  -- (CAT_D passaria a ter last_date = v_today+30, mais recente que CAT_C em
  -- v_today-3, invertendo o resultado esperado) — prova por mutação já feita
  -- pelo revisor: função sem o fix falha esta mesma asserção de CASO 3a com
  -- "CAT_C deveria vencer CAT_D"; função corrigida (com o limite superior)
  -- continua passando. Nenhuma variável nova, nenhuma asserção nova — a
  -- asserção já existente de CASO 3a (v_rn_c < v_rn_d) é quem protege isto.
  INSERT INTO public.transactions (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user, v_acc, v_pm_pix, v_cat_d, 'expense', 1000, v_today + 30);

  -- CAT_E ("AAA_...") e CAT_F ("ZZZ_..."): freq=1, MESMA data (v_today - 7) —
  -- desempate cai para ordem alfabética do nome, E deve vencer F.
  INSERT INTO public.transactions (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES
    (v_user, v_acc, v_pm_pix, v_cat_e, 'expense', 1000, v_today - 7),
    (v_user, v_acc, v_pm_pix, v_cat_f, 'expense', 1000, v_today - 7);

  -- CAT_OLD: única transação 200 dias atrás (fora da janela de 90 dias) — só
  -- deve aparecer via fallback de histórico completo (AC7), depois de todas as
  -- categorias que têm atividade na janela.
  INSERT INTO public.transactions (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user, v_acc, v_pm_pix, v_cat_old, 'expense', 1000, v_today - 200);

  -- CAT_PMNULL: única transação é kind=transfer com category_id preenchido e
  -- payment_method_id NULL (permitido pelo CHECK transactions_non_transfer_
  -- requires_method_and_category, que só exige payment_method_id/category_id
  -- quando kind != transfer). Único jeito de, dentro do schema real, uma
  -- categoria aparecer no ranking sem NUNCA ter tido lançamento com forma de
  -- pagamento associada (RN-13, exceção) — todo lançamento income/expense
  -- exige payment_method_id NOT NULL pelo mesmo CHECK.
  INSERT INTO public.transactions (user_id, account_id, destination_account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
  VALUES (v_user, v_acc, v_acc2, NULL, v_cat_pmnull, 'transfer', 1000, v_today);

  -- ===================== Assume identidade do usuário sintético (RLS real) =====================

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user::text, 'app_email_mfa_verified', 'true')::text,
    true);

  -- Sem DDL (CREATE TABLE) sob o role authenticated (evita depender de
  -- privilégio de criação de objeto do role RLS) — captura o resultado
  -- ordenado da RPC diretamente em arrays PL/pgSQL via SELECT ... INTO,
  -- mesmo padrão de chamada direta de RPC já usado em BE-M-07.
  SELECT array_agg(category_id ORDER BY ord), array_agg(payment_method_id ORDER BY ord)
  INTO v_cat_ids, v_pm_ids
  FROM (
    SELECT row_number() OVER () AS ord, category_id, payment_method_id
    FROM public.get_transaction_shortcuts()
  ) s;

  RESET ROLE;

  v_result_count := coalesce(array_length(v_cat_ids, 1), 0);
  IF v_result_count > 10 THEN
    RAISE EXCEPTION 'CONTRATO FALHOU: get_transaction_shortcuts() retornou % linhas, esperado no máximo 10', v_result_count;
  END IF;
  IF v_result_count <> 8 THEN
    RAISE EXCEPTION 'FIXTURE/CONTRATO FALHOU: esperado 8 categorias no resultado (A,B,C,D,E,F,OLD,PMNULL), obtido %', v_result_count;
  END IF;

  v_rn_a    := array_position(v_cat_ids, v_cat_a);
  v_rn_b    := array_position(v_cat_ids, v_cat_b);
  v_rn_c    := array_position(v_cat_ids, v_cat_c);
  v_rn_d    := array_position(v_cat_ids, v_cat_d);
  v_rn_e    := array_position(v_cat_ids, v_cat_e);
  v_rn_f    := array_position(v_cat_ids, v_cat_f);
  v_rn_old  := array_position(v_cat_ids, v_cat_old);
  v_rn_null := array_position(v_cat_ids, v_cat_pmnull);

  -- CASO 1 (ranking simples, RN-12): frequência desc. — A (freq 3) antes de B (freq 2).
  IF NOT (v_rn_a < v_rn_b) THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: CAT_A (freq=3, rn=%) deveria ranquear antes de CAT_B (freq=2, rn=%)', v_rn_a, v_rn_b;
  END IF;
  IF NOT (v_rn_b < v_rn_c) THEN
    RAISE EXCEPTION 'CASO 1 FALHOU: CAT_B (freq=2, rn=%) deveria ranquear antes de CAT_C (freq=1, rn=%)', v_rn_b, v_rn_c;
  END IF;

  -- CASO 2 (fallback AC7, RN-12 regra 5): CAT_OLD só entra por estar fora da
  -- janela (< 10 subcategorias distintas na janela) e deve ranquear DEPOIS de
  -- toda categoria com atividade na janela (grupo "histórico" nunca compete
  -- por cima do grupo "janela").
  IF v_rn_old IS NULL THEN
    RAISE EXCEPTION 'CASO 2 FALHOU: CAT_OLD deveria aparecer no resultado via fallback de histórico completo (AC7)';
  END IF;
  IF NOT (v_rn_old > v_rn_a AND v_rn_old > v_rn_b AND v_rn_old > v_rn_c AND v_rn_old > v_rn_d
          AND v_rn_old > v_rn_e AND v_rn_old > v_rn_f) THEN
    RAISE EXCEPTION 'CASO 2 FALHOU: CAT_OLD (fallback, rn=%) deveria ranquear depois de todas as categorias com atividade na janela', v_rn_old;
  END IF;

  -- CASO 3a (desempate por recência, RN-12 desempate i): mesma freq (1), CAT_C
  -- (mais recente) vence CAT_D (mais antigo, ambos dentro da janela).
  IF NOT (v_rn_c < v_rn_d) THEN
    RAISE EXCEPTION 'CASO 3a FALHOU: CAT_C (mais recente, rn=%) deveria vencer CAT_D (mais antigo, rn=%) no desempate por recência', v_rn_c, v_rn_d;
  END IF;

  -- CASO 3b (desempate por ordem alfabética, RN-12 desempate ii): mesma freq
  -- (1) e mesma data — "AAA_..." (CAT_E) vence "ZZZ_..." (CAT_F).
  IF NOT (v_rn_e < v_rn_f) THEN
    RAISE EXCEPTION 'CASO 3b FALHOU: CAT_E ("AAA_...", rn=%) deveria vencer CAT_F ("ZZZ_...", rn=%) no desempate alfabético', v_rn_e, v_rn_f;
  END IF;

  -- CASO 4 (resolução de payment_method_id, RN-13):
  --   - CAT_A teve 2x pix + 1x débito na janela -> pix deve vencer (mais frequente).
  --   - CAT_OLD só tem 1 transação, fora da janela, com pix -> fallback de
  --     histórico completo também se aplica à resolução de payment_method_id,
  --     não só à seleção da categoria.
  --   - CAT_PMNULL nunca teve lançamento com payment_method_id preenchido ->
  --     resultado NULL (RN-13, exceção).
  v_pm_for_a    := v_pm_ids[v_rn_a];
  v_pm_for_old  := v_pm_ids[v_rn_old];
  v_pm_for_null := v_pm_ids[v_rn_null];

  IF v_pm_for_a IS DISTINCT FROM v_pm_pix THEN
    RAISE EXCEPTION 'CASO 4 FALHOU: payment_method_id de CAT_A deveria ser pix (mais frequente, 2x), obtido %', v_pm_for_a;
  END IF;
  IF v_pm_for_old IS DISTINCT FROM v_pm_pix THEN
    RAISE EXCEPTION 'CASO 4 FALHOU: payment_method_id de CAT_OLD deveria resolver via fallback de histórico completo (pix), obtido %', v_pm_for_old;
  END IF;
  IF v_pm_for_null IS NOT NULL THEN
    RAISE EXCEPTION 'CASO 4 FALHOU: payment_method_id de CAT_PMNULL deveria ser NULL (nunca teve forma de pagamento associada), obtido %', v_pm_for_null;
  END IF;

  RAISE NOTICE 'BE-REF-02 (get_transaction_shortcuts, CASOS 1-4): TODOS PASSARAM';

  -- ===================== CASO 5: isolamento cross-user + AC2 (histórico vazio) =====================
  -- v_attacker nunca existiu (nem em auth.users) e não tem NENHUM lançamento —
  -- a RPC deve retornar vazio, provando ao mesmo tempo AC2 (usuário sem
  -- histórico) e que nenhum dado do usuário sintético (7 categorias com dados
  -- na janela + 1 via fallback) vaza para v_attacker via a mesma chamada.

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_attacker::text, 'app_email_mfa_verified', 'true')::text,
    true);

  SELECT count(*) INTO v_result_count FROM public.get_transaction_shortcuts();

  RESET ROLE;

  IF v_result_count <> 0 THEN
    RAISE EXCEPTION 'CASO 5 FALHOU: get_transaction_shortcuts() como usuário atacante deveria retornar vazio (AC2 + isolamento cross-user), obtido % linha(s)', v_result_count;
  END IF;

  RAISE NOTICE 'BE-REF-02 (get_transaction_shortcuts, CASO 5 — isolamento cross-user / AC2): PASSOU';

  -- ===================== CASO 6: corte em 10 linhas, CAT_OLD (fallback) ausente =====================
  -- Infla a janela do usuário sintético para >=10 subcategorias distintas
  -- (12 categorias novas, 1 lançamento cada, todas dentro da janela de 90
  -- dias, +7 já existentes = 19 no total). Observável esperado: CAT_OLD (só
  -- fora da janela) continua ausente do resultado desta 2ª chamada, e o
  -- resultado é cortado em exatamente 10 linhas (LIMIT), nunca 19+. Nota de
  -- re-revisão (2026-09-04): a ausência de CAT_OLD aqui NÃO depende do
  -- predicado "< 10" de cat_history_agg deixar de disparar — esse predicado
  -- é só um short-circuit de performance; quem garante que histórico nunca
  -- entra em rn <= 10 quando a janela já tem >=10 é o ORDER BY grp asc (grupo
  -- "janela" sempre antes do grupo "histórico"), verdadeiro com ou sem o
  -- predicado (provado por mutação pelo revisor — removê-lo não muda nenhum
  -- resultado). Este CASO valida o comportamento observável, não a presença
  -- desse predicado específico.
  FOR i IN 1..12 LOOP
    INSERT INTO public.categories (user_id, name, kind, is_system_default)
    VALUES (v_user, 'TEST_CAT_REF02_G' || lpad(i::text, 2, '0'), 'expense', false)
    RETURNING id INTO v_new_cat;
    v_cat_g := array_append(v_cat_g, v_new_cat);

    INSERT INTO public.transactions (user_id, account_id, payment_method_id, category_id, kind, amount_cents, transaction_date)
    VALUES (v_user, v_acc, v_pm_pix, v_new_cat, 'expense', 1000, v_today - i);
  END LOOP;

  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user::text, 'app_email_mfa_verified', 'true')::text,
    true);

  SELECT array_agg(category_id ORDER BY ord)
  INTO v_cat_ids2
  FROM (
    SELECT row_number() OVER () AS ord, category_id
    FROM public.get_transaction_shortcuts()
  ) s;

  RESET ROLE;

  v_result_count2 := coalesce(array_length(v_cat_ids2, 1), 0);
  IF v_result_count2 <> 10 THEN
    RAISE EXCEPTION 'CASO 6 FALHOU: com >=10 categorias distintas na janela (19 no total: 7 originais + 12 novas), esperado corte em exatamente 10 linhas, obtido %', v_result_count2;
  END IF;
  IF array_position(v_cat_ids2, v_cat_old) IS NOT NULL THEN
    RAISE EXCEPTION 'CASO 6 FALHOU: CAT_OLD (só fora da janela, fallback) não deveria aparecer no resultado quando a janela já tem >=10 categorias distintas (ORDER BY grp asc garante janela sempre antes de histórico)';
  END IF;

  RAISE NOTICE 'BE-REF-02 (get_transaction_shortcuts, CASO 6 — corte em 10 / sem fallback): PASSOU';

  -- ===================== RNF-12: created_via_shortcut =====================
  -- Coluna aditiva, DEFAULT false — todo lançamento já existente (incluindo os
  -- 12 inseridos acima para as 8 categorias originais, sem valor explícito)
  -- deve ter false.
  SELECT bool_and(created_via_shortcut = false) INTO v_created_via
  FROM public.transactions
  WHERE category_id IN (v_cat_a, v_cat_b, v_cat_c, v_cat_d, v_cat_e, v_cat_f, v_cat_old, v_cat_pmnull);

  IF NOT v_created_via THEN
    RAISE EXCEPTION 'RNF-12 FALHOU: created_via_shortcut deveria ser false (DEFAULT) para lançamento sem valor explícito';
  END IF;

  -- Confirma que a coluna aceita true explicitamente (uso real do fluxo de atalho).
  UPDATE public.transactions SET created_via_shortcut = true WHERE category_id = v_cat_a AND transaction_date = v_today;
  IF NOT EXISTS (SELECT 1 FROM public.transactions WHERE category_id = v_cat_a AND transaction_date = v_today AND created_via_shortcut = true) THEN
    RAISE EXCEPTION 'RNF-12 FALHOU: created_via_shortcut deveria aceitar true explicitamente';
  END IF;

  RAISE NOTICE 'BE-REF-02 (created_via_shortcut, RNF-12): PASSOU';
END;
$test$;

SELECT 'BE-REF-02 (get_transaction_shortcuts + created_via_shortcut): PASS' AS result;

ROLLBACK;
