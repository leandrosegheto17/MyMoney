begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(16);

create function pg_temp.lancar(
  p_id uuid, p_dono uuid, p_tipo text, p_escopo text, p_categoria uuid,
  p_forma uuid, p_conta uuid, p_data_operacao date, p_dia integer,
  p_valores bigint[], p_datas date[], p_descricao text default null
) returns void
language plpgsql as $$
declare
  v_lar uuid := (select l.id from app.lar l);
begin
  insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, descricao,
                              valor_total_centavos, num_parcelas)
  values (p_id, v_lar, p_dono, p_tipo, p_escopo, p_categoria, p_descricao,
          (select sum(v) from unnest(p_valores) v), cardinality(p_valores));
  insert into app.lancamento_pagamento (lancamento_id, dono_id, lar_id, forma_pagamento_id,
                                        conta_id, data_operacao, dia_vencimento_aplicado)
  values (p_id, p_dono, v_lar, p_forma, p_conta, p_data_operacao, p_dia);
  insert into app.parcela (id, lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
  select gen_random_uuid(), p_id, v_lar, p_escopo, p_dono, n, p_valores[n], p_datas[n]
  from generate_subscripts(p_valores, 1) n;
end $$;

insert into app.conta (id, lar_id, dono_id, nome) values
  ('e0000000-0000-4000-8000-0000000000c1', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Conta teste A'),
  ('e0000000-0000-4000-8000-0000000000c2', (select id from app.lar), '00000000-0000-4000-8000-000000000102', 'Conta teste B');

insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento) values
  ('e0000000-0000-4000-8000-0000000000f1', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Pix teste A', 'pix', 'e0000000-0000-4000-8000-0000000000c1', null),
  ('e0000000-0000-4000-8000-0000000000f2', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Crédito teste A', 'credito', null, 10),
  ('e0000000-0000-4000-8000-0000000000f5', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Outro crédito teste A', 'credito', null, 25),
  ('e0000000-0000-4000-8000-0000000000f3', (select id from app.lar), '00000000-0000-4000-8000-000000000102', 'Pix teste B', 'pix', 'e0000000-0000-4000-8000-0000000000c2', null);

insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e0000000-0000-4000-8000-0000000000a1', (select id from app.lar), 'despesa', 'conjunto', null, 'Teste conjunta', true),
  ('e0000000-0000-4000-8000-0000000000a2', (select id from app.lar), 'despesa', 'conjunto', null, 'Teste outra conjunta', false),
  ('e0000000-0000-4000-8000-0000000000a3', (select id from app.lar), 'despesa', 'individual', '00000000-0000-4000-8000-000000000101', 'Teste individual A', true),
  ('e0000000-0000-4000-8000-0000000000a4', (select id from app.lar), 'despesa', 'individual', '00000000-0000-4000-8000-000000000102', 'Teste individual B', true),
  ('e0000000-0000-4000-8000-0000000000a5', (select id from app.lar), 'receita', 'individual', '00000000-0000-4000-8000-000000000101', 'Teste receita A', null);

-- Conjunta de A no crédito 3x (R$ 650 por parcela).
select pg_temp.lancar('e0000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-000000000101',
  'despesa', 'conjunto', 'e0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-0000000000f2', null,
  '2026-08-20', 10, array[65000, 65000, 65000]::bigint[], array['2026-09-10', '2026-10-10', '2026-11-10']::date[]);
-- Individual de A no crédito.
select pg_temp.lancar('e0000000-0000-4000-8000-000000000a02', '00000000-0000-4000-8000-000000000101',
  'despesa', 'individual', 'e0000000-0000-4000-8000-0000000000a3', 'e0000000-0000-4000-8000-0000000000f2', null,
  '2026-09-20', 10, array[8000]::bigint[], array['2026-10-10']::date[]);
-- Conjunta de A no Pix.
select pg_temp.lancar('e0000000-0000-4000-8000-000000000a03', '00000000-0000-4000-8000-000000000101',
  'despesa', 'conjunto', 'e0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-0000000000f1',
  'e0000000-0000-4000-8000-0000000000c1', '2026-10-05', null, array[5000]::bigint[], array['2026-10-05']::date[]);

create function pg_temp.parcela(p_lancamento uuid, p_numero int) returns uuid
language sql as $$
  select id from app.parcela where lancamento_id = p_lancamento and numero = p_numero
$$;
create temp table ids as
  select pg_temp.parcela('e0000000-0000-4000-8000-000000000a01', 2) as p2,
         pg_temp.parcela('e0000000-0000-4000-8000-000000000a01', 3) as p3,
         pg_temp.parcela('e0000000-0000-4000-8000-000000000a02', 1) as individual,
         pg_temp.parcela('e0000000-0000-4000-8000-000000000a03', 1) as pix;
grant select on ids to authenticated;

create temp table totais_antes as
  select (app.totais_conjunto('2026-10-01')->>'total_centavos')::bigint as outubro,
         (app.totais_conjunto('2026-11-01')->>'total_centavos')::bigint as novembro;

-- ===== A move a parcela 2/3 para novembro =====
select testes.como_a();
select lives_ok($$select api.alterar_data_parcela((select p2 from ids), '2026-11-05')$$,
  'A muda a data da própria parcela no crédito');
select testes.como_postgres();

select results_eq(
  $$select numero::int, valor_centavos, data, data_ajustada from app.parcela
     where lancamento_id = 'e0000000-0000-4000-8000-000000000a01' order by numero$$,
  $$values (1, 65000::bigint, '2026-09-10'::date, false), (2, 65000::bigint, '2026-11-05'::date, true),
           (3, 65000::bigint, '2026-11-10'::date, false)$$,
  'só a parcela 2 muda: data nova e data_ajustada; valor e número iguais');
select results_eq(
  $$select categoria_id, valor_total_centavos, alterado_por from app.lancamento
     where id = 'e0000000-0000-4000-8000-000000000a01'$$,
  $$values ('e0000000-0000-4000-8000-0000000000a1'::uuid, 195000::bigint, null::uuid)$$,
  'cabeçalho do lançamento não muda');
select is((select outubro from totais_antes) - (app.totais_conjunto('2026-10-01')->>'total_centavos')::bigint,
  65000::bigint, 'total conjunto de outubro cai o valor da parcela');
select is((app.totais_conjunto('2026-11-01')->>'total_centavos')::bigint - (select novembro from totais_antes),
  65000::bigint, 'total conjunto de novembro sobe o mesmo valor');

-- Mesma data de novo é permitida.
select testes.como_a();
select lives_ok($$select api.alterar_data_parcela((select p2 from ids), '2026-11-05')$$,
  'repetir a mesma data é aceito');
select throws_ok($$select api.alterar_data_parcela((select p3 from ids), null)$$,
  'P0001', 'valor_invalido', 'data nula');
select throws_ok($$select api.alterar_data_parcela((select pix from ids), '2026-10-20')$$,
  'P0001', 'registro_invalido', 'parcela de compra no Pix não é ajustável');
select testes.como_postgres();
select is((select data from app.parcela where id = (select pix from ids)), '2026-10-05'::date,
  'parcela do Pix continua na data da operação');

-- ===== B (vê a conjunta, não é o pagador) =====
select testes.como_b();
select throws_ok($$select api.alterar_data_parcela((select p3 from ids), '2026-12-01')$$,
  'P0001', 'registro_invalido', 'B não altera parcela da conjunta de A');
select throws_ok($$select api.alterar_data_parcela((select individual from ids), '2026-12-01')$$,
  'P0001', 'registro_invalido', 'B não altera parcela da individual de A');
select throws_ok($$select api.alterar_data_parcela(gen_random_uuid(), '2026-12-01')$$,
  'P0001', 'registro_invalido', 'id inexistente dá o mesmo erro');
select testes.como_postgres();
select results_eq(
  $$select data, data_ajustada from app.parcela where id in ((select p3 from ids), (select individual from ids))
     order by data$$,
  $$values ('2026-10-10'::date, false), ('2026-11-10'::date, false)$$,
  'as datas continuam as originais');

-- ===== Sem membro =====
select testes.como_sem_membro();
select throws_ok($$select api.alterar_data_parcela((select p3 from ids), '2026-12-01')$$,
  'P0001', 'registro_invalido', 'usuário sem membro');
select testes.como_postgres();

-- ===== Catálogo =====
select ok(not has_function_privilege('anon', 'api.alterar_data_parcela(uuid, date)', 'execute'), 'anon sem execute');
select ok(not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname = 'api' and p.proname = 'alterar_data_parcela'),
  'alterar_data_parcela é security invoker');

select * from finish();
rollback;
