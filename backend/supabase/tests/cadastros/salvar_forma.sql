begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(34);

select testes.preparar_lar();

insert into app.conta (id, lar_id, dono_id, nome, arquivada) values
  ('e1000000-0000-4000-8000-000000000201', (select id from app.lar), testes.membro_a(), 'Conta de A', false),
  ('e1000000-0000-4000-8000-000000000202', (select id from app.lar), testes.membro_a(), 'Segunda conta de A', false),
  ('e1000000-0000-4000-8000-000000000203', (select id from app.lar), testes.membro_a(), 'Arquivada de A', true),
  ('e1000000-0000-4000-8000-000000000211', (select id from app.lar), testes.membro_b(), 'Conta de B', false);

-- Crédito com lançamento e parcelas já gravados (CA-03.2b)
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, dia_vencimento) values
  ('e1000000-0000-4000-8000-000000000303', (select id from app.lar), testes.membro_a(), 'Cartão de A', 'credito', 10);
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e1000000-0000-4000-8000-000000000401', (select id from app.lar), 'despesa', 'conjunto', null, 'Casa', true);
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas) values
  ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(), 'despesa', 'conjunto', 'e1000000-0000-4000-8000-000000000401', 20000, 2);
insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, forma_pagamento_id, data_operacao, dia_vencimento_aplicado) values
  ('e1000000-0000-4000-8000-000000000501', (select id from app.lar), testes.membro_a(), 'e1000000-0000-4000-8000-000000000303', '2026-10-05', 10);
insert into app.parcela (id, lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data) values
  ('e1000000-0000-4000-8000-000000000601', 'e1000000-0000-4000-8000-000000000501', (select id from app.lar), 'conjunto', testes.membro_a(), 1, 10000, '2026-11-10'),
  ('e1000000-0000-4000-8000-000000000602', 'e1000000-0000-4000-8000-000000000501', (select id from app.lar), 'conjunto', testes.membro_a(), 2, 10000, '2026-12-10');

select is((select prosecdef from pg_proc where oid = 'api.salvar_forma(uuid, text, text, uuid, smallint)'::regprocedure),
  false, 'é security invoker');
select ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'api.salvar_forma(uuid, text, text, uuid, smallint)'::regprocedure),
  'search_path vazio');
select is(has_function_privilege('anon', 'api.salvar_forma(uuid, text, text, uuid, smallint)', 'execute'), false, 'anon não executa');

select testes.como_a();

-- Pix e Débito
select is(api.salvar_forma('e1000000-0000-4000-8000-000000000301', 'Pix de A', 'pix', 'e1000000-0000-4000-8000-000000000201'),
  'e1000000-0000-4000-8000-000000000301'::uuid, 'Pix com conta própria é criado');
select is(api.salvar_forma('e1000000-0000-4000-8000-000000000302', 'Débito de A', 'debito', 'e1000000-0000-4000-8000-000000000201', 5::smallint),
  'e1000000-0000-4000-8000-000000000302'::uuid, 'Débito com conta própria é criado');
select results_eq(
  $$select id, dono_id, dia_vencimento from app.forma_pagamento
    where id in ('e1000000-0000-4000-8000-000000000301', 'e1000000-0000-4000-8000-000000000302') order by id$$,
  $$values ('e1000000-0000-4000-8000-000000000301'::uuid, testes.membro_a(), null::smallint),
           ('e1000000-0000-4000-8000-000000000302'::uuid, testes.membro_a(), null::smallint)$$,
  'Pix e Débito ficam com dono A e sem dia de vencimento');
select throws_ok($$select api.salvar_forma('e1000000-0000-4000-8000-000000000304', 'Pix sem conta', 'pix')$$,
  'P0001', 'valor_invalido', 'Pix sem conta é recusado');
select throws_ok($$select api.salvar_forma('e1000000-0000-4000-8000-000000000304', 'Débito sem conta', 'debito')$$,
  'P0001', 'valor_invalido', 'Débito sem conta é recusado');
select throws_ok($$select api.salvar_forma('e1000000-0000-4000-8000-000000000304', 'Pix na conta de B', 'pix', 'e1000000-0000-4000-8000-000000000211')$$,
  'P0001', 'registro_invalido', 'conta de B recebe registro_invalido');
select throws_ok($$select api.salvar_forma('e1000000-0000-4000-8000-000000000304', 'Pix em conta inexistente', 'pix', 'e1000000-0000-4000-8000-0000000002ff')$$,
  'P0001', 'registro_invalido', 'conta inexistente recebe o mesmo registro_invalido');
select throws_ok($$select api.salvar_forma('e1000000-0000-4000-8000-000000000304', 'Pix na arquivada', 'pix', 'e1000000-0000-4000-8000-000000000203')$$,
  'P0001', 'valor_invalido', 'conta própria arquivada é recusada');

-- Crédito
select is(api.salvar_forma('e1000000-0000-4000-8000-000000000305', 'Crédito dia 1', 'credito', null, 1::smallint),
  'e1000000-0000-4000-8000-000000000305'::uuid, 'Crédito dia 1 sem conta é criado');
select is(api.salvar_forma('e1000000-0000-4000-8000-000000000306', 'Crédito dia 31', 'credito', null, 31::smallint),
  'e1000000-0000-4000-8000-000000000306'::uuid, 'Crédito dia 31 sem conta é criado');
