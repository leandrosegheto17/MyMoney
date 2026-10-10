begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(13);

-- Lançamento direto nas tabelas (chamado como postgres). Se a tabela tiver `criado_em`,
-- ele acompanha a data da operação, para "o mais recente" ser o mesmo nos dois critérios.
create function pg_temp.lancar(p_id uuid, p_dono uuid, p_tipo text, p_escopo text, p_categoria uuid,
                               p_forma uuid, p_conta uuid, p_data date, p_valor bigint)
returns void language plpgsql as $$
declare v_lar uuid := (select l.id from app.lar l);
begin
  insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, valor_total_centavos, num_parcelas)
  values (p_id, v_lar, p_dono, p_tipo, p_escopo, p_categoria, p_valor, 1);
  insert into app.lancamento_pagamento (lancamento_id, dono_id, lar_id, forma_pagamento_id, conta_id, data_operacao)
  values (p_id, p_dono, v_lar, p_forma, p_conta, p_data);
  insert into app.parcela (id, lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
  values (gen_random_uuid(), p_id, v_lar, p_escopo, p_dono, 1, p_valor, p_data);
  if exists (select 1 from information_schema.columns
              where table_schema = 'app' and table_name = 'lancamento' and column_name = 'criado_em') then
    execute format('update app.lancamento set criado_em = %L::timestamptz where id = %L', p_data, p_id);
  end if;
end $$;

delete from app.lancamento;

-- Cadastros de B (forma, conta e receita mais recentes que tudo de A)
insert into app.conta (id, lar_id, dono_id, nome) values
  ('e6300000-0000-4000-8000-0000000000c2', (select id from app.lar), testes.membro_b(), 'Conta teste B');
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id) values
  ('e6300000-0000-4000-8000-0000000000f2', (select id from app.lar), testes.membro_b(), 'Pix teste B', 'pix',
   'e6300000-0000-4000-8000-0000000000c2');
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('e6300000-0000-4000-8000-0000000000b1', (select id from app.lar), 'receita', 'individual', testes.membro_b(),
   'Receita teste B', null);

-- Sem lançamentos: preferida e nenhuma conta de receita
select testes.como_a();
select is(api.dados_lancamento()->>'forma_padrao_id', '00000000-0000-4000-8000-000000000301',
  'com preferida, o padrão é a preferida');
select is(api.dados_lancamento()->'conta_receita_padrao_id', 'null'::jsonb,
  'sem receitas, conta_receita_padrao_id é null');

select testes.como_postgres();
-- Despesas de A: Débito (01/10) e depois Crédito (05/10)
select pg_temp.lancar('e6300000-0000-4000-8000-000000000301', testes.membro_a(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000302',
  '00000000-0000-4000-8000-000000000202', '2026-10-01', 1000);
select pg_temp.lancar('e6300000-0000-4000-8000-000000000302', testes.membro_a(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000303', null, '2026-10-05', 1000);
-- Receitas de A: Nubank (01/10) e depois Itaú (03/10)
select pg_temp.lancar('e6300000-0000-4000-8000-000000000303', testes.membro_a(), 'receita', 'individual',
  '00000000-0000-4000-8000-000000000421', null, '00000000-0000-4000-8000-000000000201', '2026-10-01', 500000);
select pg_temp.lancar('e6300000-0000-4000-8000-000000000304', testes.membro_a(), 'receita', 'individual',
  '00000000-0000-4000-8000-000000000421', null, '00000000-0000-4000-8000-000000000202', '2026-10-03', 10000);
-- B, mais recente que tudo
select pg_temp.lancar('e6300000-0000-4000-8000-000000000305', testes.membro_b(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000401', 'e6300000-0000-4000-8000-0000000000f2',
  'e6300000-0000-4000-8000-0000000000c2', '2026-10-20', 1000);
select pg_temp.lancar('e6300000-0000-4000-8000-000000000306', testes.membro_b(), 'receita', 'individual',
  'e6300000-0000-4000-8000-0000000000b1', null, 'e6300000-0000-4000-8000-0000000000c2', '2026-10-25', 1000);

select testes.como_a();
select is(api.dados_lancamento()->>'forma_padrao_id', '00000000-0000-4000-8000-000000000301',
  'a preferida vence a última usada');
select is(api.dados_lancamento()->>'conta_receita_padrao_id', '00000000-0000-4000-8000-000000000202',
  'conta da última receita de A, nunca a de B');

-- Sem preferida: forma do último lançamento de A
select testes.como_postgres();
update app.forma_pagamento set preferida = false where dono_id = testes.membro_a();
select testes.como_a();
select is(api.dados_lancamento()->>'forma_padrao_id', '00000000-0000-4000-8000-000000000303',
  'sem preferida, a forma da última despesa de A (não a de B)');

-- Arquivadas não viram padrão
select testes.como_postgres();
update app.forma_pagamento set arquivada = true where id = '00000000-0000-4000-8000-000000000303';
update app.conta set arquivada = true where id = '00000000-0000-4000-8000-000000000202';
select testes.como_a();
select is(api.dados_lancamento()->>'forma_padrao_id', '00000000-0000-4000-8000-000000000302',
  'última forma arquivada: vale a anterior ativa');
select is(api.dados_lancamento()->>'conta_receita_padrao_id', '00000000-0000-4000-8000-000000000201',
  'última conta arquivada: vale a anterior ativa');
select is(
  (select count(*)::int from jsonb_array_elements(api.dados_lancamento()->'formas') f
    where f->>'id' = '00000000-0000-4000-8000-000000000303'),
  0, 'forma arquivada não está na lista');
select is(
  (select count(*)::int from jsonb_array_elements(api.dados_lancamento()->'contas') c
    where c->>'id' = '00000000-0000-4000-8000-000000000202'),
  0, 'conta arquivada não está na lista');

-- B nunca recebe padrão de A
select testes.como_b();
select ok(
  coalesce(api.dados_lancamento()->>'forma_padrao_id', '') not in (
    '00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000302',
    '00000000-0000-4000-8000-000000000303'),
  'forma padrão de B nunca é uma forma de A');
select is(api.dados_lancamento()->>'conta_receita_padrao_id', 'e6300000-0000-4000-8000-0000000000c2',
  'conta padrão de receita de B é a dele');

-- Nenhuma forma ativa
select testes.como_postgres();
update app.forma_pagamento set arquivada = true where dono_id = testes.membro_a();
select testes.como_a();
select is(api.dados_lancamento()->'formas', '[]'::jsonb, 'sem formas ativas, formas = []');
select is(api.dados_lancamento()->'forma_padrao_id', 'null'::jsonb, 'sem formas ativas, forma_padrao_id é null');

select * from finish();
rollback;
