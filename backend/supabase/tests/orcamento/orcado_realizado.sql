-- app.orcado_realizado(mes, escopo): linhas e total por escopo, realizado pelas parcelas do mês.
-- A = Leandro (membro ...0101, usuário ...00a1); B = Ana (membro ...0102, usuário ...00a2).
-- Total do escopo: soma todas as despesas do escopo no mês (proposta do PENDENTE do plano).
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(15);

create function pg_temp.lancar(p_dono uuid, p_tipo text, p_escopo text, p_categoria uuid, p_datas date[], p_valores bigint[])
returns uuid language plpgsql as $$
declare
  v_id uuid := gen_random_uuid();
  v_lar uuid := (select id from app.lar);
begin
  insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, descricao, valor_total_centavos, num_parcelas)
  values (v_id, v_lar, p_dono, p_tipo, p_escopo, p_categoria, 'teste',
          (select sum(v) from unnest(p_valores) v), cardinality(p_datas));
  for i in 1 .. cardinality(p_datas) loop
    insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
    values (v_id, v_lar, p_escopo, p_dono, i, p_valores[i], p_datas[i]);
  end loop;
  return v_id;
end $$;

insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('00000000-0000-4000-8000-00000000f201', (select id from app.lar), 'despesa', 'conjunto',   null,                                   'Orc Mercado T', true),
  ('00000000-0000-4000-8000-00000000f202', (select id from app.lar), 'despesa', 'conjunto',   null,                                   'Orc Casa T',    false),
  ('00000000-0000-4000-8000-00000000f203', (select id from app.lar), 'despesa', 'conjunto',   null,                                   'Orc Sem T',     false),
  ('00000000-0000-4000-8000-00000000f204', (select id from app.lar), 'despesa', 'conjunto',   null,                                   'Orc Lazer T',   true),
  ('00000000-0000-4000-8000-00000000f205', (select id from app.lar), 'despesa', 'individual', '00000000-0000-4000-8000-000000000101', 'Orc Lazer T',   true),
  ('00000000-0000-4000-8000-00000000f206', (select id from app.lar), 'despesa', 'individual', '00000000-0000-4000-8000-000000000102', 'Orc Lazer T',   true),
  ('00000000-0000-4000-8000-00000000f207', (select id from app.lar), 'receita', 'individual', '00000000-0000-4000-8000-000000000101', 'Orc Rec T',     null);

insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos) values
  ((select id from app.lar), '2030-03-01', '00000000-0000-4000-8000-00000000f201', 'conjunto',   null,                                   10000),
  ((select id from app.lar), '2030-03-01', '00000000-0000-4000-8000-00000000f202', 'conjunto',   null,                                   20000),
  ((select id from app.lar), '2030-03-01', '00000000-0000-4000-8000-00000000f205', 'individual', '00000000-0000-4000-8000-000000000101', 5000),
  ((select id from app.lar), '2030-03-01', '00000000-0000-4000-8000-00000000f206', 'individual', '00000000-0000-4000-8000-000000000102', 7000);

-- Crédito 3x atravessando meses: só a parcela de março conta
select pg_temp.lancar('00000000-0000-4000-8000-000000000101', 'despesa', 'conjunto', '00000000-0000-4000-8000-00000000f201',
                      array['2030-02-10', '2030-03-10', '2030-04-10']::date[], array[3000, 3000, 3000]::bigint[]);
-- Último dia do mês entra; dia 1 seguinte não
select pg_temp.lancar('00000000-0000-4000-8000-000000000102', 'despesa', 'conjunto', '00000000-0000-4000-8000-00000000f201',
                      array['2030-03-31']::date[], array[1000]::bigint[]);
select pg_temp.lancar('00000000-0000-4000-8000-000000000102', 'despesa', 'conjunto', '00000000-0000-4000-8000-00000000f201',
                      array['2030-04-01']::date[], array[500]::bigint[]);
select pg_temp.lancar('00000000-0000-4000-8000-000000000101', 'despesa', 'conjunto', '00000000-0000-4000-8000-00000000f202',
                      array['2030-03-05']::date[], array[18000]::bigint[]);
-- Categoria conjunta não orçada entra no total do escopo
select pg_temp.lancar('00000000-0000-4000-8000-000000000101', 'despesa', 'conjunto', '00000000-0000-4000-8000-00000000f203',
                      array['2030-03-15']::date[], array[2000]::bigint[]);
-- Receita não entra
select pg_temp.lancar('00000000-0000-4000-8000-000000000101', 'receita', 'individual', '00000000-0000-4000-8000-00000000f207',
                      array['2030-03-05']::date[], array[50000]::bigint[]);
select pg_temp.lancar('00000000-0000-4000-8000-000000000101', 'despesa', 'individual', '00000000-0000-4000-8000-00000000f205',
                      array['2030-03-07']::date[], array[6000]::bigint[]);

-- Individual de A antes dos lançamentos de B e da conjunta com o mesmo nome
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select set_config('teste.individual_a_antes', app.orcado_realizado('2030-03-01', 'individual')::text, true);
reset role;

