-- Janela de geração de ocorrências: resumo_mes e ocorrencias_mes não gravam fora de
-- 12 meses antes a 12 meses depois de app.hoje() (fixado em 2026-10-12).
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(16);

create or replace function app.hoje(p_instante timestamptz default now()) returns date
language sql stable set search_path = '' as $$ select date '2026-10-12' $$;

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
  ('00000000-0000-4000-8000-00000000d701', '00000000-0000-4000-8000-000000000100', 'Internet',   '00000000-0000-4000-8000-00000000c402', 11990,  5,  '2026-10-01'),
  ('00000000-0000-4000-8000-00000000d702', '00000000-0000-4000-8000-000000000100', 'Aluguel',    '00000000-0000-4000-8000-00000000c401', 120000, 10, '2026-10-01'),
  ('00000000-0000-4000-8000-00000000d703', '00000000-0000-4000-8000-000000000100', 'Condomínio', '00000000-0000-4000-8000-00000000c401', 22010,  15, '2026-10-01'),
  ('00000000-0000-4000-8000-00000000d704', '00000000-0000-4000-8000-000000000100', 'Luz',        '00000000-0000-4000-8000-00000000c402', 18000,  8,  '2026-10-01');

select testes.como_a();
select is((select count(*)::int from app.ocorrencia_fixa), 0, 'começa sem ocorrências');

-- resumo_mes fora da janela: não grava, não erra, fixas vazias
select lives_ok($$select api.resumo_mes('9999-01-01')$$, 'resumo_mes de 9999-01 não levanta erro');
select lives_ok($$select api.resumo_mes('2000-01-01')$$, 'resumo_mes de 2000-01 não levanta erro');
select lives_ok($$select api.resumo_mes('2027-11-01')$$, 'resumo_mes de 13 meses à frente não levanta erro');
select lives_ok($$select api.resumo_mes('2025-09-01')$$, 'resumo_mes de 13 meses atrás não levanta erro');
select is((select count(*)::int from app.ocorrencia_fixa), 0, 'resumo_mes fora da janela não grava nada');
select is((api.resumo_mes('9999-01-01') -> 'conjunto' ->> 'fixas_total')::int, 0, 'fixas_total = 0 fora da janela');
select is(jsonb_array_length(api.resumo_mes('9999-01-01') -> 'conjunto' -> 'fixas_pendentes'), 0, 'fixas_pendentes vazio fora da janela');

-- ocorrencias_mes fora da janela
select lives_ok($$select api.ocorrencias_mes('9999-01-01')$$, 'ocorrencias_mes de 9999-01 não levanta erro');
select is((api.ocorrencias_mes('9999-01-01') ->> 'total')::int, 0, 'ocorrencias_mes fora da janela devolve total 0');
select is((select count(*)::int from app.ocorrencia_fixa), 0, 'ocorrencias_mes fora da janela não grava nada');

-- Limites da janela continuam gerando (12 meses antes e depois)
select lives_ok($$select api.ocorrencias_mes('2027-10-01')$$, 'mês +12 aceito');
select lives_ok($$select api.ocorrencias_mes('2025-10-01')$$, 'mês -12 aceito');
select is((select count(*)::int from app.ocorrencia_fixa where mes = '2027-10-01'), 4, 'mês +12 gera 1 por fixa ativa');
select is((select count(*)::int from app.ocorrencia_fixa where mes = '2025-10-01'), 0, 'mês -12 anterior ao início das fixas não gera');

-- Dentro da janela é idempotente
select api.ocorrencias_mes('2026-11-01');
select api.resumo_mes('2026-11-01');
select is((select count(*)::int from app.ocorrencia_fixa where mes = '2026-11-01'), 4, 'mês dentro da janela: 1 por fixa ativa, idempotente');

select * from finish();
rollback;
