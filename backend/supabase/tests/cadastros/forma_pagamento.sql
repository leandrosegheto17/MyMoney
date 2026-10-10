begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(26);

select testes.preparar_lar();

insert into app.conta (id, lar_id, dono_id, nome) values
  ('e1000000-0000-4000-8000-000000000201', (select id from app.lar), testes.membro_a(), 'Conta de A'),
  ('e1000000-0000-4000-8000-000000000211', (select id from app.lar), testes.membro_b(), 'Conta de B');
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id) values
  ('e1000000-0000-4000-8000-000000000301', (select id from app.lar), testes.membro_a(), 'Pix de A', 'pix',
   'e1000000-0000-4000-8000-000000000201');

-- Estrutura
select ok((select relrowsecurity from pg_class where oid = 'app.forma_pagamento'::regclass), 'RLS habilitada em app.forma_pagamento');
select ok((select relforcerowsecurity from pg_class where oid = 'app.forma_pagamento'::regclass), 'RLS forçada em app.forma_pagamento');
select col_is_unique('app', 'forma_pagamento', array['id', 'dono_id'], 'unique (id, dono_id) para os FKs compostos');
select col_default_is('app', 'forma_pagamento', 'preferida', false, 'forma nasce não preferida');
select col_default_is('app', 'forma_pagamento', 'arquivada', false, 'forma nasce não arquivada');

-- Restrições de tipo, conta e dia, como A
select testes.como_a();

select throws_ok(
  $$insert into app.forma_pagamento (nome, tipo) values ('Pix sem conta', 'pix')$$,
  '23514', null, 'Pix sem conta é recusado');
select throws_ok(
  $$insert into app.forma_pagamento (nome, tipo) values ('Débito sem conta', 'debito')$$,
  '23514', null, 'Débito sem conta é recusado');
select throws_ok(
  $$insert into app.forma_pagamento (nome, tipo, conta_id, dia_vencimento)
    values ('Débito com dia', 'debito', 'e1000000-0000-4000-8000-000000000201', 10)$$,
  '23514', null, 'Débito com dia de vencimento é recusado');
select throws_ok(
  $$insert into app.forma_pagamento (nome, tipo, dia_vencimento) values ('Crédito sem dia', 'credito', null)$$,
  '23514', null, 'Crédito sem dia é recusado');
select throws_ok(
  $$insert into app.forma_pagamento (nome, tipo, dia_vencimento) values ('Crédito dia 0', 'credito', 0)$$,
  '23514', null, 'Crédito com dia 0 é recusado');
select throws_ok(
  $$insert into app.forma_pagamento (nome, tipo, dia_vencimento) values ('Crédito dia 32', 'credito', 32)$$,
  '23514', null, 'Crédito com dia 32 é recusado');
select throws_ok(
  $$insert into app.forma_pagamento (nome, tipo, conta_id)
    values ('Boleto', 'boleto', 'e1000000-0000-4000-8000-000000000201')$$,
  '23514', null, 'tipo fora da lista é recusado');
select lives_ok(
  $$insert into app.forma_pagamento (nome, tipo, dia_vencimento) values ('Crédito dia 1', 'credito', 1)$$,
  'Crédito com dia 1 e sem conta é aceito');
select lives_ok(
  $$insert into app.forma_pagamento (nome, tipo, dia_vencimento) values ('Crédito dia 31', 'credito', 31)$$,
  'Crédito com dia 31 e sem conta é aceito');
select lives_ok(
  $$insert into app.forma_pagamento (nome, tipo, conta_id)
    values ('Débito de A', 'debito', 'e1000000-0000-4000-8000-000000000201')$$,
  'Débito com conta própria é aceito');

-- Preferida: no máximo 1 por dono
select lives_ok(
  $$update app.forma_pagamento set preferida = true where id = 'e1000000-0000-4000-8000-000000000301'$$,
  'A marca a primeira preferida');
select throws_ok(
  $$insert into app.forma_pagamento (nome, tipo, dia_vencimento, preferida) values ('Outra preferida', 'credito', 5, true)$$,
  '23505', null, 'segunda preferida do mesmo dono é recusada');

-- Como B
select testes.como_b();

select throws_ok(
  $$insert into app.forma_pagamento (nome, tipo, conta_id)
    values ('Pix na conta de A', 'pix', 'e1000000-0000-4000-8000-000000000201')$$,
  '23503', null, 'forma de B apontando para conta de A é recusada (FK composto)');
select lives_ok(
  $$insert into app.forma_pagamento (nome, tipo, conta_id, preferida)
    values ('Pix de B', 'pix', 'e1000000-0000-4000-8000-000000000211', true)$$,
  'B tem a própria preferida ao mesmo tempo que A');
select is_empty(
  $$select 1 from app.forma_pagamento where dono_id = testes.membro_a()$$,
  'B não lê formas de A');
select results_eq(
  $$with u as (update app.forma_pagamento set nome = 'Alterada por B'
               where id = 'e1000000-0000-4000-8000-000000000301' returning 1)
    select count(*)::int from u$$,
  $$values (0)$$, 'update de B na forma de A não atinge linha');
select results_eq(
  $$with d as (delete from app.forma_pagamento where id = 'e1000000-0000-4000-8000-000000000301' returning 1)
    select count(*)::int from d$$,
  $$values (0)$$, 'delete de B na forma de A não atinge linha');
select throws_ok(
  $$insert into app.forma_pagamento (dono_id, nome, tipo, dia_vencimento)
    values (testes.membro_a(), 'Forjada', 'credito', 10)$$,
  '42501', null, 'B não cria forma em nome de A');

select testes.como_postgres();

select results_eq(
  $$select nome, preferida from app.forma_pagamento where id = 'e1000000-0000-4000-8000-000000000301'$$,
  $$values ('Pix de A'::text, true)$$, 'a forma de A continua intacta');
select results_eq(
  $$select count(*)::int from app.forma_pagamento where dono_id = testes.membro_a()$$,
  $$values (4)$$, 'A continua com as 4 formas');
select results_eq(
  $$select dono_id, count(*)::int from app.forma_pagamento where preferida group by dono_id order by dono_id$$,
  $$values (testes.membro_a(), 1), (testes.membro_b(), 1)$$,
  'exatamente 1 preferida por dono');

select * from finish();
rollback;
