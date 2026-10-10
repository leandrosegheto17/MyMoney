begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(9);

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

-- Despesa Pix de A, para o reenvio do id como receita.
select pg_temp.lancar('e0000000-0000-4000-8000-000000000933', '00000000-0000-4000-8000-000000000101',
  'despesa', 'individual', 'e0000000-0000-4000-8000-0000000000a3', 'e0000000-0000-4000-8000-0000000000f1',
  'e0000000-0000-4000-8000-0000000000c1', '2031-03-06', null, array[4000]::bigint[], array['2031-03-06']::date[]);

select testes.como_a();

select is(
  api.lancar_receita('e0000000-0000-4000-8000-000000000931', 750000, 'e0000000-0000-4000-8000-0000000000a5',
                     'e0000000-0000-4000-8000-0000000000c1', '2031-03-05'),
  jsonb_build_object('id', 'e0000000-0000-4000-8000-000000000931', 'escopo', 'individual', 'categoria', 'Teste receita A',
                     'valor_total_centavos', 750000, 'num_parcelas', 1,
                     'primeira_parcela_data', '2031-03-05', 'ja_existia', false),
  '1º envio grava');
select is(
  api.lancar_receita('e0000000-0000-4000-8000-000000000931', 750000, 'e0000000-0000-4000-8000-0000000000a5',
                     'e0000000-0000-4000-8000-0000000000c1', '2031-03-05'),
  jsonb_build_object('id', 'e0000000-0000-4000-8000-000000000931', 'escopo', 'individual', 'categoria', 'Teste receita A',
                     'valor_total_centavos', 750000, 'num_parcelas', 1,
                     'primeira_parcela_data', '2031-03-05', 'ja_existia', true),
  '2º envio devolve a mesma resposta com ja_existia = true');
select is(
  api.lancar_receita('e0000000-0000-4000-8000-000000000931', 99900, 'e0000000-0000-4000-8000-0000000000a5',
                     'e0000000-0000-4000-8000-0000000000c1', '2031-04-01')->>'valor_total_centavos',
  '750000', 'reenvio com valor e data diferentes devolve o gravado');

select testes.como_postgres();
select results_eq(
  $$select (select count(*) from app.lancamento where id = 'e0000000-0000-4000-8000-000000000931'),
           (select count(*) from app.lancamento_pagamento where lancamento_id = 'e0000000-0000-4000-8000-000000000931'),
           (select count(*) from app.parcela where lancamento_id = 'e0000000-0000-4000-8000-000000000931')$$,
  $$values (1::bigint, 1::bigint, 1::bigint)$$,
  '1 lançamento, 1 pagamento e 1 parcela');
select results_eq(
  $$select l.valor_total_centavos, p.data from app.lancamento l join app.parcela p on p.lancamento_id = l.id
     where l.id = 'e0000000-0000-4000-8000-000000000931'$$,
  $$values (750000::bigint, '2031-03-05'::date)$$,
  'reenvio não altera nada');

-- B com o id da receita de A
select testes.como_b();
select throws_ok($$select api.lancar_receita('e0000000-0000-4000-8000-000000000931', 10000,
                     'e0000000-0000-4000-8000-0000000000a6', 'e0000000-0000-4000-8000-0000000000c2')$$,
  'P0001', 'registro_invalido', 'B com o id da receita de A');
select testes.como_postgres();
select is((select dono_id from app.lancamento where id = 'e0000000-0000-4000-8000-000000000931'),
  '00000000-0000-4000-8000-000000000101'::uuid, 'receita de A continua de A');

-- Id de uma despesa de A reenviado como receita por A: devolve a despesa gravada.
select testes.como_a();
select is(
  (select jsonb_build_array(r->>'id', r->>'ja_existia') from
     (select api.lancar_receita('e0000000-0000-4000-8000-000000000933', 10000, 'e0000000-0000-4000-8000-0000000000a5',
                                'e0000000-0000-4000-8000-0000000000c1') as r) t),
  jsonb_build_array('e0000000-0000-4000-8000-000000000933', 'true'),
  'id de despesa própria devolve a despesa com ja_existia = true');
select testes.como_postgres();
select results_eq(
  $$select tipo, valor_total_centavos from app.lancamento where id = 'e0000000-0000-4000-8000-000000000933'$$,
  $$values ('despesa'::text, 4000::bigint)$$,
  'a despesa não vira receita');

select * from finish();
rollback;
