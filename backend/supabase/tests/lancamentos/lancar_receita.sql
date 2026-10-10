begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(11);

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

insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e0000000-0000-4000-8000-0000000000a6', (select id from app.lar), 'receita', 'individual', '00000000-0000-4000-8000-000000000102', 'Teste receita B', null);

-- A lança R$ 7.500,00 em "Salário" (seed de categorias) na conta Nubank (seed de contas).
select testes.como_a();

select is(
  api.lancar_receita('e0000000-0000-4000-8000-000000000901', 750000, '00000000-0000-4000-8000-000000000421',
                     '00000000-0000-4000-8000-000000000201', '2031-03-05', 'Salário de março'),
  jsonb_build_object('id', 'e0000000-0000-4000-8000-000000000901', 'escopo', 'individual', 'categoria', 'Salário',
                     'valor_total_centavos', 750000, 'num_parcelas', 1,
                     'primeira_parcela_data', '2031-03-05', 'ja_existia', false),
  'resposta na forma da de lancar_despesa');

select testes.como_postgres();
select results_eq(
  $$select tipo, escopo, dono_id, categoria_id, descricao, valor_total_centavos, num_parcelas::int
      from app.lancamento where id = 'e0000000-0000-4000-8000-000000000901'$$,
  $$values ('receita'::text, 'individual'::text, '00000000-0000-4000-8000-000000000101'::uuid,
            '00000000-0000-4000-8000-000000000421'::uuid, 'Salário de março'::text, 750000::bigint, 1)$$,
  '1 lançamento de receita individual do membro');
select results_eq(
  $$select dono_id, conta_id, forma_pagamento_id, data_operacao, dia_vencimento_aplicado::int
      from app.lancamento_pagamento where lancamento_id = 'e0000000-0000-4000-8000-000000000901'$$,
  $$values ('00000000-0000-4000-8000-000000000101'::uuid, '00000000-0000-4000-8000-000000000201'::uuid,
            null::uuid, '2031-03-05'::date, null::int)$$,
  '1 pagamento com a conta de destino e sem forma');
select results_eq(
  $$select numero::int, valor_centavos, data, data_ajustada, escopo, dono_id
      from app.parcela where lancamento_id = 'e0000000-0000-4000-8000-000000000901'$$,
  $$values (1, 750000::bigint, '2031-03-05'::date, false, 'individual'::text, '00000000-0000-4000-8000-000000000101'::uuid)$$,
  '1 parcela com o valor total na data');

-- Sem data: app.hoje(). Descrição em branco: nula.
select testes.como_a();
select lives_ok($$select api.lancar_receita('e0000000-0000-4000-8000-000000000902', 10000,
                    '00000000-0000-4000-8000-000000000421', '00000000-0000-4000-8000-000000000201',
                    p_descricao => '   ')$$,
  'receita sem data e com descrição em branco');
select testes.como_postgres();
select results_eq(
  $$select p.data, lp.data_operacao, l.descricao
      from app.parcela p
      join app.lancamento l on l.id = p.lancamento_id
      join app.lancamento_pagamento lp on lp.lancamento_id = l.id
     where l.id = 'e0000000-0000-4000-8000-000000000902'$$,
  $$values (app.hoje(), app.hoje(), null::text)$$,
  'data padrão é app.hoje() e a descrição em branco fica nula');

-- B lança na própria conta e categoria de receita.
select testes.como_b();
select is(api.lancar_receita('e0000000-0000-4000-8000-000000000903', 20000,
            'e0000000-0000-4000-8000-0000000000a6', 'e0000000-0000-4000-8000-0000000000c2', '2031-03-06')->>'escopo',
  'individual', 'B lança receita própria');
select is((select count(*)::int from app.lancamento where id = 'e0000000-0000-4000-8000-000000000901'), 0,
  'B não vê a receita de A');
select testes.como_postgres();
select is((select dono_id from app.lancamento where id = 'e0000000-0000-4000-8000-000000000903'),
  '00000000-0000-4000-8000-000000000102'::uuid, 'receita de B tem B como dono');

-- Catálogo
select ok(not has_function_privilege('anon',
  'api.lancar_receita(uuid, bigint, uuid, uuid, date, text)', 'execute'), 'anon sem execute');
select ok(not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname = 'api' and p.proname = 'lancar_receita'),
  'lancar_receita é security invoker');

select * from finish();
rollback;
