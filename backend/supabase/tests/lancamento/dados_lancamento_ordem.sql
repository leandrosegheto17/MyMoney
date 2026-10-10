begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(10);

-- Lançamento direto nas tabelas (chamado como postgres).
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
end $$;

-- Ordem só pelo que este teste lança
delete from app.lancamento;

insert into app.conta (id, lar_id, dono_id, nome) values
  ('e6300000-0000-4000-8000-0000000000c2', (select id from app.lar), testes.membro_b(), 'Conta teste B');
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id) values
  ('e6300000-0000-4000-8000-0000000000f2', (select id from app.lar), testes.membro_b(), 'Pix teste B', 'pix',
   'e6300000-0000-4000-8000-0000000000c2');
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel, arquivada) values
  ('e6300000-0000-4000-8000-0000000000a2', (select id from app.lar), 'despesa', 'individual', testes.membro_b(),
   'AAA individual de B', true, false),
  ('e6300000-0000-4000-8000-0000000000a9', (select id from app.lar), 'despesa', 'conjunto', null,
   'AAA conjunta arquivada', true, true);

-- A: 3 em Mercado (conjunta), 1 em Transporte (individual)
select pg_temp.lancar(('e6300000-0000-4000-8000-00000000010' || n)::uuid, testes.membro_a(), 'despesa', 'conjunto',
  '00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000201', ('2026-10-0' || n)::date, 1000)
from generate_series(1, 3) n;
select pg_temp.lancar('e6300000-0000-4000-8000-000000000109', testes.membro_a(), 'despesa', 'individual',
  '00000000-0000-4000-8000-000000000413', '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000201', '2026-10-09', 1000);

select testes.como_a();

select results_eq(
  $$select (c->>'id')::uuid from jsonb_array_elements(api.dados_lancamento()->'categorias_despesa')
      with ordinality t(c, n) where n <= 2 order by n$$,
  $$values ('00000000-0000-4000-8000-000000000401'::uuid), ('00000000-0000-4000-8000-000000000413'::uuid)$$,
  'mais usada primeiro: Mercado (3) antes de Transporte (1)');
select is(
  (select array_agg(c->>'nome' order by n) from jsonb_array_elements(api.dados_lancamento()->'categorias_despesa')
     with ordinality t(c, n) where n > 2),
  (select array_agg(c->>'nome' order by c->>'nome') from jsonb_array_elements(api.dados_lancamento()->'categorias_despesa')
     with ordinality t(c, n) where n > 2),
  'categorias sem uso no fim, por nome');
select is(
  (select count(*)::int from jsonb_array_elements(api.dados_lancamento()->'categorias_despesa') c
    where c->>'id' in ('e6300000-0000-4000-8000-0000000000a9', 'e6300000-0000-4000-8000-0000000000a2')),
  0, 'nem a arquivada nem a individual de B aparecem para A');
select is(
  (select count(*)::int from jsonb_array_elements(api.dados_lancamento()->'categorias_despesa') c
    where c->>'id' = '00000000-0000-4000-8000-000000000421'),
  0, 'categoria de receita não entra nas de despesa');
select is(
  (select array_agg(c->>'id' order by n) from jsonb_array_elements(api.dados_lancamento()->'categorias_receita')
     with ordinality t(c, n)),
  (select array_agg(id::text order by nome) from app.categoria
    where tipo = 'receita' and not arquivada and dono_id = testes.membro_a()),
  'categorias de receita do membro, por nome');

select ok(set_config('teste.ordem_a', (api.dados_lancamento()->'categorias_despesa')::text, true) is not null,
  'guarda a ordem de A');

-- B lança 10 vezes em Moradia (conjunta)
select testes.como_postgres();
select pg_temp.lancar(('e6300000-0000-4000-8000-0000000002' || lpad(n::text, 2, '0'))::uuid, testes.membro_b(),
  'despesa', 'conjunto', '00000000-0000-4000-8000-000000000403', 'e6300000-0000-4000-8000-0000000000f2',
  'e6300000-0000-4000-8000-0000000000c2', '2026-10-10', 500)
from generate_series(1, 10) n;

select testes.como_a();
select is(api.dados_lancamento()->'categorias_despesa', current_setting('teste.ordem_a')::jsonb,
  'os lançamentos de B na conjunta não mudam a ordem de A');

select testes.como_b();
select is(api.dados_lancamento()->'categorias_despesa'->0->>'id', '00000000-0000-4000-8000-000000000403',
  'para B, Moradia vem em primeiro');
select is(
  (select count(*)::int from jsonb_array_elements(api.dados_lancamento()->'categorias_despesa') c
    where c->>'id' = '00000000-0000-4000-8000-000000000413'),
  0, 'categoria individual de A nunca aparece para B');
select is(
  (select array_agg(c->>'nome' order by n) from jsonb_array_elements(api.dados_lancamento()->'categorias_despesa')
     with ordinality t(c, n) where n > 1),
  (select array_agg(c->>'nome' order by c->>'nome') from jsonb_array_elements(api.dados_lancamento()->'categorias_despesa')
     with ordinality t(c, n) where n > 1),
  'para B, as demais seguem por nome: o uso de A em Mercado e Transporte não conta');

select * from finish();
rollback;
