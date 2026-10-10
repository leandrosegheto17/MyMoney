-- app.ocorrencias_do_mes(mes, hoje): situação, valor pago pela soma das parcelas, pagador, ordem e privacidade.
-- "Hoje" fixo em 2026-10-09 pelo parâmetro p_hoje.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(15);

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
  ('00000000-0000-4000-8000-00000000d701', '00000000-0000-4000-8000-000000000100', 'Internet', '00000000-0000-4000-8000-00000000c402', 11990,  5,  '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d702', '00000000-0000-4000-8000-000000000100', 'Aluguel',  '00000000-0000-4000-8000-00000000c401', 120000, 10, '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d703', '00000000-0000-4000-8000-000000000100', 'Seguro',   '00000000-0000-4000-8000-00000000c402', 5000,   9,  '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d704', '00000000-0000-4000-8000-000000000100', 'Luz',      '00000000-0000-4000-8000-00000000c402', 18000,  8,  '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d705', '00000000-0000-4000-8000-000000000100', 'Água',     '00000000-0000-4000-8000-00000000c402', 9000,   7,  '2026-01-01');
insert into app.ocorrencia_fixa (id, lar_id, despesa_fixa_id, mes, vencimento, valor_previsto_centavos) values
  ('00000000-0000-4000-8000-00000000d801', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d701', '2026-10-01', '2026-10-05', 11990),
  ('00000000-0000-4000-8000-00000000d802', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d702', '2026-10-01', '2026-10-10', 120000),
  ('00000000-0000-4000-8000-00000000d803', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d703', '2026-10-01', '2026-10-09', 5000),
  ('00000000-0000-4000-8000-00000000d804', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d704', '2026-10-01', '2026-10-08', 18000),
  ('00000000-0000-4000-8000-00000000d805', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d705', '2026-10-01', '2026-10-07', 9000);

-- Luz paga por B (Ana) no Pix em 03/10, parcela de 18740 no vencimento
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, descricao, valor_total_centavos, num_parcelas)
values ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-000000000100', testes.membro_b(), 'despesa', 'conjunto', '00000000-0000-4000-8000-00000000c402', 'Luz', 18740, 1);
insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
values ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-000000000100', 'conjunto', testes.membro_b(), 1, 18740, '2026-10-08');
insert into app.lancamento_pagamento (lancamento_id, dono_id, lar_id, forma_pagamento_id, conta_id, data_operacao)
values ('00000000-0000-4000-8000-00000000e501', testes.membro_b(), '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000c311', '00000000-0000-4000-8000-00000000c211', '2026-10-03');
update app.ocorrencia_fixa set lancamento_id = '00000000-0000-4000-8000-00000000e501' where id = '00000000-0000-4000-8000-00000000d804';

-- Água paga por A no Pix, parcela de 9510 no vencimento
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, descricao, valor_total_centavos, num_parcelas)
values ('00000000-0000-4000-8000-00000000e502', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'despesa', 'conjunto', '00000000-0000-4000-8000-00000000c402', 'Água', 9510, 1);
insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
values ('00000000-0000-4000-8000-00000000e502', '00000000-0000-4000-8000-000000000100', 'conjunto', testes.membro_a(), 1, 9510, '2026-10-07');
insert into app.lancamento_pagamento (lancamento_id, dono_id, lar_id, forma_pagamento_id, conta_id, data_operacao)
values ('00000000-0000-4000-8000-00000000e502', testes.membro_a(), '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000c301', '00000000-0000-4000-8000-00000000c201', '2026-10-07');
update app.ocorrencia_fixa set lancamento_id = '00000000-0000-4000-8000-00000000e502' where id = '00000000-0000-4000-8000-00000000d805';

-- Catálogo e privacidade
select ok(not (select prosecdef from pg_proc where oid = 'app.ocorrencias_do_mes(date,date)'::regprocedure),
  'ocorrencias_do_mes é security invoker');
select ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'app.ocorrencias_do_mes(date,date)'::regprocedure),
  'ocorrencias_do_mes com search_path vazio');
select ok(
  not (select proargnames && array['data_operacao', 'forma_pagamento_id', 'conta_id', 'forma', 'conta', 'data_pagamento']
       from pg_proc where oid = 'app.ocorrencias_do_mes(date,date)'::regprocedure),
  'nenhuma coluna de lancamento_pagamento no resultado');
select ok(
  position('lancamento_pagamento' in pg_get_functiondef('app.ocorrencias_do_mes(date,date)'::regprocedure)) = 0,
  'ocorrencias_do_mes não lê lancamento_pagamento');
select ok(
  position('valor_total_centavos' in pg_get_functiondef('app.ocorrencias_do_mes(date,date)'::regprocedure)) = 0,
  'valor pago não vem de valor_total_centavos');

-- Situação e ordem, como A
select testes.como_a();
select results_eq(
  $$select id, situacao::text from app.ocorrencias_do_mes('2026-10-01', '2026-10-09') order by ordem$$,
  $$values ('00000000-0000-4000-8000-00000000d801'::uuid, 'atrasada'::text),
           ('00000000-0000-4000-8000-00000000d803'::uuid, 'pendente'::text),
           ('00000000-0000-4000-8000-00000000d802'::uuid, 'pendente'::text),
           ('00000000-0000-4000-8000-00000000d804'::uuid, 'paga'::text),
           ('00000000-0000-4000-8000-00000000d805'::uuid, 'paga'::text)$$,
  'atrasadas, pendentes por vencimento crescente, pagas por vencimento decrescente; vencimento = hoje é pendente');
select results_eq(
  $$select valor_pago_centavos, pagador_id from app.ocorrencias_do_mes('2026-10-01', '2026-10-09') where id = '00000000-0000-4000-8000-00000000d804'$$,
  $$values (18740::bigint, '00000000-0000-4000-8000-000000000102'::uuid)$$,
  'paga por B: valor pago = soma das parcelas e pagador = B');
select results_eq(
  $$select valor_pago_centavos, pagador_id from app.ocorrencias_do_mes('2026-10-01', '2026-10-09') where id = '00000000-0000-4000-8000-00000000d805'$$,
  $$values (9510::bigint, '00000000-0000-4000-8000-000000000101'::uuid)$$,
  'paga por A: valor pago e pagador = A');
select results_eq(
  $$select valor_pago_centavos, pagador_id from app.ocorrencias_do_mes('2026-10-01', '2026-10-09') where id = '00000000-0000-4000-8000-00000000d802'$$,
  $$values (null::bigint, null::uuid)$$,
  'pendente: sem valor pago e sem pagador');
select results_eq(
  $$select despesa_fixa_id, descricao, categoria, vencimento, valor_previsto_centavos
    from app.ocorrencias_do_mes('2026-10-01', '2026-10-09') where id = '00000000-0000-4000-8000-00000000d802'$$,
  $$values ('00000000-0000-4000-8000-00000000d702'::uuid, 'Aluguel'::text, 'Moradia'::text, '2026-10-10'::date, 120000::bigint)$$,
  'descrição, categoria, vencimento e valor previsto do modelo/ocorrência');
select is((select situacao::text from app.ocorrencias_do_mes('2026-10-01', '2026-10-11') where id = '00000000-0000-4000-8000-00000000d802'),
  'atrasada', 'vencimento 10/10 com hoje 11/10 → atrasada');
select is((select count(*)::int from app.ocorrencias_do_mes('2026-11-01', '2026-10-09')), 0,
  'só as ocorrências do mês pedido (novembro ainda não gerado)');

-- Como B: a data mostrada é o vencimento, nunca a do pagamento
select testes.como_b();
select is((select vencimento from app.ocorrencias_do_mes('2026-10-01', '2026-10-09') where id = '00000000-0000-4000-8000-00000000d804'),
  '2026-10-08'::date, 'a fixa paga com data de operação 03/10 mostra o vencimento 08/10');
select is((select count(*)::int from app.ocorrencias_do_mes('2026-10-01', '2026-10-09')), 5,
  'B vê as mesmas 5 ocorrências');
select results_eq(
  $$select id, situacao::text, valor_pago_centavos, pagador_id from app.ocorrencias_do_mes('2026-10-01', '2026-10-09') where id = '00000000-0000-4000-8000-00000000d805'$$,
  $$values ('00000000-0000-4000-8000-00000000d805'::uuid, 'paga'::text, 9510::bigint, '00000000-0000-4000-8000-000000000101'::uuid)$$,
  'B vê a fixa paga por A como paga, com valor e pagador, sem ver a parte privada');

select * from finish();
rollback;
