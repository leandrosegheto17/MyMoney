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

-- Conjunta Pix e conjunta Crédito 3x de A.
select pg_temp.lancar('e0000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000101',
  'despesa', 'conjunto', 'e0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-0000000000f1',
  'e0000000-0000-4000-8000-0000000000c1', '2031-03-05', null, array[10000]::bigint[], array['2031-03-05']::date[]);
select pg_temp.lancar('e0000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-000000000101',
  'despesa', 'conjunto', 'e0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-0000000000f2', null,
  '2031-03-15', 10, array[12000, 12000, 12000]::bigint[], array['2031-04-10', '2031-05-10', '2031-06-10']::date[]);

select testes.como_a();

select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000701',
                     p_valor_total_centavos => 0)$$,
  'P0001', 'valor_invalido', 'valor 0');
select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000701',
                     p_valor_total_centavos => -1)$$,
  'P0001', 'valor_invalido', 'valor negativo');
select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000702',
                     p_num_parcelas => 25)$$,
  'P0001', 'valor_invalido', 'crédito em 25 parcelas');
select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000701',
                     p_num_parcelas => 2)$$,
  'P0001', 'valor_invalido', 'Pix com 2 parcelas');
select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000702',
                     p_forma_id => 'e0000000-0000-4000-8000-0000000000f1')$$,
  'P0001', 'valor_invalido', 'crédito 3x trocado para Pix sem voltar a 1 parcela');
select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000701',
                     p_categoria_id => 'e0000000-0000-4000-8000-0000000000a5')$$,
  'P0001', 'registro_invalido', 'categoria de receita numa despesa');
select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000701',
                     p_categoria_id => 'e0000000-0000-4000-8000-0000000000a4')$$,
  'P0001', 'registro_invalido', 'categoria individual de B');
select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000701',
                     p_categoria_id => gen_random_uuid())$$,
  'P0001', 'registro_invalido', 'categoria inexistente');
select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000701',
                     p_forma_id => 'e0000000-0000-4000-8000-0000000000f3')$$,
  'P0001', 'registro_invalido', 'forma de B');

select testes.como_postgres();
select results_eq(
  $$select l.valor_total_centavos, l.categoria_id, l.num_parcelas::int, lp.forma_pagamento_id, l.alterado_por
      from app.lancamento l join app.lancamento_pagamento lp on lp.lancamento_id = l.id
     where l.id = 'e0000000-0000-4000-8000-000000000701'$$,
  $$values (10000::bigint, 'e0000000-0000-4000-8000-0000000000a1'::uuid, 1,
            'e0000000-0000-4000-8000-0000000000f1'::uuid, null::uuid)$$,
  'nada gravado após as recusas');

-- ===== Sem membro =====
select testes.como_sem_membro();
select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000701',
                     p_descricao => 'x')$$,
  'P0001', 'registro_invalido', 'usuário sem membro');
select testes.como_postgres();

-- ===== Catálogo =====
select ok((select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'api' and p.proname = 'editar_lancamento'),
  'editar_lancamento é security definer');
select ok((select 'search_path=""' = any(p.proconfig) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'api' and p.proname = 'editar_lancamento'),
  'search_path vazio');
select ok(not has_function_privilege('anon',
  'api.editar_lancamento(uuid, bigint, uuid, text, date, uuid, integer, boolean)', 'execute'), 'anon sem execute');
select ok(has_function_privilege('authenticated',
  'api.editar_lancamento(uuid, bigint, uuid, text, date, uuid, integer, boolean)', 'execute'), 'authenticated com execute');

select * from finish();
rollback;
