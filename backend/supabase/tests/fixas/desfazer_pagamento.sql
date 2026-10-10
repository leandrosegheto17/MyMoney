-- api.desfazer_pagamento: só o pagador; exclui o lançamento ligado e a ocorrência volta a pendente (CA-12.3).
-- app.hoje() fixado em 2026-10-12 dentro da transação.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(28);

create or replace function app.hoje(p_instante timestamptz default now()) returns date
language sql stable set search_path = '' as $$ select date '2026-10-12' $$;

select testes.preparar_lar();

-- Cadastros de teste criados na transação (como postgres).
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('00000000-0000-4000-8000-00000000c401', '00000000-0000-4000-8000-000000000100', 'despesa', 'conjunto',   null,              'Moradia',        false),
  ('00000000-0000-4000-8000-00000000c402', '00000000-0000-4000-8000-000000000100', 'despesa', 'conjunto',   null,              'Contas da casa', false),
  ('00000000-0000-4000-8000-00000000c411', '00000000-0000-4000-8000-000000000100', 'despesa', 'individual', testes.membro_a(), 'Transporte',     true),
  ('00000000-0000-4000-8000-00000000c412', '00000000-0000-4000-8000-000000000100', 'despesa', 'individual', testes.membro_b(), 'Transporte',     true),
  ('00000000-0000-4000-8000-00000000c421', '00000000-0000-4000-8000-000000000100', 'receita', 'individual', testes.membro_a(), 'Salário',        null);
