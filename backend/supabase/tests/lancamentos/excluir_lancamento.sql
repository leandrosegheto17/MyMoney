begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(15);

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

create function pg_temp.restantes(p_id uuid) returns table (lancamentos bigint, parcelas bigint, pagamentos bigint)
language sql as $$
  select (select count(*) from app.lancamento where id = p_id),
         (select count(*) from app.parcela where lancamento_id = p_id),
         (select count(*) from app.lancamento_pagamento where lancamento_id = p_id)
$$;

-- Individual de A no crédito 3x
select pg_temp.lancar('e0000000-0000-4000-8000-000000000801', '00000000-0000-4000-8000-000000000101',
  'despesa', 'individual', 'e0000000-0000-4000-8000-0000000000a3', 'e0000000-0000-4000-8000-0000000000f2', null,
  '2031-03-15', 10, array[12000, 12000, 12000]::bigint[], array['2031-04-10', '2031-05-10', '2031-06-10']::date[]);
-- Conjunta Pix paga por A
select pg_temp.lancar('e0000000-0000-4000-8000-000000000802', '00000000-0000-4000-8000-000000000101',
  'despesa', 'conjunto', 'e0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-0000000000f1',
  'e0000000-0000-4000-8000-0000000000c1', '2031-03-05', null, array[10000]::bigint[], array['2031-03-05']::date[]);
-- Outra individual de A, que B tenta excluir
select pg_temp.lancar('e0000000-0000-4000-8000-000000000803', '00000000-0000-4000-8000-000000000101',
  'despesa', 'individual', 'e0000000-0000-4000-8000-0000000000a3', 'e0000000-0000-4000-8000-0000000000f1',
  'e0000000-0000-4000-8000-0000000000c1', '2031-03-06', null, array[4000]::bigint[], array['2031-03-06']::date[]);
-- Receita de A
select pg_temp.lancar('e0000000-0000-4000-8000-000000000804', '00000000-0000-4000-8000-000000000101',
  'receita', 'individual', 'e0000000-0000-4000-8000-0000000000a5', null,
  'e0000000-0000-4000-8000-0000000000c1', '2031-03-01', null, array[750000]::bigint[], array['2031-03-01']::date[]);

-- ===== A exclui a própria individual no crédito =====
select testes.como_a();
select lives_ok($$select api.excluir_lancamento('e0000000-0000-4000-8000-000000000801')$$,
  'A exclui a própria individual 3x');
select testes.como_postgres();
select results_eq($$select * from pg_temp.restantes('e0000000-0000-4000-8000-000000000801')$$,
  $$values (0::bigint, 0::bigint, 0::bigint)$$, 'lançamento, 3 parcelas e parte privada somem');

-- ===== B exclui a conjunta paga por A =====
select testes.como_b();
select lives_ok($$select api.excluir_lancamento('e0000000-0000-4000-8000-000000000802')$$,
  'B exclui a conjunta paga por A');
select testes.como_postgres();
select results_eq($$select * from pg_temp.restantes('e0000000-0000-4000-8000-000000000802')$$,
  $$values (0::bigint, 0::bigint, 0::bigint)$$,
  'lançamento, parcelas e a linha de pagamento de A somem, mesmo invisível para B');

-- ===== B não exclui individual de A =====
select testes.como_b();
select throws_ok($$select api.excluir_lancamento('e0000000-0000-4000-8000-000000000803')$$,
  'P0001', 'registro_invalido', 'B tenta excluir individual de A');
select throws_ok($$select api.excluir_lancamento('e0000000-0000-4000-8000-000000000804')$$,
  'P0001', 'registro_invalido', 'B tenta excluir receita de A');
select throws_ok($$select api.excluir_lancamento(gen_random_uuid())$$,
  'P0001', 'registro_invalido', 'id inexistente: mesmo erro');
select testes.como_postgres();
select results_eq($$select * from pg_temp.restantes('e0000000-0000-4000-8000-000000000803')$$,
  $$values (1::bigint, 1::bigint, 1::bigint)$$, 'individual de A continua inteira');

-- ===== A exclui a própria receita, duas vezes =====
select testes.como_a();
select lives_ok($$select api.excluir_lancamento('e0000000-0000-4000-8000-000000000804')$$,
  'A exclui a própria receita');
select throws_ok($$select api.excluir_lancamento('e0000000-0000-4000-8000-000000000804')$$,
  'P0001', 'registro_invalido', 'excluir de novo dá registro_invalido');
select testes.como_postgres();
select results_eq($$select * from pg_temp.restantes('e0000000-0000-4000-8000-000000000804')$$,
  $$values (0::bigint, 0::bigint, 0::bigint)$$, 'receita some com parcela e pagamento');

-- ===== Sem membro =====
select testes.como_sem_membro();
select throws_ok($$select api.excluir_lancamento('e0000000-0000-4000-8000-000000000803')$$,
  'P0001', 'registro_invalido', 'usuário sem membro');
select testes.como_postgres();
select results_eq($$select * from pg_temp.restantes('e0000000-0000-4000-8000-000000000803')$$,
  $$values (1::bigint, 1::bigint, 1::bigint)$$, 'nada some para o usuário sem membro');

-- ===== Catálogo =====
select ok(not has_function_privilege('anon', 'api.excluir_lancamento(uuid)', 'execute'), 'anon sem execute');
select ok(not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname = 'api' and p.proname = 'excluir_lancamento'),
  'excluir_lancamento é security invoker');

select * from finish();
rollback;
