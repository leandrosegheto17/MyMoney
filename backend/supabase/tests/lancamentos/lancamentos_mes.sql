begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(38);

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

-- Cadastros de teste (A = Leandro, B = Ana, do seed de acesso), num mês sem dado de seed (2031).
insert into app.conta (id, lar_id, dono_id, nome) values
  ('e0000000-0000-4000-8000-0000000000c1', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Conta teste A'),
  ('e0000000-0000-4000-8000-0000000000c2', (select id from app.lar), '00000000-0000-4000-8000-000000000102', 'Conta teste B');

insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento) values
  ('e0000000-0000-4000-8000-0000000000f1', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Pix teste A', 'pix', 'e0000000-0000-4000-8000-0000000000c1', null),
  ('e0000000-0000-4000-8000-0000000000f2', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Crédito teste A', 'credito', null, 10),
  ('e0000000-0000-4000-8000-0000000000f3', (select id from app.lar), '00000000-0000-4000-8000-000000000102', 'Pix teste B', 'pix', 'e0000000-0000-4000-8000-0000000000c2', null);

insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e0000000-0000-4000-8000-0000000000a1', (select id from app.lar), 'despesa', 'conjunto', null, 'Teste conjunta variável', true),
  ('e0000000-0000-4000-8000-0000000000a2', (select id from app.lar), 'despesa', 'conjunto', null, 'Teste conjunta fixa', false),
  ('e0000000-0000-4000-8000-0000000000a3', (select id from app.lar), 'despesa', 'individual', '00000000-0000-4000-8000-000000000101', 'Teste individual A', true),
  ('e0000000-0000-4000-8000-0000000000a4', (select id from app.lar), 'despesa', 'individual', '00000000-0000-4000-8000-000000000102', 'Teste individual B', true),
  ('e0000000-0000-4000-8000-0000000000a5', (select id from app.lar), 'receita', 'individual', '00000000-0000-4000-8000-000000000101', 'Teste receita A', null);

-- Conjunta de A no crédito 3x (set/out/nov), R$ 650 por parcela.
select pg_temp.lancar('e0000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000101',
  'despesa', 'conjunto', 'e0000000-0000-4000-8000-0000000000a2', 'e0000000-0000-4000-8000-0000000000f2', null,
  '2031-08-20', 10, array[65000, 65000, 65000]::bigint[],
  array['2031-09-10', '2031-10-10', '2031-11-10']::date[], 'Geladeira teste');
-- Individual de A, Pix à vista.
select pg_temp.lancar('e0000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000101',
  'despesa', 'individual', 'e0000000-0000-4000-8000-0000000000a3', 'e0000000-0000-4000-8000-0000000000f1',
  'e0000000-0000-4000-8000-0000000000c1', '2031-10-05', null, array[4000]::bigint[], array['2031-10-05']::date[], 'Almoço teste');
-- Individual de B.
select pg_temp.lancar('e0000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000102',
  'despesa', 'individual', 'e0000000-0000-4000-8000-0000000000a4', 'e0000000-0000-4000-8000-0000000000f3',
  'e0000000-0000-4000-8000-0000000000c2', '2031-10-07', null, array[3000]::bigint[], array['2031-10-07']::date[], 'Uber teste');
-- Conjunta de B, sem descrição.
select pg_temp.lancar('e0000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000102',
  'despesa', 'conjunto', 'e0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-0000000000f3',
  'e0000000-0000-4000-8000-0000000000c2', '2031-10-12', null, array[10000]::bigint[], array['2031-10-12']::date[]);
-- Receita de A.
select pg_temp.lancar('e0000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000101',
  'receita', 'individual', 'e0000000-0000-4000-8000-0000000000a5', null,
  'e0000000-0000-4000-8000-0000000000c1', '2031-10-01', null, array[500000]::bigint[], array['2031-10-01']::date[], 'Salário teste');

-- ===== Como A =====
select testes.como_a();

select is(api.lancamentos_mes('2031-10-17')->>'mes', '2031-10-01', 'mes é o início do mês pedido');
select is(api.lancamentos_mes('2031-10-01', 'conjunto', null, null, true)->'filtros',
  jsonb_build_object('escopo', 'conjunto', 'categoria_id', null, 'forma_id', null, 'variavel', true),
  'filtros ecoa os parâmetros');

select is((api.lancamentos_mes('2031-10-01')->>'quantidade')::int, 4,
  'A vê as conjuntas, as próprias individuais e a própria receita do mês');
select is((api.lancamentos_mes('2031-10-01')->>'total_filtrado_centavos')::bigint, 79000::bigint,
  'total soma as despesas pelas parcelas do mês (receita fora, parcela de R$ 650 e não o total da compra)');

select results_eq(
  $$select (i->>'lancamento_id')::uuid
      from jsonb_array_elements(api.lancamentos_mes('2031-10-01')->'itens') with ordinality as t(i, n)
     order by n$$,
  $$values ('e0000000-0000-4000-8000-000000000104'::uuid), ('e0000000-0000-4000-8000-000000000101'::uuid),
           ('e0000000-0000-4000-8000-000000000102'::uuid), ('e0000000-0000-4000-8000-000000000105'::uuid)$$,
  'itens ordenados por data desc');

select is(
  (select jsonb_build_array(i->'parcela_numero', i->'total_parcelas', i->'valor_centavos', i->'data')
     from jsonb_array_elements(api.lancamentos_mes('2031-10-01')->'itens') i
    where i->>'lancamento_id' = 'e0000000-0000-4000-8000-000000000101'),
  '[2, 3, 65000, "2031-10-10"]'::jsonb,
  'no crédito 3x, em outubro aparece só a parcela 2 de 3 com o valor da parcela');
select is(
  (select count(*)::int from jsonb_array_elements(api.lancamentos_mes('2031-10-01')->'itens') i
    where i->>'lancamento_id' = 'e0000000-0000-4000-8000-000000000101'),
  1, 'as parcelas de setembro e novembro não entram em outubro');
select is(
  (select jsonb_build_array(i->'parcela_numero', i->'total_parcelas')
     from jsonb_array_elements(api.lancamentos_mes('2031-10-01')->'itens') i
    where i->>'lancamento_id' = 'e0000000-0000-4000-8000-000000000102'),
  '[1, 1]'::jsonb, 'à vista sai como parcela 1 de 1');

select is(
  (select i - 'parcela_id' - 'data' - 'valor_centavos' - 'parcela_numero' - 'total_parcelas'
     from jsonb_array_elements(api.lancamentos_mes('2031-10-01')->'itens') i
    where i->>'lancamento_id' = 'e0000000-0000-4000-8000-000000000101'),
  jsonb_build_object(
    'lancamento_id', 'e0000000-0000-4000-8000-000000000101',
    'descricao', 'Geladeira teste', 'tipo', 'despesa', 'escopo', 'conjunto',
    'categoria', jsonb_build_object('id', 'e0000000-0000-4000-8000-0000000000a2', 'nome', 'Teste conjunta fixa', 'variavel', false),
    'pagador', jsonb_build_object('id', '00000000-0000-4000-8000-000000000101',
                                  'nome', (select nome from app.membro where id = '00000000-0000-4000-8000-000000000101'))),
  'item traz descrição sem "(k/N)" montado, categoria, escopo e pagador; nada da parte privada');
select ok(
  (select i ? 'descricao' and i->'descricao' = 'null'::jsonb
     from jsonb_array_elements(api.lancamentos_mes('2031-10-01')->'itens') i
    where i->>'lancamento_id' = 'e0000000-0000-4000-8000-000000000104'),
  'descrição nula vem como null');
select is(
  (select count(*)::int from jsonb_array_elements(api.lancamentos_mes('2031-10-01')->'itens') i
    where i ?| array['forma', 'conta', 'pagamento', 'data_operacao', 'forma_pagamento_id', 'conta_id']),
  0, 'nenhum item traz forma, conta ou data da operação');

-- Filtros
select results_eq(
  $$select (i->>'lancamento_id')::uuid from jsonb_array_elements(
      api.lancamentos_mes('2031-10-01', 'individual')->'itens') i order by 1$$,
  $$values ('e0000000-0000-4000-8000-000000000102'::uuid), ('e0000000-0000-4000-8000-000000000105'::uuid)$$,
  'escopo individual: só os individuais do próprio membro');
select is((api.lancamentos_mes('2031-10-01', 'individual')->>'total_filtrado_centavos')::bigint, 4000::bigint,
  'total do filtro individual soma só a despesa');
select is((api.lancamentos_mes('2031-10-01', 'individual')->>'quantidade')::int, 2,
  'quantidade do filtro individual conta todos os itens');
select results_eq(
  $$select (i->>'lancamento_id')::uuid from jsonb_array_elements(
      api.lancamentos_mes('2031-10-01', null, 'e0000000-0000-4000-8000-0000000000a1')->'itens') i$$,
  $$values ('e0000000-0000-4000-8000-000000000104'::uuid)$$,
  'filtro por categoria');
select results_eq(
  $$select (i->>'lancamento_id')::uuid from jsonb_array_elements(
      api.lancamentos_mes('2031-10-01', null, null, null, true)->'itens') i order by 1$$,
  $$values ('e0000000-0000-4000-8000-000000000102'::uuid), ('e0000000-0000-4000-8000-000000000104'::uuid)$$,
  'filtro variável = true');
select is((api.lancamentos_mes('2031-10-01', null, null, null, true)->>'total_filtrado_centavos')::bigint, 14000::bigint,
  'total do filtro variável');
select results_eq(
  $$select (i->>'lancamento_id')::uuid from jsonb_array_elements(
      api.lancamentos_mes('2031-10-01', null, null, 'e0000000-0000-4000-8000-0000000000f2')->'itens') i$$,
  $$values ('e0000000-0000-4000-8000-000000000101'::uuid)$$,
  'filtro pela própria forma');
select results_eq(
  $$select (i->>'lancamento_id')::uuid from jsonb_array_elements(
      api.lancamentos_mes('2031-10-01', 'conjunto', 'e0000000-0000-4000-8000-0000000000a2',
                          'e0000000-0000-4000-8000-0000000000f2', false)->'itens') i$$,
  $$values ('e0000000-0000-4000-8000-000000000101'::uuid)$$,
  'os quatro filtros combinados');
select is((api.lancamentos_mes('2031-10-01', 'individual', null, 'e0000000-0000-4000-8000-0000000000f2')->>'quantidade')::int, 0,
  'combinação sem item devolve quantidade 0');

select is(api.lancamentos_mes('2032-01-01')->'itens', '[]'::jsonb, 'mês vazio: itens []');
select is((api.lancamentos_mes('2032-01-01')->>'total_filtrado_centavos')::bigint, 0::bigint, 'mês vazio: total 0');
select is((api.lancamentos_mes('2032-01-01')->>'quantidade')::int, 0, 'mês vazio: quantidade 0');

select throws_ok($$select api.lancamentos_mes('2031-10-01', 'x')$$, 'P0001', 'valor_invalido', 'escopo fora da lista');
select throws_ok($$select api.lancamentos_mes(null)$$, 'P0001', 'valor_invalido', 'mês nulo');

-- ===== Como B =====
select testes.como_postgres();
select testes.como_b();

select results_eq(
  $$select (i->>'lancamento_id')::uuid from jsonb_array_elements(api.lancamentos_mes('2031-10-01')->'itens') i order by 1$$,
  $$values ('e0000000-0000-4000-8000-000000000101'::uuid), ('e0000000-0000-4000-8000-000000000103'::uuid),
           ('e0000000-0000-4000-8000-000000000104'::uuid)$$,
  'B vê as conjuntas e as próprias individuais, nenhuma individual nem receita de A');
select is((api.lancamentos_mes('2031-10-01')->>'total_filtrado_centavos')::bigint, 78000::bigint,
  'total de B não inclui nada individual de A');
select is(
  (select i->'pagador'->>'id' from jsonb_array_elements(api.lancamentos_mes('2031-10-01')->'itens') i
    where i->>'lancamento_id' = 'e0000000-0000-4000-8000-000000000101'),
  '00000000-0000-4000-8000-000000000101', 'B vê a conjunta de A com pagador = A');
select is((api.lancamentos_mes('2031-10-01', null, 'e0000000-0000-4000-8000-0000000000a3')->>'quantidade')::int, 0,
  'B filtrando pela categoria individual de A recebe vazio');
select results_eq(
  $$select (i->>'lancamento_id')::uuid from jsonb_array_elements(
      api.lancamentos_mes('2031-10-01', null, null, null, true)->'itens') i order by 1$$,
  $$values ('e0000000-0000-4000-8000-000000000103'::uuid), ('e0000000-0000-4000-8000-000000000104'::uuid)$$,
  'filtro variável de B não alcança individual de A');
select is((api.lancamentos_mes('2031-10-01', 'individual')->>'quantidade')::int, 1,
  'escopo individual de B: só a própria');

select is(api.lancamentos_mes('2031-10-01', null, null, 'e0000000-0000-4000-8000-0000000000f2')->'itens', '[]'::jsonb,
  'forma de A pedida por B: itens vazios, sem erro');
select is((api.lancamentos_mes('2031-10-01', null, null, 'e0000000-0000-4000-8000-0000000000f2')->>'total_filtrado_centavos')::bigint,
  0::bigint, 'forma de A pedida por B: total 0');
select is((api.lancamentos_mes('2031-10-01', null, null, 'e0000000-0000-4000-8000-0000000000f2')->>'quantidade')::int,
  0, 'forma de A pedida por B: quantidade 0');

select throws_ok($$select api.lancamentos_mes('2031-10-01', 'x')$$, 'P0001', 'valor_invalido', 'B com escopo inválido');

-- Nova individual de A não muda total nem contagem de B.
select testes.como_postgres();
select pg_temp.lancar('e0000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000101',
  'despesa', 'individual', 'e0000000-0000-4000-8000-0000000000a3', 'e0000000-0000-4000-8000-0000000000f1',
  'e0000000-0000-4000-8000-0000000000c1', '2031-10-20', null, array[99900]::bigint[], array['2031-10-20']::date[]);
select testes.como_b();

select is((api.lancamentos_mes('2031-10-01')->>'total_filtrado_centavos')::bigint, 78000::bigint,
  'total de B não muda ao A lançar uma individual');
select is((api.lancamentos_mes('2031-10-01')->>'quantidade')::int, 3,
  'quantidade de B não muda ao A lançar uma individual');

-- ===== Privilégio =====
select testes.como_postgres();
select ok(not has_function_privilege('anon', 'api.lancamentos_mes(date, text, uuid, uuid, boolean)', 'execute'),
  'anon sem execute');

select * from finish();
rollback;
