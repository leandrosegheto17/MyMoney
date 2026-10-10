begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(10);

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

-- Totais do mês de app.hoje() antes da receita (o seed pode ter receitas no mês).
select testes.como_b();
select ok(set_config('teste.totais_b', app.totais_individuais(app.hoje())::text, true) is not null, 'totais de B antes');
select testes.como_a();
select ok(set_config('teste.totais_a', app.totais_individuais(app.hoje())::text, true) is not null, 'totais de A antes');

select is(app.saldo_conta('e0000000-0000-4000-8000-0000000000c1'), 0::bigint, 'conta nova começa com saldo 0');

select lives_ok($$select api.lancar_receita('e0000000-0000-4000-8000-000000000911', 750000,
                    'e0000000-0000-4000-8000-0000000000a5', 'e0000000-0000-4000-8000-0000000000c1', app.hoje())$$,
  'A lança R$ 7.500 hoje');
select is(app.saldo_conta('e0000000-0000-4000-8000-0000000000c1'), 750000::bigint, 'saldo sobe 750000');

select lives_ok($$select api.lancar_receita('e0000000-0000-4000-8000-000000000912', 5000,
                    'e0000000-0000-4000-8000-0000000000a5', 'e0000000-0000-4000-8000-0000000000c1', app.hoje() + 60)$$,
  'A lança uma receita com data futura');
select is(app.saldo_conta('e0000000-0000-4000-8000-0000000000c1'), 750000::bigint,
  'receita futura não muda o saldo de hoje');
select is(app.saldo_conta('e0000000-0000-4000-8000-0000000000c1', app.hoje() + 60), 755000::bigint,
  'receita futura entra no saldo da data dela');

select is(
  (app.totais_individuais(app.hoje())->>'receitas_centavos')::bigint
    - (current_setting('teste.totais_a')::jsonb->>'receitas_centavos')::bigint,
  750000::bigint, 'receitas do mês de A sobem 750000');

select testes.como_postgres();
select testes.como_b();
select is(app.totais_individuais(app.hoje()), current_setting('teste.totais_b')::jsonb, 'totais de B não mudam');
select testes.como_postgres();

select * from finish();
rollback;
