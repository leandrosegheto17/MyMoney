begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(12);

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

-- Crédito 3x de A com a 3ª parcela ajustada à mão.
select pg_temp.lancar('e0000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000101',
  'despesa', 'conjunto', 'e0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-0000000000f2', null,
  '2031-03-15', 10, array[12000, 12000, 12000]::bigint[], array['2031-04-10', '2031-05-10', '2031-06-17']::date[],
  'Geladeira');
update app.parcela set data_ajustada = true
 where lancamento_id = 'e0000000-0000-4000-8000-000000000601' and numero = 3;

-- ===== Recálculo sem confirmar =====
select testes.como_a();
select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000601',
                     p_valor_total_centavos => 60000)$$,
  'P0001', 'confirmar_descarte_ajustes', 'recálculo com parcela ajustada pede confirmação');
select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000601',
                     p_valor_total_centavos => 60000, p_confirmar_descarte => false)$$,
  'P0001', 'confirmar_descarte_ajustes', 'confirmar_descarte = false explícito também pede');
select testes.como_postgres();

select results_eq(
  $$select valor_total_centavos, alterado_por, alterado_em from app.lancamento
     where id = 'e0000000-0000-4000-8000-000000000601'$$,
  $$values (36000::bigint, null::uuid, null::timestamptz)$$,
  'nada gravado no cabeçalho, nem alterado_por');
select results_eq(
  $$select numero::int, valor_centavos, data, data_ajustada from app.parcela
     where lancamento_id = 'e0000000-0000-4000-8000-000000000601' order by numero$$,
  $$values (1, 12000::bigint, '2031-04-10'::date, false), (2, 12000::bigint, '2031-05-10'::date, false),
           (3, 12000::bigint, '2031-06-17'::date, true)$$,
  'parcelas intactas, ajuste preservado');

-- ===== Só descrição: sem confirmação e sem recálculo =====
select testes.como_a();
select lives_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000601',
                    p_descricao => 'Geladeira nova')$$, 'mudar só a descrição não pede confirmação');
select testes.como_postgres();
select results_eq(
  $$select data, data_ajustada from app.parcela
     where lancamento_id = 'e0000000-0000-4000-8000-000000000601' order by numero$$,
  $$values ('2031-04-10'::date, false), ('2031-05-10'::date, false), ('2031-06-17'::date, true)$$,
  'parcelas não recalculadas ao mudar só a descrição');
select results_eq(
  $$select descricao, alterado_por from app.lancamento where id = 'e0000000-0000-4000-8000-000000000601'$$,
  $$values ('Geladeira nova'::text, '00000000-0000-4000-8000-000000000101'::uuid)$$,
  'descrição e alterado_por gravados');

-- Descrição vazia limpa (grava nulo).
select testes.como_a();
select lives_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000601',
                    p_descricao => '')$$, 'descrição vazia é aceita');
select testes.como_postgres();
select is((select descricao from app.lancamento where id = 'e0000000-0000-4000-8000-000000000601'), null,
  'descrição vazia grava nulo');

-- ===== Recálculo confirmado =====
select testes.como_a();
select lives_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000601',
                    p_valor_total_centavos => 60000, p_confirmar_descarte => true)$$,
  'com confirmação, recalcula');
select testes.como_postgres();
select results_eq(
  $$select numero::int, valor_centavos, data, data_ajustada from app.parcela
     where lancamento_id = 'e0000000-0000-4000-8000-000000000601' order by numero$$,
  $$values (1, 20000::bigint, '2031-04-10'::date, false), (2, 20000::bigint, '2031-05-10'::date, false),
           (3, 20000::bigint, '2031-06-10'::date, false)$$,
  'ajuste descartado: data recalculada e data_ajustada zerada');
select is((select valor_total_centavos from app.lancamento where id = 'e0000000-0000-4000-8000-000000000601'),
  60000::bigint, 'valor novo gravado');

select * from finish();
rollback;
