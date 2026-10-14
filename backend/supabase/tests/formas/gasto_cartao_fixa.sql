-- app.gasto_cartao: fixa paga no Crédito entra no cartão pela data do pagamento (próximo vencimento),
-- sem mudar a competência da casa (parcela no vencimento da ocorrência).
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(24);

-- app.hoje() fixado: os pagamentos do teste ficam dentro da faixa aceita (de 2000-01-01 até hoje + 30 dias).
create or replace function app.hoje(p_instante timestamptz default now()) returns date
language sql stable set search_path = '' as $$ select date '2027-01-15' $$;

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

-- Cartões de crédito de A só deste teste (um por cenário)
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento, preferida) values
  ('00000000-0000-4000-8000-00000000c304', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Crédito dia 10 A', 'credito', null, 10, false),
  ('00000000-0000-4000-8000-00000000c305', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Crédito dia 10 B', 'credito', null, 10, false),
  ('00000000-0000-4000-8000-00000000c306', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Crédito dia 10 C', 'credito', null, 10, false),
  ('00000000-0000-4000-8000-00000000c307', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Crédito dia 31',   'credito', null, 31, false);

insert into app.despesa_fixa (id, lar_id, descricao, categoria_id, valor_previsto_centavos, dia_vencimento, inicio) values
  ('00000000-0000-4000-8000-00000000d701', '00000000-0000-4000-8000-000000000100', 'Condomínio', '00000000-0000-4000-8000-00000000c401', 22010, 15, '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d702', '00000000-0000-4000-8000-000000000100', 'Luz',        '00000000-0000-4000-8000-00000000c402', 18000, 10, '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d703', '00000000-0000-4000-8000-000000000100', 'Gás',        '00000000-0000-4000-8000-00000000c402', 10000, 10, '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d704', '00000000-0000-4000-8000-000000000100', 'Internet',   '00000000-0000-4000-8000-00000000c402', 11990, 20, '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d705', '00000000-0000-4000-8000-000000000100', 'Água',       '00000000-0000-4000-8000-00000000c402', 9000,  10, '2026-01-01');
insert into app.ocorrencia_fixa (id, lar_id, despesa_fixa_id, mes, vencimento, valor_previsto_centavos) values
  ('00000000-0000-4000-8000-00000000d801', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d701', '2026-10-01', '2026-10-15', 22010),
  ('00000000-0000-4000-8000-00000000d802', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d702', '2026-10-01', '2026-10-10', 18000),
  ('00000000-0000-4000-8000-00000000d803', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d703', '2026-12-01', '2026-12-10', 10000),
  ('00000000-0000-4000-8000-00000000d804', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d704', '2027-01-01', '2027-01-20', 11990),
  ('00000000-0000-4000-8000-00000000d805', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d705', '2026-10-01', '2026-10-10', 9000);

-- Catálogo: assinatura e cabeçalho iguais
select ok(not (select prosecdef from pg_proc where oid = 'app.gasto_cartao(uuid,date)'::regprocedure),
  'gasto_cartao continua security invoker');
select ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'app.gasto_cartao(uuid,date)'::regprocedure),
  'gasto_cartao com search_path vazio');
select ok(position('valor_total_centavos' in pg_get_functiondef('app.gasto_cartao(uuid,date)'::regprocedure)) = 0,
  'gasto_cartao não lê valor_total_centavos');

-- Competência da casa antes do pagamento
select testes.como_a();
select set_config('teste.total_out', (app.totais_conjunto('2026-10-01') ->> 'total_centavos'), true);
select set_config('teste.total_nov', (app.totais_conjunto('2026-11-01') ->> 'total_centavos'), true);

-- Ocorrência de outubro, vencimento 15/10, paga em 20/10 no Crédito dia 10
select lives_ok($$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-00000000d801', '00000000-0000-4000-8000-00000000c304', null, '2026-10-20')$$,
  'A paga o Condomínio no Crédito em 20/10');
select results_eq($$select * from app.gasto_cartao('00000000-0000-4000-8000-00000000c304', '2026-11-01')$$, $$values (22010::bigint, 0::bigint)$$,
  'cartão de novembro (vencimento 10/11) inclui 22010');
select results_eq($$select * from app.gasto_cartao('00000000-0000-4000-8000-00000000c304', '2026-10-01')$$, $$values (0::bigint, 22010::bigint)$$,
  'cartão de outubro: gasto 0 e 22010 comprometido');
select results_eq($$select * from app.gasto_cartao('00000000-0000-4000-8000-00000000c304', '2026-12-01')$$, $$values (0::bigint, 0::bigint)$$,
  'cartão de dezembro: 0/0');

-- Competência da casa intacta
select is((select data from app.parcela where lancamento_id = '00000000-0000-4000-8000-00000000e501'), '2026-10-15'::date,
  'a parcela continua no vencimento da ocorrência');
select is((app.totais_conjunto('2026-10-01') ->> 'total_centavos')::bigint,
  current_setting('teste.total_out')::bigint + 22010, 'o total do conjunto de outubro inclui 22010');
select is((app.totais_conjunto('2026-11-01') ->> 'total_centavos')::bigint,
  current_setting('teste.total_nov')::bigint, 'o total do conjunto de novembro não inclui');

-- Pago no dia do vencimento do cartão (10/10) → próximo vencimento 10/11
select lives_ok($$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e502', '00000000-0000-4000-8000-00000000d802', '00000000-0000-4000-8000-00000000c305', null, '2026-10-10')$$,
  'A paga a Luz no Crédito em 10/10');
select results_eq($$select * from app.gasto_cartao('00000000-0000-4000-8000-00000000c305', '2026-10-01')$$, $$values (0::bigint, 18000::bigint)$$,
  'pago no dia do vencimento não cai no cartão de outubro');
select results_eq($$select * from app.gasto_cartao('00000000-0000-4000-8000-00000000c305', '2026-11-01')$$, $$values (18000::bigint, 0::bigint)$$,
  'pago no dia do vencimento cai no cartão de novembro');

-- Virada de ano: ocorrência de dezembro paga em 05/12 → 10/01/2027
select lives_ok($$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e503', '00000000-0000-4000-8000-00000000d803', '00000000-0000-4000-8000-00000000c306', null, '2026-12-05')$$,
  'A paga o Gás de dezembro no Crédito em 05/12');
select results_eq($$select * from app.gasto_cartao('00000000-0000-4000-8000-00000000c306', '2026-12-01')$$, $$values (0::bigint, 10000::bigint)$$,
  'virada de ano: dezembro sem gasto');
select results_eq($$select * from app.gasto_cartao('00000000-0000-4000-8000-00000000c306', '2027-01-01')$$, $$values (10000::bigint, 0::bigint)$$,
  'virada de ano: cai em janeiro de 2027');

-- Cartão dia 31: pago em 20/01/2027 → último dia de fevereiro
select lives_ok($$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e504', '00000000-0000-4000-8000-00000000d804', '00000000-0000-4000-8000-00000000c307', null, '2027-01-20')$$,
  'A paga a Internet de janeiro no Crédito dia 31');
select results_eq($$select * from app.gasto_cartao('00000000-0000-4000-8000-00000000c307', '2027-01-01')$$, $$values (0::bigint, 11990::bigint)$$,
  'dia 31: janeiro sem gasto');
select results_eq($$select * from app.gasto_cartao('00000000-0000-4000-8000-00000000c307', '2027-02-01')$$, $$values (11990::bigint, 0::bigint)$$,
  'dia 31: cai em fevereiro (último dia do mês seguinte)');

-- Fixa + compra na mesma forma: cada uma pela sua data de cartão
select testes.como_postgres();
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, descricao, valor_total_centavos, num_parcelas)
values ('00000000-0000-4000-8000-00000000e550', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'despesa', 'individual', '00000000-0000-4000-8000-00000000c411', 'Uber', 5000, 1);
insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
values ('00000000-0000-4000-8000-00000000e550', '00000000-0000-4000-8000-000000000100', 'individual', testes.membro_a(), 1, 5000, '2026-12-10');
insert into app.lancamento_pagamento (lancamento_id, dono_id, lar_id, forma_pagamento_id, conta_id, data_operacao, dia_vencimento_aplicado)
values ('00000000-0000-4000-8000-00000000e550', testes.membro_a(), '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000c304', null, '2026-11-15', 10);
select testes.como_a();
select results_eq($$select * from app.gasto_cartao('00000000-0000-4000-8000-00000000c304', '2026-11-01')$$, $$values (22010::bigint, 5000::bigint)$$,
  'novembro: a fixa no gasto e a compra no comprometido');
select results_eq($$select * from app.gasto_cartao('00000000-0000-4000-8000-00000000c304', '2026-12-01')$$, $$values (5000::bigint, 0::bigint)$$,
  'dezembro: só a compra');

-- Fixa paga no Pix não entra em nenhum cartão
select set_config('teste.cartoes',
  (select string_agg(row(f.id, m.mes, g.gasto_mes_centavos, g.comprometido_futuro_centavos)::text, ';' order by f.id, m.mes)
   from (values ('00000000-0000-4000-8000-00000000c303'::uuid), ('00000000-0000-4000-8000-00000000c304'::uuid), ('00000000-0000-4000-8000-00000000c305'::uuid)) f(id)
   cross join (values ('2026-10-01'::date), ('2026-11-01'::date)) m(mes)
   cross join lateral app.gasto_cartao(f.id, m.mes) g), true);
select lives_ok($$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e505', '00000000-0000-4000-8000-00000000d805', '00000000-0000-4000-8000-00000000c301')$$, 'A paga a Água no Pix');
select is(
  (select string_agg(row(f.id, m.mes, g.gasto_mes_centavos, g.comprometido_futuro_centavos)::text, ';' order by f.id, m.mes)
   from (values ('00000000-0000-4000-8000-00000000c303'::uuid), ('00000000-0000-4000-8000-00000000c304'::uuid), ('00000000-0000-4000-8000-00000000c305'::uuid)) f(id)
   cross join (values ('2026-10-01'::date), ('2026-11-01'::date)) m(mes)
   cross join lateral app.gasto_cartao(f.id, m.mes) g),
  current_setting('teste.cartoes'), 'a fixa paga no Pix não muda nenhum cartão');

-- B não vê o cartão de A
select testes.como_b();
select results_eq($$select * from app.gasto_cartao('00000000-0000-4000-8000-00000000c304', '2026-11-01')$$, $$values (null::bigint, null::bigint)$$,
  'B consultando o cartão de A → null/null');

select * from finish();
rollback;
