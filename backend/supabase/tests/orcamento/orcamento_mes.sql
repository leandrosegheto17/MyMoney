-- api.orcamento_mes(mes, escopo), sobre os seeds 01-07 (orçamento só em outubro/2026).
-- A = Leandro (membro ...0101, usuário ...00a1); B = Ana (membro ...0102, usuário ...00a2); ...00a3 sem membro.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(29);

-- Orçamentos para o rótulo parcial (mês passado, corrente e futuro)
insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos) values
  ((select id from app.lar), '2020-01-01', '00000000-0000-4000-8000-000000000401', 'conjunto', null, 1000),
  ((select id from app.lar), '2030-01-01', '00000000-0000-4000-8000-000000000401', 'conjunto', null, 1000);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select set_config('teste.out', api.orcamento_mes('2026-10-17', 'conjunto')::text, true);
select set_config('teste.nov', api.orcamento_mes('2026-11-01', 'conjunto')::text, true);
select set_config('teste.nov_ind_a', api.orcamento_mes('2026-11-01', 'individual')::text, true);

select is(current_setting('teste.out')::jsonb ->> 'mes', '2026-10-01', 'p_mes no meio do mês é normalizado');
select is(current_setting('teste.out')::jsonb ->> 'escopo', 'conjunto', 'escopo devolvido');
select is(api.orcamento_mes(null, 'conjunto') ->> 'mes', app.inicio_mes(app.hoje())::text, 'p_mes nulo usa o mês corrente');
select throws_ok($$ select api.orcamento_mes('2026-10-01', 'casal') $$, 'valor_invalido', 'escopo inválido');

select is(((api.orcamento_mes('2020-01-01', 'conjunto') -> 'total') ->> 'parcial')::boolean, false, 'mês passado não é parcial');
select is(((api.orcamento_mes('2030-01-01', 'conjunto') -> 'total') ->> 'parcial')::boolean, true, 'mês futuro é parcial');
reset role;

insert into app.orcamento (id, lar_id, mes, categoria_id, escopo, dono_id, valor_centavos)
values ('00000000-0000-4000-8000-00000000f901', (select id from app.lar), app.inicio_mes(app.hoje()), '00000000-0000-4000-8000-000000000401', 'conjunto', null, 1000)
on conflict (categoria_id, mes) do nothing;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is(((api.orcamento_mes(app.hoje(), 'conjunto') -> 'total') ->> 'parcial')::boolean, true, 'mês corrente é parcial');
reset role;
delete from app.orcamento where id = '00000000-0000-4000-8000-00000000f901';

-- Outubro (com orçamento)
select is(
  ((current_setting('teste.out')::jsonb -> 'total') ->> 'resultado_centavos')::bigint,
  ((current_setting('teste.out')::jsonb -> 'total') ->> 'orcado_centavos')::bigint
    - ((current_setting('teste.out')::jsonb -> 'total') ->> 'realizado_centavos')::bigint,
  'resultado = orçado - realizado');
select is((current_setting('teste.out')::jsonb -> 'total') ->> 'orcado_centavos', '430000', 'orçado conjunto de outubro');
select is(jsonb_array_length(current_setting('teste.out')::jsonb -> 'linhas'), 5, 'outubro tem as 5 linhas conjuntas');
select is(current_setting('teste.out')::jsonb -> 'pode_copiar_anterior', '{"conjunto": false, "individual": false}'::jsonb, 'outubro: não pode copiar anterior');
select ok(not (current_setting('teste.out')::jsonb ? 'anterior'), 'outubro: sem anterior');

