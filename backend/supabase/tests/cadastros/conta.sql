begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(19);

-- Seed local de contas (antes de limpar o lar)
select results_eq(
  $$select id, nome, saldo_inicial_centavos from app.conta
    where id in ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000202')
    order by id$$,
  $$values ('00000000-0000-4000-8000-000000000201'::uuid, 'Nubank'::text, 250000::bigint),
           ('00000000-0000-4000-8000-000000000202'::uuid, 'Itaú'::text, 80000::bigint)$$,
  'o seed cria as 2 contas de Leandro com os ids do mockup');
select ok(
  exists (select 1 from app.conta where dono_id = '00000000-0000-4000-8000-000000000102'),
  'o seed cria uma conta para Ana');

select testes.preparar_lar();

-- Estrutura
select ok((select relrowsecurity from pg_class where oid = 'app.conta'::regclass), 'RLS habilitada em app.conta');
select ok((select relforcerowsecurity from pg_class where oid = 'app.conta'::regclass), 'RLS forçada em app.conta');
select col_type_is('app', 'conta', 'saldo_inicial_centavos', 'bigint', 'saldo inicial em centavos bigint');
select col_default_is('app', 'conta', 'saldo_inicial_centavos', 0, 'saldo inicial padrão 0');
select col_default_is('app', 'conta', 'arquivada', false, 'conta nasce não arquivada');
select col_is_unique('app', 'conta', array['id', 'dono_id'], 'unique (id, dono_id) para os FKs compostos');

insert into app.conta (id, lar_id, dono_id, nome, saldo_inicial_centavos)
values ('e1000000-0000-4000-8000-000000000201', (select id from app.lar), testes.membro_a(), 'Conta de A', 1000);

select throws_ok(
  $$insert into app.conta (lar_id, dono_id, nome) values ((select id from app.lar), testes.membro_a(), '   ')$$,
  '23514', null, 'nome só com espaços é recusado');

-- Como A
select testes.como_a();

select lives_ok(
  $$insert into app.conta (id, nome) values ('e1000000-0000-4000-8000-000000000202', 'Nova de A')$$,
  'A cria conta sem informar dono');
select results_eq(
  $$select dono_id, lar_id, saldo_inicial_centavos, arquivada from app.conta
    where id = 'e1000000-0000-4000-8000-000000000202'$$,
  $$values (testes.membro_a(), app.lar_atual(), 0::bigint, false)$$,
  'dono e lar vêm das auxiliares; saldo 0 e não arquivada');

-- Como B
select testes.como_b();

select is_empty(
  $$select 1 from app.conta where dono_id = testes.membro_a()$$,
  'B não lê nenhuma conta de A');
select is_empty(
  $$select 1 from app.conta where id = 'e1000000-0000-4000-8000-000000000201'$$,
  'B não lê a conta de A filtrando pelo id');
select results_eq(
  $$with u as (update app.conta set nome = 'Alterada por B', saldo_inicial_centavos = 1
               where id = 'e1000000-0000-4000-8000-000000000201' returning 1)
    select count(*)::int from u$$,
  $$values (0)$$, 'update de B na conta de A não atinge linha');
select results_eq(
  $$with d as (delete from app.conta where id = 'e1000000-0000-4000-8000-000000000201' returning 1)
    select count(*)::int from d$$,
  $$values (0)$$, 'delete de B na conta de A não atinge linha');
select throws_ok(
  $$insert into app.conta (dono_id, nome) values (testes.membro_a(), 'Forjada')$$,
  '42501', null, 'B não cria conta em nome de A');

select testes.como_postgres();

select results_eq(
  $$select nome, saldo_inicial_centavos from app.conta where id = 'e1000000-0000-4000-8000-000000000201'$$,
  $$values ('Conta de A'::text, 1000::bigint)$$,
  'a conta de A continua intacta');
select results_eq(
  $$select count(*)::int from app.conta where dono_id = testes.membro_a()$$,
  $$values (2)$$, 'A continua com as 2 contas');
select is_empty(
  $$select 1 from app.conta where dono_id = testes.membro_b()$$,
  'nenhuma conta foi criada para B');

select * from finish();
rollback;
