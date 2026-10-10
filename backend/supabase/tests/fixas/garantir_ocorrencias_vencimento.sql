-- app.garantir_ocorrencias: vencimento pelo dia do modelo, limitado ao último dia do mês (CA-11.2).
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(10);

-- app.hoje() fixado: a janela de geração (±12 meses) cobre abril de 2026 a fevereiro de 2028.
create or replace function app.hoje(p_instante timestamptz default now()) returns date
language sql stable set search_path = '' as $$ select date '2027-03-01' $$;

select testes.preparar_lar();

-- Cadastros de teste criados na transação (como postgres).
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('00000000-0000-4000-8000-00000000c401', '00000000-0000-4000-8000-000000000100', 'despesa', 'conjunto',   null,              'Moradia',        false),
  ('00000000-0000-4000-8000-00000000c402', '00000000-0000-4000-8000-000000000100', 'despesa', 'conjunto',   null,              'Contas da casa', false),
  ('00000000-0000-4000-8000-00000000c411', '00000000-0000-4000-8000-000000000100', 'despesa', 'individual', testes.membro_a(), 'Transporte',     true),
  ('00000000-0000-4000-8000-00000000c412', '00000000-0000-4000-8000-000000000100', 'despesa', 'individual', testes.membro_b(), 'Transporte',     true),
  ('00000000-0000-4000-8000-00000000c421', '00000000-0000-4000-8000-000000000100', 'receita', 'individual', testes.membro_a(), 'Salário',        null);
insert into app.conta (id, lar_id, dono_id, nome, saldo_inicial_centavos) values
  ('00000000-0000-4000-8000-00000000c201', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Nubank',    250000),
  ('00000000-0000-4000-8000-00000000c202', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Itaú',      80000),
  ('00000000-0000-4000-8000-00000000c211', '00000000-0000-4000-8000-000000000100', testes.membro_b(), 'Conta Ana', 100000);
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento, preferida) values
  ('00000000-0000-4000-8000-00000000c301', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Pix Nubank',           'pix',     '00000000-0000-4000-8000-00000000c201', null, true),
  ('00000000-0000-4000-8000-00000000c302', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Débito Itaú',          'debito',  '00000000-0000-4000-8000-00000000c202', null, false),
  ('00000000-0000-4000-8000-00000000c303', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Cartão de crédito XP', 'credito', '00000000-0000-4000-8000-00000000c202', 10,   false),
  ('00000000-0000-4000-8000-00000000c311', '00000000-0000-4000-8000-000000000100', testes.membro_b(), 'Pix Ana',              'pix',     '00000000-0000-4000-8000-00000000c211', null, true);

insert into app.despesa_fixa (id, lar_id, descricao, categoria_id, valor_previsto_centavos, dia_vencimento, inicio) values
  ('00000000-0000-4000-8000-00000000d701', '00000000-0000-4000-8000-000000000100', 'Aluguel', '00000000-0000-4000-8000-00000000c401', 120000, 31, '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d702', '00000000-0000-4000-8000-000000000100', 'Luz',     '00000000-0000-4000-8000-00000000c402', 18000,  10, '2026-01-01');

select testes.como_a();
select lives_ok($$select app.garantir_ocorrencias('2027-02-01')$$, 'gera fevereiro de 2027');
select lives_ok($$select app.garantir_ocorrencias('2028-02-01')$$, 'gera fevereiro de 2028');
select lives_ok($$select app.garantir_ocorrencias('2026-04-01')$$, 'gera abril de 2026');
select lives_ok($$select app.garantir_ocorrencias('2027-01-01')$$, 'gera janeiro de 2027');

select testes.como_postgres();
select is((select vencimento from app.ocorrencia_fixa where despesa_fixa_id = '00000000-0000-4000-8000-00000000d701' and mes = '2027-02-01'),
  '2027-02-28'::date, 'dia 31 em fevereiro de 2027 → 28');
select is((select vencimento from app.ocorrencia_fixa where despesa_fixa_id = '00000000-0000-4000-8000-00000000d701' and mes = '2028-02-01'),
  '2028-02-29'::date, 'dia 31 em fevereiro de 2028 (bissexto) → 29');
select is((select vencimento from app.ocorrencia_fixa where despesa_fixa_id = '00000000-0000-4000-8000-00000000d701' and mes = '2026-04-01'),
  '2026-04-30'::date, 'dia 31 em abril → 30');
select is((select vencimento from app.ocorrencia_fixa where despesa_fixa_id = '00000000-0000-4000-8000-00000000d701' and mes = '2027-01-01'),
  '2027-01-31'::date, 'dia 31 em janeiro → 31');
select is((select vencimento from app.ocorrencia_fixa where despesa_fixa_id = '00000000-0000-4000-8000-00000000d702' and mes = '2027-02-01'),
  '2027-02-10'::date, 'dia 10 → 10');
select is((select vencimento from app.ocorrencia_fixa where despesa_fixa_id = '00000000-0000-4000-8000-00000000d702' and mes = '2026-04-01'),
  '2026-04-10'::date, 'dia 10 em abril → 10');

select * from finish();
rollback;
