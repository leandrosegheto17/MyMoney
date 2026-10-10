begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(31);

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
  ('e0000000-0000-4000-8000-0000000000c1', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Conta teste A');

insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento) values
  ('e0000000-0000-4000-8000-0000000000f1', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Pix teste A', 'pix', 'e0000000-0000-4000-8000-0000000000c1', null),
  ('e0000000-0000-4000-8000-0000000000f2', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Crédito teste A', 'credito', null, 10);

insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e0000000-0000-4000-8000-0000000000a1', (select id from app.lar), 'despesa', 'conjunto', null, 'Teste moradia', false),
  ('e0000000-0000-4000-8000-0000000000a3', (select id from app.lar), 'despesa', 'individual', '00000000-0000-4000-8000-000000000101', 'Teste individual A', true),
  ('e0000000-0000-4000-8000-0000000000a5', (select id from app.lar), 'receita', 'individual', '00000000-0000-4000-8000-000000000101', 'Teste receita A', null);

-- Conjunta de A no crédito 3x: mês anterior, mês de app.hoje() e seguinte (a 3ª com data ajustada).
select pg_temp.lancar('e0000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101',
  'despesa', 'conjunto', 'e0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-0000000000f2', null,
  '2026-08-20', 10, array[65000, 65000, 65000]::bigint[],
  array[(app.inicio_mes(app.hoje()) - interval '1 month' + interval '9 days')::date,
        (app.inicio_mes(app.hoje()) + interval '9 days')::date,
        (app.inicio_mes(app.hoje()) + interval '1 month' + interval '16 days')::date],
  'Geladeira teste');
update app.parcela set data_ajustada = true
 where lancamento_id = 'e0000000-0000-4000-8000-000000000201' and numero = 3;
-- Individual de A, Pix.
select pg_temp.lancar('e0000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101',
  'despesa', 'individual', 'e0000000-0000-4000-8000-0000000000a3', 'e0000000-0000-4000-8000-0000000000f1',
  'e0000000-0000-4000-8000-0000000000c1', '2031-03-05', null, array[4000]::bigint[], array['2031-03-05']::date[]);
-- Receita de A.
select pg_temp.lancar('e0000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000101',
  'receita', 'individual', 'e0000000-0000-4000-8000-0000000000a5', null,
  'e0000000-0000-4000-8000-0000000000c1', '2031-03-01', null, array[750000]::bigint[], array['2031-03-01']::date[]);
-- Conjunta de A no crédito com nenhuma parcela no mês de app.hoje().
select pg_temp.lancar('e0000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000101',
  'despesa', 'conjunto', 'e0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-0000000000f2', null,
  '2031-02-20', 10, array[5000, 5000]::bigint[], array['2031-03-10', '2031-04-10']::date[]);
-- Conjunta de A no Pix (tem conta e forma privadas).
select pg_temp.lancar('e0000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000101',
  'despesa', 'conjunto', 'e0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-0000000000f1',
  'e0000000-0000-4000-8000-0000000000c1', '2031-03-07', null, array[12000]::bigint[], array['2031-03-07']::date[]);

-- ===== Como A (pagador) =====
select testes.como_a();

select is(
  api.lancamento('e0000000-0000-4000-8000-000000000201')
    - 'pagamento' - 'parcelas' - 'alterado_por' - 'alterado_em' - 'parcela_em_foco',
  jsonb_build_object(
    'id', 'e0000000-0000-4000-8000-000000000201', 'tipo', 'despesa', 'escopo', 'conjunto',
    'descricao', 'Geladeira teste',
    'categoria', jsonb_build_object('id', 'e0000000-0000-4000-8000-0000000000a1', 'nome', 'Teste moradia', 'escopo', 'conjunto'),
    'valor_total_centavos', 195000, 'num_parcelas', 3,
    'pagador', jsonb_build_object('id', '00000000-0000-4000-8000-000000000101', 'nome', 'Leandro', 'sou_eu', true)),
  'cabeçalho do lançamento para o pagador');
select ok(api.lancamento('e0000000-0000-4000-8000-000000000201') ? 'pagamento', 'pagador recebe pagamento');
select is(api.lancamento('e0000000-0000-4000-8000-000000000201')->'pagamento'->'forma',
  jsonb_build_object('id', 'e0000000-0000-4000-8000-0000000000f2', 'nome', 'Crédito teste A', 'tipo', 'credito'),
  'pagamento traz a forma de crédito');
select is(api.lancamento('e0000000-0000-4000-8000-000000000201')->'pagamento'->'conta', 'null'::jsonb,
  'crédito vem com conta nula');
select is(api.lancamento('e0000000-0000-4000-8000-000000000201')->'pagamento'->>'data_operacao', '2026-08-20',
  'pagamento traz a data da operação');
select is((api.lancamento('e0000000-0000-4000-8000-000000000201')->'pagamento'->>'dia_vencimento_aplicado')::int, 10,
  'pagamento traz o dia de vencimento aplicado');
select results_eq(
  $$select (p->>'numero')::int, (p->>'valor_centavos')::bigint, (p->>'data_ajustada')::boolean
      from jsonb_array_elements(api.lancamento('e0000000-0000-4000-8000-000000000201')->'parcelas') with ordinality as t(p, n)
     order by n$$,
  $$values (1, 65000::bigint, false), (2, 65000::bigint, false), (3, 65000::bigint, true)$$,
  'parcelas ordenadas por número, com data_ajustada para o pagador');
select is(
  (select array_agg(k order by k) from jsonb_object_keys(
     api.lancamento('e0000000-0000-4000-8000-000000000201')->'parcelas'->0) k),
  array['data', 'data_ajustada', 'id', 'numero', 'valor_centavos'],
  'parcela do pagador tem id, numero, valor, data e data_ajustada');
select is(api.lancamento('e0000000-0000-4000-8000-000000000201')->'alterado_por', 'null'::jsonb,
  'alterado_por nulo sem edição');
select is((api.lancamento('e0000000-0000-4000-8000-000000000201')->>'parcela_em_foco')::int, 2,
  'parcela em foco é a do mês de app.hoje()');
select is((api.lancamento('e0000000-0000-4000-8000-000000000204')->>'parcela_em_foco')::int, 1,
  'sem parcela no mês de app.hoje(), o foco é a 1ª');
select is((api.lancamento('e0000000-0000-4000-8000-000000000202')->>'parcela_em_foco')::int, 1,
  'lançamento de 1 parcela tem foco 1');

select is(api.lancamento('e0000000-0000-4000-8000-000000000203')->'pagamento'->'conta',
  jsonb_build_object('id', 'e0000000-0000-4000-8000-0000000000c1', 'nome', 'Conta teste A'),
  'receita vista pelo dono traz a conta de destino');
select is(api.lancamento('e0000000-0000-4000-8000-000000000203')->'pagamento'->'forma', 'null'::jsonb,
  'receita vem com forma nula');
select is(api.lancamento('e0000000-0000-4000-8000-000000000205')->'pagamento'->'conta'->>'id',
  'e0000000-0000-4000-8000-0000000000c1', 'Pix do pagador traz a conta');

-- ===== Como B (outro membro) =====
select testes.como_postgres();
select testes.como_b();

select ok(not (api.lancamento('e0000000-0000-4000-8000-000000000201') ? 'pagamento'),
  'B não recebe a chave pagamento');
select ok(not (api.lancamento('e0000000-0000-4000-8000-000000000205') ? 'pagamento'),
  'B não recebe pagamento da conjunta Pix de A');
select is(
  (select bool_or(p ? 'data_ajustada') from jsonb_array_elements(
     api.lancamento('e0000000-0000-4000-8000-000000000201')->'parcelas') p),
  false, 'nenhuma parcela vista por B tem a chave data_ajustada');
select is(
  (select array_agg(k order by k) from jsonb_object_keys(
     api.lancamento('e0000000-0000-4000-8000-000000000201')->'parcelas'->0) k),
  array['data', 'id', 'numero', 'valor_centavos'],
  'parcela vista por B tem só id, numero, valor e data');
select is(api.lancamento('e0000000-0000-4000-8000-000000000201')->'pagador',
  jsonb_build_object('id', '00000000-0000-4000-8000-000000000101', 'nome', 'Leandro', 'sou_eu', false),
  'B vê o pagador com sou_eu = false');
select is(jsonb_array_length(api.lancamento('e0000000-0000-4000-8000-000000000201')->'parcelas'), 3,
  'B vê as 3 parcelas da conjunta');
select ok(
  strpos(api.lancamento('e0000000-0000-4000-8000-000000000201')::text, 'e0000000-0000-4000-8000-0000000000f2') = 0
  and strpos(api.lancamento('e0000000-0000-4000-8000-000000000201')::text, '2026-08-20') = 0,
  'resposta para B não contém o id da forma nem a data da operação de A');
select ok(
  strpos(api.lancamento('e0000000-0000-4000-8000-000000000205')::text, 'e0000000-0000-4000-8000-0000000000f1') = 0
  and strpos(api.lancamento('e0000000-0000-4000-8000-000000000205')::text, 'e0000000-0000-4000-8000-0000000000c1') = 0,
  'resposta para B não contém o id da forma nem da conta de A');

select throws_ok($$select api.lancamento('e0000000-0000-4000-8000-000000000202')$$,
  'P0001', 'registro_invalido', 'individual de A pedida por B');
select throws_ok($$select api.lancamento('e0000000-0000-4000-8000-000000000203')$$,
  'P0001', 'registro_invalido', 'receita de A pedida por B');
select throws_ok($$select api.lancamento(gen_random_uuid())$$,
  'P0001', 'registro_invalido', 'id inexistente dá o mesmo erro');

-- ===== Editado por B =====
select testes.como_postgres();
update app.lancamento
   set alterado_por = '00000000-0000-4000-8000-000000000102',
       alterado_em = '2026-10-02 21:14:00-03'
 where id = 'e0000000-0000-4000-8000-000000000201';
set local timezone = 'UTC';
select testes.como_a();

select is(api.lancamento('e0000000-0000-4000-8000-000000000201')->'alterado_por',
  jsonb_build_object('nome', 'Ana'), 'alterado_por traz só o nome de quem editou');
select is(api.lancamento('e0000000-0000-4000-8000-000000000201')->>'alterado_em',
  '2026-10-02T21:14:00-03:00', 'alterado_em sai em -03:00 mesmo com a sessão em UTC');

-- ===== Privilégio e sem membro =====
select testes.como_postgres();
select ok(not has_function_privilege('anon', 'api.lancamento(uuid)', 'execute'), 'anon sem execute');
select ok(has_function_privilege('authenticated', 'api.lancamento(uuid)', 'execute'), 'authenticated com execute');

select testes.como_sem_membro();
select throws_ok($$select api.lancamento('e0000000-0000-4000-8000-000000000201')$$,
  'P0001', 'registro_invalido', 'usuário sem membro');

select testes.como_postgres();
select * from finish();
rollback;
