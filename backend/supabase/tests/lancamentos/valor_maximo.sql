begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(16);

-- Teto: R$ 1 bilhão = 100000000000 centavos.
insert into app.conta (id, lar_id, dono_id, nome) values
  ('e3900000-0000-4000-8000-0000000000c1', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Conta teto A');
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento) values
  ('e3900000-0000-4000-8000-0000000000f1', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Pix teto A', 'pix', 'e3900000-0000-4000-8000-0000000000c1', null);
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e3900000-0000-4000-8000-0000000000a1', (select id from app.lar), 'despesa', 'conjunto', null, 'Teste teto conjunta', true),
  ('e3900000-0000-4000-8000-0000000000a5', (select id from app.lar), 'receita', 'individual', '00000000-0000-4000-8000-000000000101', 'Teste teto receita A', null);

select testes.como_a();

-- Lançar despesa
select throws_ok($$select api.lancar_despesa('e3900000-0000-4000-8000-000000000001', 100000000001,
    'e3900000-0000-4000-8000-0000000000a1', 'e3900000-0000-4000-8000-0000000000f1')$$,
  'P0001', 'valor_invalido', 'despesa: teto + 1 é recusado');
select throws_ok($$select api.lancar_despesa('e3900000-0000-4000-8000-000000000001', 9223372036854775807,
    'e3900000-0000-4000-8000-0000000000a1', 'e3900000-0000-4000-8000-0000000000f1')$$,
  'P0001', 'valor_invalido', 'despesa: bigint máximo é recusado');
select throws_ok($$select api.lancar_despesa('e3900000-0000-4000-8000-000000000001', 0,
    'e3900000-0000-4000-8000-0000000000a1', 'e3900000-0000-4000-8000-0000000000f1')$$,
  'P0001', 'valor_invalido', 'despesa: valor 0 segue recusado');
select lives_ok($$select api.lancar_despesa('e3900000-0000-4000-8000-000000000002', 100000000000,
    'e3900000-0000-4000-8000-0000000000a1', 'e3900000-0000-4000-8000-0000000000f1')$$,
  'despesa: valor no teto passa');
select lives_ok($$select api.lancar_despesa('e3900000-0000-4000-8000-000000000003', 100000000000,
    'e3900000-0000-4000-8000-0000000000a1', 'e3900000-0000-4000-8000-0000000000f1')$$,
  'despesa: segundo lançamento no teto passa');

-- Lançar receita
select throws_ok($$select api.lancar_receita('e3900000-0000-4000-8000-000000000011', 100000000001,
    'e3900000-0000-4000-8000-0000000000a5', 'e3900000-0000-4000-8000-0000000000c1')$$,
  'P0001', 'valor_invalido', 'receita: teto + 1 é recusado');
select throws_ok($$select api.lancar_receita('e3900000-0000-4000-8000-000000000011', 9223372036854775807,
    'e3900000-0000-4000-8000-0000000000a5', 'e3900000-0000-4000-8000-0000000000c1')$$,
  'P0001', 'valor_invalido', 'receita: bigint máximo é recusado');
select lives_ok($$select api.lancar_receita('e3900000-0000-4000-8000-000000000012', 100000000000,
    'e3900000-0000-4000-8000-0000000000a5', 'e3900000-0000-4000-8000-0000000000c1')$$,
  'receita: valor no teto passa');

-- Editar
select throws_ok($$select api.editar_lancamento(p_id => 'e3900000-0000-4000-8000-000000000002',
    p_valor_total_centavos => 100000000001)$$,
  'P0001', 'valor_invalido', 'editar: teto + 1 é recusado');
select throws_ok($$select api.editar_lancamento(p_id => 'e3900000-0000-4000-8000-000000000002',
    p_valor_total_centavos => 9223372036854775807, p_confirmar_descarte => true)$$,
  'P0001', 'valor_invalido', 'editar: bigint máximo é recusado');
select throws_ok($$select api.editar_lancamento(p_id => 'e3900000-0000-4000-8000-000000000002',
    p_valor_total_centavos => 0)$$,
  'P0001', 'valor_invalido', 'editar: valor 0 segue recusado');
select lives_ok($$select api.editar_lancamento(p_id => 'e3900000-0000-4000-8000-000000000002',
    p_valor_total_centavos => 99999999999)$$,
  'editar: abaixo do teto passa');
select lives_ok($$select api.editar_lancamento(p_id => 'e3900000-0000-4000-8000-000000000002',
    p_valor_total_centavos => 100000000000)$$,
  'editar: valor no teto passa');

-- Soma de dois lançamentos no teto não estoura bigint
select is((select sum(l.valor_total_centavos)::numeric from app.lancamento l
           where l.id in ('e3900000-0000-4000-8000-000000000002', 'e3900000-0000-4000-8000-000000000003')),
  200000000000::numeric, 'sum de dois lançamentos no teto');

-- Constraint da tabela (defesa em profundidade)
select testes.como_postgres();
select throws_ok($$update app.lancamento set valor_total_centavos = 100000000001
    where id = 'e3900000-0000-4000-8000-000000000003'$$,
  '23514', null, 'check da tabela recusa teto + 1');
select is((select count(*)::int from app.lancamento where id = 'e3900000-0000-4000-8000-000000000001'), 0,
  'nada gravado após as recusas');

select * from finish();
rollback;