-- Novembro (vazio)
select is(current_setting('teste.nov')::jsonb -> 'pode_copiar_anterior', '{"conjunto": true, "individual": true}'::jsonb, 'novembro: pode copiar nos dois escopos');
select is(current_setting('teste.nov')::jsonb -> 'anterior', '{"mes": "2026-10-01", "orcado_centavos": 430000, "categorias": 5}'::jsonb, 'novembro: anterior de outubro');
select is(current_setting('teste.nov')::jsonb -> 'sem_orcamento', $$[
  {"categoria_id": "00000000-0000-4000-8000-000000000406", "nome": "Almoço/Alimentação fora"},
  {"categoria_id": "00000000-0000-4000-8000-000000000404", "nome": "Contas da casa"},
  {"categoria_id": "00000000-0000-4000-8000-000000000402", "nome": "Delivery/iFood do casal"},
  {"categoria_id": "00000000-0000-4000-8000-000000000401", "nome": "Mercado"},
  {"categoria_id": "00000000-0000-4000-8000-000000000403", "nome": "Moradia"},
  {"categoria_id": "00000000-0000-4000-8000-000000000405", "nome": "Outros da casa"}
]$$::jsonb, 'novembro: as 6 conjuntas sem orçamento, por nome');
select ok(coalesce(current_setting('teste.nov')::jsonb -> 'total', 'null'::jsonb) = 'null'::jsonb, 'novembro: total nulo');
select is(current_setting('teste.nov')::jsonb -> 'linhas', '[]'::jsonb, 'novembro: linhas vazias');

select results_eq(
  $$ select (e ->> 'categoria_id')::uuid from jsonb_array_elements(current_setting('teste.nov_ind_a')::jsonb -> 'sem_orcamento') e order by 1 $$,
  $$ select id from app.categoria where tipo = 'despesa' and escopo = 'individual'
       and dono_id = '00000000-0000-4000-8000-000000000101' and not arquivada order by 1 $$,
  'individual de A: sem_orcamento com as despesas individuais de A');

-- Categoria arquivada fica fora de sem_orcamento
update app.categoria set arquivada = true where id = '00000000-0000-4000-8000-000000000405';
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select ok(position('00000000-0000-4000-8000-000000000405' in (api.orcamento_mes('2026-11-01', 'conjunto') -> 'sem_orcamento')::text) = 0,
  'categoria arquivada fora de sem_orcamento');
reset role;
update app.categoria set arquivada = false where id = '00000000-0000-4000-8000-000000000405';

-- Isolamento e inferência: individual de B
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select set_config('teste.nov_ind_b', api.orcamento_mes('2026-11-01', 'individual')::text, true);
reset role;

select ok(
  not exists (
    select 1 from app.categoria c
    where c.dono_id = '00000000-0000-4000-8000-000000000101'
      and position(c.id::text in current_setting('teste.nov_ind_b')) > 0),
  'individual de B não contém categoria de A');
select is(((current_setting('teste.nov_ind_b')::jsonb -> 'pode_copiar_anterior') ->> 'individual')::boolean, true,
  'B pode copiar a própria individual de outubro');

insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos)
values ((select id from app.lar), '2026-11-01', '00000000-0000-4000-8000-000000000412', 'individual', '00000000-0000-4000-8000-000000000101', 5000);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select set_config('teste.nov_ind_b_depois', api.orcamento_mes('2026-11-01', 'individual')::text, true);
reset role;

select is(current_setting('teste.nov_ind_b_depois')::jsonb -> 'pode_copiar_anterior', current_setting('teste.nov_ind_b')::jsonb -> 'pode_copiar_anterior',
  'orçamento individual de A não muda pode_copiar_anterior de B');
select is(current_setting('teste.nov_ind_b_depois')::jsonb -> 'sem_orcamento', current_setting('teste.nov_ind_b')::jsonb -> 'sem_orcamento',
  'orçamento individual de A não muda sem_orcamento de B');

-- Sem membro
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select api.orcamento_mes('2026-10-01', 'conjunto') $$, 'registro_invalido', 'sem membro: registro_invalido');
reset role;

-- app.mes_fechado extraído
select is(app.mes_fechado('2020-01-01'), true, 'mês passado está fechado');
select is(app.mes_fechado(app.inicio_mes(app.hoje())), false, 'mês corrente não está fechado');

-- Catálogo
select ok(not has_function_privilege('anon', 'api.orcamento_mes(date, text)', 'execute'), 'anon não executa');
select ok(has_function_privilege('authenticated', 'api.orcamento_mes(date, text)', 'execute'), 'authenticated executa');
select ok(not (select prosecdef from pg_proc where oid = 'api.orcamento_mes(date, text)'::regprocedure), 'security invoker');

select * from finish();
rollback;
