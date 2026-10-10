-- Tabela app.orcamento: restrições, unicidade, visibilidade (RLS) e FK sem cascata.
-- A = Leandro (membro ...0101, usuário ...00a1); B = Ana (membro ...0102, usuário ...00a2).
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(29);

-- Categorias de teste criadas na transação (ids fora da faixa do seed).
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('00000000-0000-4000-8000-00000000f001', (select id from app.lar), 'despesa', 'conjunto',   null,                                   'Orc teste conjunta',   true),
  ('00000000-0000-4000-8000-00000000f002', (select id from app.lar), 'despesa', 'individual', '00000000-0000-4000-8000-000000000101', 'Orc teste indiv A',    true),
  ('00000000-0000-4000-8000-00000000f003', (select id from app.lar), 'despesa', 'individual', '00000000-0000-4000-8000-000000000102', 'Orc teste indiv B',    true),
  ('00000000-0000-4000-8000-00000000f004', (select id from app.lar), 'receita', 'individual', '00000000-0000-4000-8000-000000000101', 'Orc teste receita A',  null);

-- Estrutura
select ok((select relrowsecurity from pg_class where oid = 'app.orcamento'::regclass), 'RLS habilitada em app.orcamento');
select ok((select relforcerowsecurity from pg_class where oid = 'app.orcamento'::regclass), 'RLS forçada em app.orcamento');
select col_type_is('app', 'orcamento', 'valor_centavos', 'bigint', 'valor_centavos é bigint');
select col_type_is('app', 'orcamento', 'mes', 'date', 'mes é date');
select ok(not has_table_privilege('anon', 'app.orcamento', 'select'), 'anon não lê app.orcamento');

-- Restrições (como superusuário)
select throws_ok($$
  insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos)
  values ((select id from app.lar), '2026-10-15', '00000000-0000-4000-8000-00000000f001', 'conjunto', null, 1000)
$$, '23514', null, 'mês que não é o dia 1 é recusado');

select throws_ok($$
  insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos)
  values ((select id from app.lar), '2030-01-01', '00000000-0000-4000-8000-00000000f001', 'conjunto', null, 0)
$$, '23514', null, 'valor zero é recusado');

select throws_ok($$
  insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos)
  values ((select id from app.lar), '2030-01-01', '00000000-0000-4000-8000-00000000f001', 'conjunto', null, -100)
$$, '23514', null, 'valor negativo é recusado');

select throws_ok($$
  insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos)
  values ((select id from app.lar), '2030-01-01', '00000000-0000-4000-8000-00000000f002', 'individual', null, 1000)
$$, '23514', null, 'individual sem dono é recusado');

select throws_ok($$
  insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos)
  values ((select id from app.lar), '2030-01-01', '00000000-0000-4000-8000-00000000f001', 'conjunto', '00000000-0000-4000-8000-000000000101', 1000)
$$, '23514', null, 'conjunto com dono é recusado');

select throws_ok($$
  insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos)
  values ((select id from app.lar), '2030-01-01', '00000000-0000-4000-8000-00000000f004', 'individual', '00000000-0000-4000-8000-000000000101', 1000)
$$, '23503', null, 'categoria de receita é recusada pelo FK com tipo');

select throws_ok($$
  insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos)
  values ((select id from app.lar), '2030-01-01', '00000000-0000-4000-8000-00000000f001', 'individual', '00000000-0000-4000-8000-000000000101', 1000)
$$, '23503', null, 'escopo diferente do da categoria é recusado');

select throws_ok($$
  insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos)
  values ((select id from app.lar), '2030-01-01', '00000000-0000-4000-8000-00000000f002', 'individual', '00000000-0000-4000-8000-000000000102', 1000)
$$, '23503', null, 'individual com dono diferente do dono da categoria é recusado');

-- Unicidade (categoria_id, mes)
insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos)
values ((select id from app.lar), '2030-01-01', '00000000-0000-4000-8000-00000000f001', 'conjunto', null, 1000);

select throws_ok($$
  insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos)
  values ((select id from app.lar), '2030-01-01', '00000000-0000-4000-8000-00000000f001', 'conjunto', null, 2000)
$$, '23505', null, 'mesma categoria no mesmo mês é recusada');

select lives_ok($$
  insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos)
  values ((select id from app.lar), '2030-02-01', '00000000-0000-4000-8000-00000000f001', 'conjunto', null, 2000)
$$, 'mesma categoria em mês diferente é aceita');

-- Seed de outubro/2026
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from app.orcamento where mes = '2026-10-01' and escopo = 'conjunto'), 5, 'A vê os 5 orçamentos conjuntos de outubro');
select is((select count(*)::int from app.orcamento where mes = '2026-10-01' and escopo = 'individual'), 4, 'A vê só as suas 4 individuais de outubro');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from app.orcamento where mes = '2026-10-01' and escopo = 'conjunto'), 5, 'B vê os 5 orçamentos conjuntos de outubro');
reset role;

select is((select count(*)::int from app.orcamento where mes = '2026-10-01' and dono_id = '00000000-0000-4000-8000-000000000102'), 1, 'seed tem uma individual de Ana em outubro');
select is((select count(*)::int from app.orcamento where mes = '2026-11-01'), 0, 'seed não tem orçamento em novembro');

-- Visibilidade com dados da transação
insert into app.orcamento (id, lar_id, mes, categoria_id, escopo, dono_id, valor_centavos) values
  ('00000000-0000-4000-8000-00000000f101', (select id from app.lar), '2030-03-01', '00000000-0000-4000-8000-00000000f002', 'individual', '00000000-0000-4000-8000-000000000101', 5000),
  ('00000000-0000-4000-8000-00000000f102', (select id from app.lar), '2030-03-01', '00000000-0000-4000-8000-00000000f001', 'conjunto',   null,                                   8000);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from app.orcamento where id = '00000000-0000-4000-8000-00000000f101'), 0, 'B não lê a individual de A');
select is_empty($$ update app.orcamento set valor_centavos = 1 where id = '00000000-0000-4000-8000-00000000f101' returning id $$, 'B não altera a individual de A');
select is_empty($$ delete from app.orcamento where id = '00000000-0000-4000-8000-00000000f101' returning id $$, 'B não apaga a individual de A');
reset role;

select is((select valor_centavos from app.orcamento where id = '00000000-0000-4000-8000-00000000f101'), 5000::bigint, 'a individual de A continua intacta');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select isnt_empty($$ update app.orcamento set valor_centavos = 9000 where id = '00000000-0000-4000-8000-00000000f102' returning id $$, 'B altera orçamento conjunto criado por A');
reset role;

select is((select valor_centavos from app.orcamento where id = '00000000-0000-4000-8000-00000000f102'), 9000::bigint, 'valor do conjunto alterado por B');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$
  insert into app.orcamento (mes, categoria_id, escopo, dono_id, valor_centavos)
  values ('2030-04-01', '00000000-0000-4000-8000-00000000f002', 'individual', '00000000-0000-4000-8000-000000000101', 1000)
$$, '42501', null, 'B não insere individual com dono A');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from app.orcamento where id = '00000000-0000-4000-8000-00000000f101'), 1, 'A lê a própria individual');
reset role;

-- FK sem cascata
select throws_ok($$ delete from app.categoria where id = '00000000-0000-4000-8000-00000000f001' $$, '23503', null, 'categoria orçada não é apagada');

select * from finish();
rollback;