select pg_temp.lancar('00000000-0000-4000-8000-000000000102', 'despesa', 'individual', '00000000-0000-4000-8000-00000000f206',
                      array['2030-03-08']::date[], array[3000]::bigint[]);
select pg_temp.lancar('00000000-0000-4000-8000-000000000101', 'despesa', 'conjunto', '00000000-0000-4000-8000-00000000f204',
                      array['2030-03-20']::date[], array[1500]::bigint[]);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select set_config('teste.conjunto_a', app.orcado_realizado('2030-03-01', 'conjunto')::text, true);
select set_config('teste.individual_a', app.orcado_realizado('2030-03-01', 'individual')::text, true);
select set_config('teste.vazio_a', app.orcado_realizado('2030-08-01', 'conjunto')::text, true);
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select set_config('teste.conjunto_b', app.orcado_realizado('2030-03-15', 'conjunto')::text, true);
select set_config('teste.individual_b', app.orcado_realizado('2030-03-01', 'individual')::text, true);
reset role;

-- Conjunto
select is(current_setting('teste.conjunto_a')::jsonb -> 'linhas', $$[
  {"categoria_id": "00000000-0000-4000-8000-00000000f202", "nome": "Orc Casa T",    "orcado_centavos": 20000, "realizado_centavos": 18000, "percentual": 90, "situacao": "atencao"},
  {"categoria_id": "00000000-0000-4000-8000-00000000f201", "nome": "Orc Mercado T", "orcado_centavos": 10000, "realizado_centavos": 4000,  "percentual": 40, "situacao": "dentro"}
]$$::jsonb, 'linhas do conjunto: só a parcela do mês, ordenadas por percentual');

select is(current_setting('teste.conjunto_a')::jsonb -> 'total',
  '{"orcado_centavos": 30000, "realizado_centavos": 25500, "percentual": 85, "situacao": "atencao"}'::jsonb,
  'total do conjunto soma o orçado das linhas e todas as despesas conjuntas do mês');

select is(current_setting('teste.conjunto_b')::jsonb, current_setting('teste.conjunto_a')::jsonb, 'conjunto igual para A e B');

-- Individual
select is(current_setting('teste.individual_a')::jsonb -> 'linhas', $$[
  {"categoria_id": "00000000-0000-4000-8000-00000000f205", "nome": "Orc Lazer T", "orcado_centavos": 5000, "realizado_centavos": 6000, "percentual": 120, "situacao": "estourado"}
]$$::jsonb, 'individual de A só com a categoria individual de A');

select is(current_setting('teste.individual_a')::jsonb -> 'total',
  '{"orcado_centavos": 5000, "realizado_centavos": 6000, "percentual": 120, "situacao": "estourado"}'::jsonb,
  'total individual de A sem receita e sem a parte de A nas conjuntas');

select is(current_setting('teste.individual_a')::jsonb, current_setting('teste.individual_a_antes')::jsonb,
  'individual de A não muda com individual de B nem com conjunta de mesmo nome');

select is(current_setting('teste.individual_b')::jsonb -> 'linhas', $$[
  {"categoria_id": "00000000-0000-4000-8000-00000000f206", "nome": "Orc Lazer T", "orcado_centavos": 7000, "realizado_centavos": 3000, "percentual": 43, "situacao": "dentro"}
]$$::jsonb, 'individual de B só com a categoria de B');

select ok(position('00000000-0000-4000-8000-00000000f205' in current_setting('teste.individual_b')) = 0,
  'B nunca recebe linha individual de A');

-- Escopo sem orçamento
select ok(coalesce(current_setting('teste.vazio_a')::jsonb -> 'total', 'null'::jsonb) = 'null'::jsonb, 'sem orçamento: total nulo');
select is(current_setting('teste.vazio_a')::jsonb -> 'linhas', '[]'::jsonb, 'sem orçamento: linhas vazias');

-- Catálogo
select ok(not (select prosecdef from pg_proc where oid = 'app.orcado_realizado(date, text)'::regprocedure), 'orcado_realizado é security invoker');
select ok((select proconfig from pg_proc where oid = 'app.orcado_realizado(date, text)'::regprocedure) @> array['search_path=""'], 'orcado_realizado com search_path vazio');
select ok(not has_function_privilege('anon', 'app.orcado_realizado(date, text)', 'execute'), 'anon não executa orcado_realizado');
select ok(not has_function_privilege('anon', 'app.orcamentos_escopo(date, text)', 'execute'), 'anon não executa orcamentos_escopo');
select ok(
  position('valor_total_centavos' in pg_get_functiondef('app.orcado_realizado(date, text)'::regprocedure)
                                  || pg_get_functiondef('app.orcamentos_escopo(date, text)'::regprocedure)
                                  || pg_get_functiondef('app.situacao_orcamento(bigint, bigint)'::regprocedure)) = 0,
  'nenhuma das funções lê valor_total_centavos');

select * from finish();
rollback;