insert into app.conta (id, lar_id, dono_id, nome, saldo_inicial_centavos) values
  ('00000000-0000-4000-8000-00000000c201', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Nubank',    250000),
  ('00000000-0000-4000-8000-00000000c202', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Itaú',      80000),
  ('00000000-0000-4000-8000-00000000c211', '00000000-0000-4000-8000-000000000100', testes.membro_b(), 'Conta Ana', 100000);
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento, preferida) values
  ('00000000-0000-4000-8000-00000000c301', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Pix Nubank',           'pix',     '00000000-0000-4000-8000-00000000c201', null, true),
  ('00000000-0000-4000-8000-00000000c302', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Débito Itaú',          'debito',  '00000000-0000-4000-8000-00000000c202', null, false),
  ('00000000-0000-4000-8000-00000000c303', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Cartão de crédito XP', 'credito', '00000000-0000-4000-8000-00000000c202', 10,   false),
  ('00000000-0000-4000-8000-00000000c311', '00000000-0000-4000-8000-000000000100', testes.membro_b(), 'Pix Ana',              'pix',     '00000000-0000-4000-8000-00000000c211', null, true);

insert into app.despesa_fixa (id, lar_id, descricao, categoria_id, valor_previsto_centavos, dia_vencimento, inicio) values
  ('00000000-0000-4000-8000-00000000d701', '00000000-0000-4000-8000-000000000100', 'Condomínio', '00000000-0000-4000-8000-00000000c401', 22010, 10, '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d702', '00000000-0000-4000-8000-000000000100', 'Luz',        '00000000-0000-4000-8000-00000000c402', 18000, 10, '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d703', '00000000-0000-4000-8000-000000000100', 'Gás',        '00000000-0000-4000-8000-00000000c402', 5000,  10, '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d704', '00000000-0000-4000-8000-000000000100', 'Internet',   '00000000-0000-4000-8000-00000000c402', 11990, 10, '2026-01-01');
insert into app.ocorrencia_fixa (id, lar_id, despesa_fixa_id, mes, vencimento, valor_previsto_centavos) values
  ('00000000-0000-4000-8000-00000000d801', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d701', '2026-10-01', '2026-10-10', 22010),
  ('00000000-0000-4000-8000-00000000d802', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d702', '2026-10-01', '2026-10-10', 18000),
  ('00000000-0000-4000-8000-00000000d803', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d703', '2026-10-01', '2026-10-10', 5000),
  ('00000000-0000-4000-8000-00000000d804', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d704', '2026-10-01', '2026-10-10', 11990);

-- Catálogo
select ok(not (select prosecdef from pg_proc where oid = 'api.desfazer_pagamento(uuid)'::regprocedure),
  'desfazer_pagamento é security invoker');
select ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'api.desfazer_pagamento(uuid)'::regprocedure),
  'desfazer_pagamento com search_path vazio');
select ok(not has_function_privilege('anon', 'api.desfazer_pagamento(uuid)', 'execute'),
  'anon não executa desfazer_pagamento');

-- Estado antes dos pagamentos
select set_config('teste.saldo_nubank', app.saldo_conta('00000000-0000-4000-8000-00000000c201')::text, true);
select set_config('teste.total_out', (app.totais_conjunto('2026-10-01') ->> 'total_centavos'), true);

-- A paga no Pix e desfaz
select testes.como_a();
select lives_ok($$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-00000000d801', '00000000-0000-4000-8000-00000000c301')$$, 'A paga no Pix');
select testes.como_postgres();
select isnt(app.saldo_conta('00000000-0000-4000-8000-00000000c201'), current_setting('teste.saldo_nubank')::bigint, 'o pagamento mexeu no saldo');

select testes.como_a();
select lives_ok($$select api.desfazer_pagamento('00000000-0000-4000-8000-00000000d801')$$, 'A desfaz o próprio pagamento');
select testes.como_postgres();
select is((select count(*)::int from app.lancamento where id = '00000000-0000-4000-8000-00000000e501'), 0, 'o lançamento sumiu');
select is((select count(*)::int from app.parcela where lancamento_id = '00000000-0000-4000-8000-00000000e501'), 0, 'a parcela sumiu');
select is((select count(*)::int from app.lancamento_pagamento where lancamento_id = '00000000-0000-4000-8000-00000000e501'), 0, 'a parte privada sumiu');
select is((select lancamento_id from app.ocorrencia_fixa where id = '00000000-0000-4000-8000-00000000d801'), null::uuid, 'a ocorrência volta a pendente');
select is(app.saldo_conta('00000000-0000-4000-8000-00000000c201'), current_setting('teste.saldo_nubank')::bigint, 'o saldo volta ao valor anterior');
select is((app.totais_conjunto('2026-10-01') ->> 'total_centavos'), current_setting('teste.total_out'),
  'o total do conjunto de outubro volta');

-- A paga no Crédito e desfaz
select testes.como_a();
select lives_ok($$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e502', '00000000-0000-4000-8000-00000000d802', '00000000-0000-4000-8000-00000000c303')$$, 'A paga no Crédito');
select lives_ok($$select api.desfazer_pagamento('00000000-0000-4000-8000-00000000d802')$$, 'A desfaz o pagamento no Crédito');
select testes.como_postgres();
select is(
  (select row(g.gasto_mes_centavos, g.comprometido_futuro_centavos)::text from app.gasto_cartao('00000000-0000-4000-8000-00000000c303', '2026-10-01') g),
  '(0,0)', 'o cartão de outubro volta a 0/0');
select is(
  (select row(g.gasto_mes_centavos, g.comprometido_futuro_centavos)::text from app.gasto_cartao('00000000-0000-4000-8000-00000000c303', '2026-11-01') g),
  '(0,0)', 'o cartão de novembro volta a 0/0');
select is((app.totais_conjunto('2026-10-01') ->> 'total_centavos'), current_setting('teste.total_out'),
  'o total do conjunto de outubro volta depois do crédito desfeito');

-- B não desfaz o pagamento de A
select testes.como_a();
select lives_ok($$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e503', '00000000-0000-4000-8000-00000000d803', '00000000-0000-4000-8000-00000000c301')$$, 'A paga o Gás');
select testes.como_b();
select throws_ok($$select api.desfazer_pagamento('00000000-0000-4000-8000-00000000d803')$$,
  null, 'registro_invalido', 'B desfazendo o pagamento de A → registro_invalido');
select testes.como_postgres();
select is((select lancamento_id from app.ocorrencia_fixa where id = '00000000-0000-4000-8000-00000000d803'), '00000000-0000-4000-8000-00000000e503'::uuid, 'a ocorrência continua paga');
select is((select count(*)::int from app.lancamento_pagamento where lancamento_id = '00000000-0000-4000-8000-00000000e503'), 1, 'a parte privada de A continua');

-- Ocorrência já pendente e inexistente
select testes.como_a();
select lives_ok($$select api.desfazer_pagamento('00000000-0000-4000-8000-00000000d804')$$, 'desfazer ocorrência pendente não dá erro');
select testes.como_postgres();
select is((select lancamento_id from app.ocorrencia_fixa where id = '00000000-0000-4000-8000-00000000d804'), null::uuid, 'a pendente continua pendente');
select is((select count(*)::int from app.ocorrencia_fixa where despesa_fixa_id in ('00000000-0000-4000-8000-00000000d701', '00000000-0000-4000-8000-00000000d702', '00000000-0000-4000-8000-00000000d703', '00000000-0000-4000-8000-00000000d704')), 4,
  'nenhuma ocorrência foi apagada');
select testes.como_a();
select throws_ok($$select api.desfazer_pagamento('00000000-0000-4000-8000-00000000ffff')$$,
  null, 'registro_invalido', 'ocorrência inexistente → registro_invalido');

-- Pagar de novo depois de desfazer
select lives_ok($$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e510', '00000000-0000-4000-8000-00000000d801', '00000000-0000-4000-8000-00000000c301')$$, 'A paga de novo com outro id');
select testes.como_postgres();
select is((select lancamento_id from app.ocorrencia_fixa where id = '00000000-0000-4000-8000-00000000d801'), '00000000-0000-4000-8000-00000000e510'::uuid,
  'a ocorrência fica ligada ao novo lançamento');

-- Usuário sem membro
select testes.como_sem_membro();
select throws_ok($$select api.desfazer_pagamento('00000000-0000-4000-8000-00000000d801')$$, null, 'registro_invalido', 'sem membro → registro_invalido');

select * from finish();
rollback;
