begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(19);

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

-- Crédito 3x de A: R$ 360 comprado em 15/03, cartão com dia 10.
select pg_temp.lancar('e0000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000101',
  'despesa', 'conjunto', 'e0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-0000000000f2', null,
  '2031-03-15', 10, array[12000, 12000, 12000]::bigint[], array['2031-04-10', '2031-05-10', '2031-06-10']::date[]);
-- Crédito 3x de A, para aumentar o número de parcelas.
select pg_temp.lancar('e0000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000101',
  'despesa', 'individual', 'e0000000-0000-4000-8000-0000000000a3', 'e0000000-0000-4000-8000-0000000000f2', null,
  '2031-03-15', 10, array[3334, 3333, 3333]::bigint[], array['2031-04-10', '2031-05-10', '2031-06-10']::date[]);

create temp table ids_antes as
  select lancamento_id, numero, id from app.parcela
   where lancamento_id in ('e0000000-0000-4000-8000-000000000501', 'e0000000-0000-4000-8000-000000000502');

-- O dia da forma muda depois da compra: o recálculo usa o dia congelado.
update app.forma_pagamento set dia_vencimento = 20 where id = 'e0000000-0000-4000-8000-0000000000f2';

-- ===== Valor novo mantém o dia congelado =====
select testes.como_a();
select lives_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000501',
                    p_valor_total_centavos => 60000)$$, 'A muda o valor de 360 para 600');
select testes.como_postgres();

select results_eq(
  $$select numero::int, valor_centavos, data, data_ajustada from app.parcela
     where lancamento_id = 'e0000000-0000-4000-8000-000000000501' order by numero$$,
  $$values (1, 20000::bigint, '2031-04-10'::date, false), (2, 20000::bigint, '2031-05-10'::date, false),
           (3, 20000::bigint, '2031-06-10'::date, false)$$,
  'parcelas recalculadas com o dia congelado 10, não o 20 atual da forma');
select is((select dia_vencimento_aplicado::int from app.lancamento_pagamento
            where lancamento_id = 'e0000000-0000-4000-8000-000000000501'), 10, 'dia aplicado continua 10');
select set_eq(
  $$select id from app.parcela where lancamento_id = 'e0000000-0000-4000-8000-000000000501'$$,
  $$select id from ids_antes where lancamento_id = 'e0000000-0000-4000-8000-000000000501'$$,
  'ids das parcelas mantidas são preservados');

-- ===== Data da compra nova =====
select testes.como_a();
select lives_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000501',
                    p_data => '2031-04-15')$$, 'A muda a data da compra');
select testes.como_postgres();
select results_eq(
  $$select data from app.parcela where lancamento_id = 'e0000000-0000-4000-8000-000000000501' order by numero$$,
  $$values ('2031-05-10'::date), ('2031-06-10'::date), ('2031-07-10'::date)$$,
  'parcelas recalculadas a partir da nova data da compra');
select is((select data_operacao from app.lancamento_pagamento
            where lancamento_id = 'e0000000-0000-4000-8000-000000000501'), '2031-04-15'::date,
  'data da operação gravada');

-- ===== Outro cartão usa o dia novo =====
select testes.como_a();
select lives_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000501',
                    p_forma_id => 'e0000000-0000-4000-8000-0000000000f5')$$, 'A troca para outro cartão');
select testes.como_postgres();
select results_eq(
  $$select data from app.parcela where lancamento_id = 'e0000000-0000-4000-8000-000000000501' order by numero$$,
  $$values ('2031-05-25'::date), ('2031-06-25'::date), ('2031-07-25'::date)$$,
  'parcelas no dia de vencimento do cartão novo');
select results_eq(
  $$select forma_pagamento_id, dia_vencimento_aplicado::int, conta_id from app.lancamento_pagamento
     where lancamento_id = 'e0000000-0000-4000-8000-000000000501'$$,
  $$values ('e0000000-0000-4000-8000-0000000000f5'::uuid, 25, null::uuid)$$,
  'grava a forma nova e o dia aplicado 25; crédito sem conta');

-- ===== Crédito para Pix =====
select testes.como_a();
select lives_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000501',
                    p_forma_id => 'e0000000-0000-4000-8000-0000000000f1', p_num_parcelas => 1)$$,
  'A troca o crédito por Pix à vista');
select testes.como_postgres();
select results_eq(
  $$select numero::int, valor_centavos, data from app.parcela
     where lancamento_id = 'e0000000-0000-4000-8000-000000000501'$$,
  $$values (1, 60000::bigint, '2031-04-15'::date)$$,
  'Pix: 1 parcela com o total na data da operação');
select is((select id from app.parcela where lancamento_id = 'e0000000-0000-4000-8000-000000000501'),
  (select id from ids_antes where lancamento_id = 'e0000000-0000-4000-8000-000000000501' and numero = 1),
  'a parcela 1 mantém o id');
select results_eq(
  $$select forma_pagamento_id, conta_id from app.lancamento_pagamento
     where lancamento_id = 'e0000000-0000-4000-8000-000000000501'$$,
  $$values ('e0000000-0000-4000-8000-0000000000f1'::uuid, 'e0000000-0000-4000-8000-0000000000c1'::uuid)$$,
  'Pix grava a conta da forma');
select is((select num_parcelas::int from app.lancamento where id = 'e0000000-0000-4000-8000-000000000501'), 1,
  'cabeçalho com 1 parcela');

-- ===== Mais parcelas =====
select testes.como_a();
select lives_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000502',
                    p_num_parcelas => 4)$$, 'A muda de 3x para 4x');
select testes.como_postgres();
select results_eq(
  $$select numero::int, valor_centavos, data from app.parcela
     where lancamento_id = 'e0000000-0000-4000-8000-000000000502' order by numero$$,
  $$values (1, 2500::bigint, '2031-04-10'::date), (2, 2500::bigint, '2031-05-10'::date),
           (3, 2500::bigint, '2031-06-10'::date), (4, 2500::bigint, '2031-07-10'::date)$$,
  '4 parcelas, soma igual ao total');
select set_eq(
  $$select id from app.parcela where lancamento_id = 'e0000000-0000-4000-8000-000000000502' and numero <= 3$$,
  $$select id from ids_antes where lancamento_id = 'e0000000-0000-4000-8000-000000000502'$$,
  'as 3 parcelas que ficaram mantêm o id');
select is(
  (select sum(p.valor_centavos) from app.parcela p where p.lancamento_id = 'e0000000-0000-4000-8000-000000000502'),
  (select l.valor_total_centavos::numeric from app.lancamento l where l.id = 'e0000000-0000-4000-8000-000000000502'),
  'soma das parcelas = total do cabeçalho');

select * from finish();
rollback;