select is(api.salvar_forma('e1000000-0000-4000-8000-000000000307', 'Crédito com conta', 'credito', 'e1000000-0000-4000-8000-000000000201', 15::smallint),
  'e1000000-0000-4000-8000-000000000307'::uuid, 'Crédito com conta de pagamento própria é criado');
select throws_ok($$select api.salvar_forma('e1000000-0000-4000-8000-000000000308', 'Crédito sem dia', 'credito', null, null)$$,
  'P0001', 'valor_invalido', 'Crédito sem dia é recusado');
select throws_ok($$select api.salvar_forma('e1000000-0000-4000-8000-000000000308', 'Crédito dia 0', 'credito', null, 0::smallint)$$,
  'P0001', 'valor_invalido', 'Crédito dia 0 é recusado');
select throws_ok($$select api.salvar_forma('e1000000-0000-4000-8000-000000000308', 'Crédito dia 32', 'credito', null, 32::smallint)$$,
  'P0001', 'valor_invalido', 'Crédito dia 32 é recusado');

-- Entradas inválidas
select throws_ok($$select api.salvar_forma(null, 'Sem id', 'credito', null, 10::smallint)$$,
  'P0001', 'valor_invalido', 'id nulo é recusado');
select throws_ok($$select api.salvar_forma('e1000000-0000-4000-8000-000000000308', '  ', 'credito', null, 10::smallint)$$,
  'P0001', 'valor_invalido', 'nome vazio é recusado');
select throws_ok($$select api.salvar_forma('e1000000-0000-4000-8000-000000000308', 'Boleto', 'boleto', 'e1000000-0000-4000-8000-000000000201')$$,
  'P0001', 'valor_invalido', 'tipo fora da lista é recusado');

-- Edição
select throws_ok($$select api.salvar_forma('e1000000-0000-4000-8000-000000000301', 'Pix de A', 'debito', 'e1000000-0000-4000-8000-000000000201')$$,
  'P0001', 'valor_invalido', 'trocar o tipo é recusado');
select results_eq(
  $$select tipo, nome, conta_id from app.forma_pagamento where id = 'e1000000-0000-4000-8000-000000000301'$$,
  $$values ('pix'::text, 'Pix de A'::text, 'e1000000-0000-4000-8000-000000000201'::uuid)$$,
  'a forma fica igual depois da troca de tipo recusada');
select lives_ok($$select api.salvar_forma('e1000000-0000-4000-8000-000000000301', 'Pix renomeado', 'pix', 'e1000000-0000-4000-8000-000000000202')$$,
  'editar nome e conta é aceito');
select results_eq(
  $$select nome, conta_id from app.forma_pagamento where id = 'e1000000-0000-4000-8000-000000000301'$$,
  $$values ('Pix renomeado'::text, 'e1000000-0000-4000-8000-000000000202'::uuid)$$,
  'nome e conta editados');
select lives_ok($$select api.salvar_forma('e1000000-0000-4000-8000-000000000301', 'Pix renomeado', 'pix', 'e1000000-0000-4000-8000-000000000202')$$,
  'reenvio idêntico não falha');
select results_eq(
  $$select count(*)::int from app.forma_pagamento where id = 'e1000000-0000-4000-8000-000000000301'$$,
  $$values (1)$$, 'reenvio idêntico não duplica');

-- Mudar o dia não mexe no que já foi lançado
select lives_ok($$select api.salvar_forma('e1000000-0000-4000-8000-000000000303', 'Cartão de A', 'credito', null, 20::smallint)$$,
  'mudar o dia do crédito de 10 para 20 é aceito');
select results_eq(
  $$select dia_vencimento from app.forma_pagamento where id = 'e1000000-0000-4000-8000-000000000303'$$,
  $$values (20::smallint)$$, 'a forma passa a ter dia 20');
select results_eq(
  $$select data from app.parcela where lancamento_id = 'e1000000-0000-4000-8000-000000000501' order by numero$$,
  $$values ('2026-11-10'::date), ('2026-12-10'::date)$$,
  'as datas das parcelas existentes não mudam');
select results_eq(
  $$select dia_vencimento_aplicado from app.lancamento_pagamento where lancamento_id = 'e1000000-0000-4000-8000-000000000501'$$,
  $$values (10::smallint)$$, 'o dia aplicado no lançamento existente não muda');

-- Como B
select testes.como_b();

select throws_ok($$select api.salvar_forma('e1000000-0000-4000-8000-000000000303', 'Invadida', 'credito', null, 5::smallint)$$,
  'P0001', 'registro_invalido', 'B com o id de uma forma de A recebe registro_invalido');

-- Usuário sem membro
select testes.como_sem_membro();

select throws_ok($$select api.salvar_forma('e1000000-0000-4000-8000-000000000309', 'Sem membro', 'credito', null, 10::smallint)$$,
  'P0001', 'registro_invalido', 'usuário sem membro recebe registro_invalido');

select testes.como_postgres();

select results_eq(
  $$select nome, dia_vencimento, dono_id from app.forma_pagamento where id = 'e1000000-0000-4000-8000-000000000303'$$,
  $$values ('Cartão de A'::text, 20::smallint, testes.membro_a())$$,
  'a forma de A continua intacta depois da tentativa de B');
select is_empty(
  $$select 1 from app.forma_pagamento where dono_id = testes.membro_b()$$,
  'nada foi criado para B');

select * from finish();
rollback;
