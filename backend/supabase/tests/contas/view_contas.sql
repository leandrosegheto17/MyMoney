begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(8);

-- Estrutura e privilégios
select ok(
  (select reloptions from pg_class where oid = 'api.contas'::regclass) @> array['security_invoker=true'],
  'api.contas é security_invoker');
select columns_are('api', 'contas',
  array['id', 'nome', 'saldo_inicial_centavos', 'saldo_centavos', 'arquivada'],
  'colunas iguais às de contas.json, sem lar_id nem dono_id');
select table_privs_are('api', 'contas', 'authenticated', array['SELECT'], 'authenticated só lê');
select table_privs_are('api', 'contas', 'anon', array[]::text[], 'anon não tem nada');

-- Saldo vem de app.saldo_conta
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas) values
  ('e6500000-0000-4000-8000-000000000001', (select id from app.lar), testes.membro_a(), 'receita', 'individual',
   '00000000-0000-4000-8000-000000000421', 30000, 1),
  ('e6500000-0000-4000-8000-000000000002', (select id from app.lar), testes.membro_a(), 'despesa', 'conjunto',
   '00000000-0000-4000-8000-000000000401', 4500, 1);
insert into app.lancamento_pagamento (lancamento_id, dono_id, lar_id, forma_pagamento_id, conta_id, data_operacao) values
  ('e6500000-0000-4000-8000-000000000001', testes.membro_a(), (select id from app.lar), null,
   '00000000-0000-4000-8000-000000000201', app.hoje()),
  ('e6500000-0000-4000-8000-000000000002', testes.membro_a(), (select id from app.lar),
   '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000201', app.hoje());
insert into app.parcela (id, lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data) values
  (gen_random_uuid(), 'e6500000-0000-4000-8000-000000000001', (select id from app.lar), 'individual', testes.membro_a(), 1, 30000, app.hoje()),
  (gen_random_uuid(), 'e6500000-0000-4000-8000-000000000002', (select id from app.lar), 'conjunto', testes.membro_a(), 1, 4500, app.hoje());

select testes.como_a();
select is(
  (select saldo_centavos from api.contas where id = '00000000-0000-4000-8000-000000000201'),
  app.saldo_conta('00000000-0000-4000-8000-000000000201'),
  'saldo_centavos da view = app.saldo_conta');
select results_eq(
  $$select id, saldo_centavos from api.contas order by id$$,
  $$select id, app.saldo_conta(id) from app.conta order by id$$,
  'toda conta visível sai com o saldo de app.saldo_conta');
select ok(
  exists (select 1 from api.contas where id = '00000000-0000-4000-8000-000000000201')
  and exists (select 1 from api.contas where id = '00000000-0000-4000-8000-000000000202'),
  'A vê as duas contas do seed');

select testes.como_b();
select is_empty($$select 1 from api.contas where id in ('00000000-0000-4000-8000-000000000201',
                                                        '00000000-0000-4000-8000-000000000202')$$,
  'B não vê as contas de A pela view');

select * from finish();
rollback;
