begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(18);

-- A regra só roda dentro do api.editar_lancamento (DEFINER): aqui fica no papel dono das
-- funções e só troca o JWT, para app.membro_atual() devolver A ou B.
create function pg_temp.jwt(p_usuario uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
end $$;

create function pg_temp.lancar(
  p_id uuid, p_dono uuid, p_tipo text, p_escopo text, p_categoria uuid,
  p_forma uuid, p_conta uuid, p_data_operacao date, p_dia integer,
  p_valores bigint[], p_datas date[]
) returns void
language plpgsql as $$
declare
  v_lar uuid := (select l.id from app.lar l);
begin
  insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id,
                              valor_total_centavos, num_parcelas)
  values (p_id, v_lar, p_dono, p_tipo, p_escopo, p_categoria,
          (select sum(v) from unnest(p_valores) v), cardinality(p_valores));
  insert into app.lancamento_pagamento (lancamento_id, dono_id, lar_id, forma_pagamento_id,
                                        conta_id, data_operacao, dia_vencimento_aplicado)
  values (p_id, p_dono, v_lar, p_forma, p_conta, p_data_operacao, p_dia);
  insert into app.parcela (id, lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
  select gen_random_uuid(), p_id, v_lar, p_escopo, p_dono, n, p_valores[n], p_datas[n]
  from generate_subscripts(p_valores, 1) n;
end $$;

create function pg_temp.permissoes(p_id uuid)
returns table (descricao boolean, valor boolean, data boolean, categoria_mesmo_escopo boolean,
               troca_escopo boolean, forma boolean, parcelas boolean)
language sql as $$
  select p.descricao, p.valor, p.data, p.categoria_mesmo_escopo, p.troca_escopo, p.forma, p.parcelas
    from app.permissoes_edicao(p_id) p
$$;

insert into app.conta (id, lar_id, dono_id, nome) values
  ('e0000000-0000-4000-8000-0000000000c1', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Conta teste A'),
  ('e0000000-0000-4000-8000-0000000000c2', (select id from app.lar), '00000000-0000-4000-8000-000000000102', 'Conta teste B');

insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento) values
  ('e0000000-0000-4000-8000-0000000000f1', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Pix teste A', 'pix', 'e0000000-0000-4000-8000-0000000000c1', null),
  ('e0000000-0000-4000-8000-0000000000f2', (select id from app.lar), '00000000-0000-4000-8000-000000000101', 'Crédito teste A', 'credito', null, 10),
  ('e0000000-0000-4000-8000-0000000000f3', (select id from app.lar), '00000000-0000-4000-8000-000000000102', 'Pix teste B', 'pix', 'e0000000-0000-4000-8000-0000000000c2', null),
  ('e0000000-0000-4000-8000-0000000000f4', (select id from app.lar), '00000000-0000-4000-8000-000000000102', 'Crédito teste B', 'credito', null, 15);

insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e0000000-0000-4000-8000-0000000000a1', (select id from app.lar), 'despesa', 'conjunto', null, 'Teste conjunta', true),
  ('e0000000-0000-4000-8000-0000000000a3', (select id from app.lar), 'despesa', 'individual', '00000000-0000-4000-8000-000000000101', 'Teste individual A', true),
  ('e0000000-0000-4000-8000-0000000000a5', (select id from app.lar), 'receita', 'individual', '00000000-0000-4000-8000-000000000101', 'Teste receita A', null);

-- Conjunta Pix paga por A
select pg_temp.lancar('e0000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101',
  'despesa', 'conjunto', 'e0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-0000000000f1',
  'e0000000-0000-4000-8000-0000000000c1', '2031-03-05', null, array[10000]::bigint[], array['2031-03-05']::date[]);
-- Conjunta Crédito 3x paga por A
select pg_temp.lancar('e0000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000101',
  'despesa', 'conjunto', 'e0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-0000000000f2', null,
  '2031-03-15', 10, array[12000, 12000, 12000]::bigint[], array['2031-04-10', '2031-05-10', '2031-06-10']::date[]);
-- Conjunta Crédito à vista paga por A
select pg_temp.lancar('e0000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000101',
  'despesa', 'conjunto', 'e0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-0000000000f2', null,
  '2031-03-15', 10, array[9000]::bigint[], array['2031-04-10']::date[]);
-- Individual de A
select pg_temp.lancar('e0000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000101',
  'despesa', 'individual', 'e0000000-0000-4000-8000-0000000000a3', 'e0000000-0000-4000-8000-0000000000f1',
  'e0000000-0000-4000-8000-0000000000c1', '2031-03-06', null, array[4000]::bigint[], array['2031-03-06']::date[]);
-- Receita de A
select pg_temp.lancar('e0000000-0000-4000-8000-000000000305', '00000000-0000-4000-8000-000000000101',
  'receita', 'individual', 'e0000000-0000-4000-8000-0000000000a5', null,
  'e0000000-0000-4000-8000-0000000000c1', '2031-03-01', null, array[750000]::bigint[], array['2031-03-01']::date[]);
-- Conjunta Pix paga por B
select pg_temp.lancar('e0000000-0000-4000-8000-000000000306', '00000000-0000-4000-8000-000000000102',
  'despesa', 'conjunto', 'e0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-0000000000f3',
  'e0000000-0000-4000-8000-0000000000c2', '2031-03-08', null, array[7000]::bigint[], array['2031-03-08']::date[]);
-- Conjunta Crédito 2x paga por B
select pg_temp.lancar('e0000000-0000-4000-8000-000000000307', '00000000-0000-4000-8000-000000000102',
  'despesa', 'conjunto', 'e0000000-0000-4000-8000-0000000000a1', 'e0000000-0000-4000-8000-0000000000f4', null,
  '2031-03-20', 15, array[5000, 5000]::bigint[], array['2031-04-15', '2031-05-15']::date[]);

-- ===== A (pagador / dono) =====
select pg_temp.jwt(testes.usuario_a());

select results_eq($$select * from pg_temp.permissoes('e0000000-0000-4000-8000-000000000301')$$,
  $$values (true, true, true, true, true, true, true)$$, 'A na própria conjunta Pix: tudo');
select results_eq($$select * from pg_temp.permissoes('e0000000-0000-4000-8000-000000000302')$$,
  $$values (true, true, true, true, true, true, true)$$, 'A na própria conjunta crédito 3x: tudo');
select results_eq($$select * from pg_temp.permissoes('e0000000-0000-4000-8000-000000000304')$$,
  $$values (true, true, true, true, true, true, true)$$, 'A na própria individual: tudo');
select results_eq($$select * from pg_temp.permissoes('e0000000-0000-4000-8000-000000000305')$$,
  $$values (true, true, true, true, true, true, true)$$, 'A na própria receita: tudo');
select results_eq($$select * from pg_temp.permissoes('e0000000-0000-4000-8000-000000000306')$$,
  $$values (true, true, true, true, false, false, false)$$,
  'A como outro membro na conjunta Pix de B: descrição, valor, data e categoria conjunta');
select results_eq($$select * from pg_temp.permissoes('e0000000-0000-4000-8000-000000000307')$$,
  $$values (true, true, false, true, false, false, false)$$,
  'A como outro membro na conjunta crédito de B: sem data');
select throws_ok($$select * from app.permissoes_edicao(gen_random_uuid())$$,
  'P0001', 'registro_invalido', 'id inexistente');

-- ===== B (outro membro) =====
select pg_temp.jwt(testes.usuario_b());

select results_eq($$select * from pg_temp.permissoes('e0000000-0000-4000-8000-000000000301')$$,
  $$values (true, true, true, true, false, false, false)$$,
  'B na conjunta Pix de A: descrição, valor, data e categoria conjunta; sem escopo, forma e parcelas');
select results_eq($$select * from pg_temp.permissoes('e0000000-0000-4000-8000-000000000302')$$,
  $$values (true, true, false, true, false, false, false)$$,
  'B na conjunta crédito 3x de A: sem data');
select results_eq($$select * from pg_temp.permissoes('e0000000-0000-4000-8000-000000000303')$$,
  $$values (true, true, false, true, false, false, false)$$,
  'B na conjunta crédito à vista de A: sem data');
select results_eq($$select * from pg_temp.permissoes('e0000000-0000-4000-8000-000000000306')$$,
  $$values (true, true, true, true, true, true, true)$$, 'B na própria conjunta: tudo');
select throws_ok($$select * from app.permissoes_edicao('e0000000-0000-4000-8000-000000000304')$$,
  'P0001', 'registro_invalido', 'B na individual de A');
select throws_ok($$select * from app.permissoes_edicao('e0000000-0000-4000-8000-000000000305')$$,
  'P0001', 'registro_invalido', 'B na receita de A');
select throws_ok($$select * from app.permissoes_edicao(gen_random_uuid())$$,
  'P0001', 'registro_invalido', 'B com id inexistente: mesmo erro');

-- ===== Sem membro =====
select pg_temp.jwt(testes.usuario_sem_membro());
select throws_ok($$select * from app.permissoes_edicao('e0000000-0000-4000-8000-000000000301')$$,
  'P0001', 'registro_invalido', 'usuário sem membro');

-- ===== Catálogo =====
select function_privs_are('app', 'permissoes_edicao', array['uuid'], 'authenticated', array[]::text[],
  'authenticated sem execute');
select function_privs_are('app', 'permissoes_edicao', array['uuid'], 'anon', array[]::text[],
  'anon sem execute');
select ok(not has_function_privilege('public', 'app.permissoes_edicao(uuid)', 'execute'), 'public sem execute');

select * from finish();
rollback;
