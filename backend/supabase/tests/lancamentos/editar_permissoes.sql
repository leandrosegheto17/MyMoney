begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(20);

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

-- Conjunta Pix paga por A
select pg_temp.lancar('e0000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000101',
  'despesa', 'conjunto', 'e0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-0000000000f1',
  'e0000000-0000-4000-8000-0000000000c1', '2031-03-05', null, array[10000]::bigint[], array['2031-03-05']::date[], 'Mercado');
-- Conjunta Crédito 3x paga por A
select pg_temp.lancar('e0000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000101',
  'despesa', 'conjunto', 'e0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-0000000000f2', null,
  '2031-03-15', 10, array[12000, 12000, 12000]::bigint[], array['2031-04-10', '2031-05-10', '2031-06-10']::date[]);
-- Individual de A
select pg_temp.lancar('e0000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000101',
  'despesa', 'individual', 'e0000000-0000-4000-8000-0000000000a3', 'e0000000-0000-4000-8000-0000000000f1',
  'e0000000-0000-4000-8000-0000000000c1', '2031-03-06', null, array[4000]::bigint[], array['2031-03-06']::date[]);

-- ===== B edita a conjunta Pix de A no que pode =====
select testes.como_b();

select is(
  (select array_agg(k order by k) from jsonb_object_keys(api.editar_lancamento(
     p_id => 'e0000000-0000-4000-8000-000000000401', p_descricao => 'Mercado do mês',
     p_valor_total_centavos => 15000, p_categoria_id => 'e0000000-0000-4000-8000-0000000000a2',
     p_data => '2031-03-06')) k),
  array['alterado_em', 'escopo', 'id', 'num_parcelas'],
  'B edita descrição, valor, categoria conjunta e data; resposta mínima sem dado privado');

select testes.como_postgres();
select results_eq(
  $$select descricao, valor_total_centavos, categoria_id, alterado_por, alterado_em is not null
      from app.lancamento where id = 'e0000000-0000-4000-8000-000000000401'$$,
  $$values ('Mercado do mês'::text, 15000::bigint, 'e0000000-0000-4000-8000-0000000000a2'::uuid,
            '00000000-0000-4000-8000-000000000102'::uuid, true)$$,
  'cabeçalho gravado com alterado_por = B');
select results_eq(
  $$select numero::int, valor_centavos, data from app.parcela
     where lancamento_id = 'e0000000-0000-4000-8000-000000000401'$$,
  $$values (1, 15000::bigint, '2031-03-06'::date)$$,
  'parcela única do Pix segue valor e data novos');
select results_eq(
  $$select forma_pagamento_id, conta_id, data_operacao from app.lancamento_pagamento
     where lancamento_id = 'e0000000-0000-4000-8000-000000000401'$$,
  $$values ('e0000000-0000-4000-8000-0000000000f1'::uuid, 'e0000000-0000-4000-8000-0000000000c1'::uuid, '2031-03-06'::date)$$,
  'a data da operação de A muda; forma e conta continuam as de A');

-- ===== B tenta o que não pode =====
select testes.como_b();

select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000401',
                     p_forma_id => 'e0000000-0000-4000-8000-0000000000f2')$$,
  'P0001', 'sem_permissao', 'B não troca a forma de A');
select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000402',
                     p_num_parcelas => 6)$$,
  'P0001', 'sem_permissao', 'B não muda o número de parcelas de A');
select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000402',
                     p_data => '2031-03-20')$$,
  'P0001', 'sem_permissao', 'B não muda a data de uma conjunta no crédito');
select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000401',
                     p_categoria_id => 'e0000000-0000-4000-8000-0000000000a4')$$,
  'P0001', 'sem_permissao', 'B não troca para categoria individual');
select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000402',
                     p_descricao => 'Junto com proibido', p_num_parcelas => 6)$$,
  'P0001', 'sem_permissao', 'mudança permitida junto com proibida é recusada inteira');
select lives_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000402',
                    p_num_parcelas => 3, p_descricao => 'Sofá')$$,
  'parâmetro igual ao gravado não conta como mudança');

select testes.como_postgres();
select results_eq(
  $$select l.num_parcelas::int, lp.forma_pagamento_id, lp.data_operacao,
           (select array_agg(p.data order by p.numero) from app.parcela p where p.lancamento_id = l.id)
      from app.lancamento l join app.lancamento_pagamento lp on lp.lancamento_id = l.id
     where l.id = 'e0000000-0000-4000-8000-000000000402'$$,
  $$values (3, 'e0000000-0000-4000-8000-0000000000f2'::uuid, '2031-03-15'::date,
            array['2031-04-10', '2031-05-10', '2031-06-10']::date[])$$,
  'nada de forma, parcelas ou data mudou após as recusas');
select is((select forma_pagamento_id from app.lancamento_pagamento
            where lancamento_id = 'e0000000-0000-4000-8000-000000000401'),
  'e0000000-0000-4000-8000-0000000000f1'::uuid, 'forma da conjunta Pix continua a de A');
select is((select descricao from app.lancamento where id = 'e0000000-0000-4000-8000-000000000402'),
  'Sofá', 'só a descrição da edição permitida foi gravada');

-- ===== Registro invisível ou inexistente =====
select testes.como_b();
select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000403',
                     p_descricao => 'x')$$,
  'P0001', 'registro_invalido', 'B edita individual de A');
select throws_ok($$select api.editar_lancamento(p_id => gen_random_uuid(), p_descricao => 'x')$$,
  'P0001', 'registro_invalido', 'id inexistente: mesmo erro');
select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000403',
                     p_forma_id => 'e0000000-0000-4000-8000-0000000000f3')$$,
  'P0001', 'registro_invalido', 'individual de A com mudança proibida também dá registro_invalido');

-- ===== Dono troca o escopo =====
select testes.como_postgres();
select testes.como_a();
select is(api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000402',
            p_categoria_id => 'e0000000-0000-4000-8000-0000000000a3')->>'escopo',
  'individual', 'A troca a conjunta para individual');

select testes.como_postgres();
select results_eq(
  $$select escopo, categoria_id, alterado_por from app.lancamento where id = 'e0000000-0000-4000-8000-000000000402'$$,
  $$values ('individual'::text, 'e0000000-0000-4000-8000-0000000000a3'::uuid, '00000000-0000-4000-8000-000000000101'::uuid)$$,
  'lançamento com escopo e categoria novos e alterado_por = A');
select is(
  (select array_agg(distinct escopo) from app.parcela where lancamento_id = 'e0000000-0000-4000-8000-000000000402'),
  array['individual']::text[], 'escopo das parcelas acompanha');

select testes.como_b();
select throws_ok($$select api.editar_lancamento(p_id => 'e0000000-0000-4000-8000-000000000402',
                     p_descricao => 'x')$$,
  'P0001', 'registro_invalido', 'depois da troca, B não alcança mais o lançamento');

select testes.como_postgres();

select * from finish();
rollback;
