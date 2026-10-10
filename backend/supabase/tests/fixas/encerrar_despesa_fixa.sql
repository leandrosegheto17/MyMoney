-- api.encerrar_despesa_fixa: marca encerrada_em e remove só as pendentes dos meses seguintes (CA-10.2).
-- Datas relativas a app.hoje(): m0 = mês corrente, m1/m2/m3 = meses seguintes.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(23);

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

insert into app.despesa_fixa (id, lar_id, descricao, categoria_id, valor_previsto_centavos, dia_vencimento, inicio)
values ('00000000-0000-4000-8000-00000000d701', '00000000-0000-4000-8000-000000000100', 'Aluguel', '00000000-0000-4000-8000-00000000c401', 120000, 10, app.inicio_mes(app.hoje()));

-- Catálogo
select ok(not (select prosecdef from pg_proc where oid = 'api.encerrar_despesa_fixa(uuid)'::regprocedure),
  'encerrar_despesa_fixa é security invoker');
select ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'api.encerrar_despesa_fixa(uuid)'::regprocedure),
  'encerrar_despesa_fixa com search_path vazio');
select ok(not has_function_privilege('anon', 'api.encerrar_despesa_fixa(uuid)', 'execute'),
  'anon não executa encerrar_despesa_fixa');

-- Ocorrências do mês corrente e dos 2 seguintes
select testes.como_a();
select lives_ok($$select app.garantir_ocorrencias(app.inicio_mes(app.hoje()))$$, 'gera o mês corrente');
select lives_ok($$select app.garantir_ocorrencias((app.inicio_mes(app.hoje()) + interval '1 month')::date)$$, 'gera o mês +1');
select lives_ok($$select app.garantir_ocorrencias((app.inicio_mes(app.hoje()) + interval '2 months')::date)$$, 'gera o mês +2');

-- A do mês +1 fica paga por um lançamento conjunto de A
select testes.como_postgres();
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, descricao, valor_total_centavos, num_parcelas)
values ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'despesa', 'conjunto', '00000000-0000-4000-8000-00000000c401', 'Aluguel', 120000, 1);
insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
values ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-000000000100', 'conjunto', testes.membro_a(), 1, 120000,
        app.dia_no_mes((app.inicio_mes(app.hoje()) + interval '1 month')::date, 10));
insert into app.lancamento_pagamento (lancamento_id, dono_id, lar_id, forma_pagamento_id, conta_id, data_operacao)
values ('00000000-0000-4000-8000-00000000e501', testes.membro_a(), '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000c301', '00000000-0000-4000-8000-00000000c201', app.hoje());
update app.ocorrencia_fixa set lancamento_id = '00000000-0000-4000-8000-00000000e501'
where despesa_fixa_id = '00000000-0000-4000-8000-00000000d701' and mes = (app.inicio_mes(app.hoje()) + interval '1 month')::date;

select is((select count(*)::int from app.ocorrencia_fixa where despesa_fixa_id = '00000000-0000-4000-8000-00000000d701'), 3,
  'antes do encerramento há 3 ocorrências');

-- B encerra
select testes.como_b();
select lives_ok($$select api.encerrar_despesa_fixa('00000000-0000-4000-8000-00000000d701')$$, 'B encerra a fixa');

select testes.como_postgres();
select is((select encerrada_em from app.despesa_fixa where id = '00000000-0000-4000-8000-00000000d701'), app.hoje(), 'encerrada_em = app.hoje()');
select is((select count(*)::int from app.ocorrencia_fixa
           where despesa_fixa_id = '00000000-0000-4000-8000-00000000d701' and mes = app.inicio_mes(app.hoje())), 1,
  'a ocorrência do mês do encerramento fica');
select is((select lancamento_id from app.ocorrencia_fixa
           where despesa_fixa_id = '00000000-0000-4000-8000-00000000d701' and mes = (app.inicio_mes(app.hoje()) + interval '1 month')::date),
  '00000000-0000-4000-8000-00000000e501'::uuid, 'a ocorrência paga do mês +1 fica, ligada ao lançamento');
select is((select count(*)::int from app.ocorrencia_fixa
           where despesa_fixa_id = '00000000-0000-4000-8000-00000000d701' and mes = (app.inicio_mes(app.hoje()) + interval '2 months')::date), 0,
  'a pendente do mês +2 some');
select is((select count(*)::int from app.lancamento where id = '00000000-0000-4000-8000-00000000e501'), 1, 'o lançamento do pagador continua');

-- Depois do encerramento, a geração não cria nada
select testes.como_a();
select lives_ok($$select app.garantir_ocorrencias((app.inicio_mes(app.hoje()) + interval '2 months')::date)$$, 'gera o mês +2 de novo');
select lives_ok($$select app.garantir_ocorrencias((app.inicio_mes(app.hoje()) + interval '3 months')::date)$$, 'gera o mês +3');
select testes.como_postgres();
select is((select count(*)::int from app.ocorrencia_fixa
           where despesa_fixa_id = '00000000-0000-4000-8000-00000000d701' and mes >= (app.inicio_mes(app.hoje()) + interval '2 months')::date), 0,
  'fixa encerrada não gera nos meses seguintes');

-- Segunda chamada: sem erro e sem mover a data do primeiro encerramento
update app.despesa_fixa set encerrada_em = app.inicio_mes(app.hoje()) where id = '00000000-0000-4000-8000-00000000d701';
select testes.como_b();
select lives_ok($$select api.encerrar_despesa_fixa('00000000-0000-4000-8000-00000000d701')$$, 'encerrar de novo não dá erro');
select testes.como_postgres();
select is((select encerrada_em from app.despesa_fixa where id = '00000000-0000-4000-8000-00000000d701'), app.inicio_mes(app.hoje()),
  'encerrada_em fica inalterada');
select is((select count(*)::int from app.ocorrencia_fixa where despesa_fixa_id = '00000000-0000-4000-8000-00000000d701'), 2,
  'as ocorrências ficam iguais');

-- Erros
select testes.como_a();
select throws_ok($$select api.encerrar_despesa_fixa('00000000-0000-4000-8000-00000000ffff')$$,
  null, 'registro_invalido', 'id inexistente → registro_invalido');
select throws_ok($$select api.encerrar_despesa_fixa(null)$$,
  null, 'valor_invalido', 'id nulo → valor_invalido');

select testes.como_postgres();
update app.despesa_fixa set encerrada_em = null where id = '00000000-0000-4000-8000-00000000d701';
select testes.como_sem_membro();
select throws_ok($$select api.encerrar_despesa_fixa('00000000-0000-4000-8000-00000000d701')$$,
  null, 'registro_invalido', 'sem membro → registro_invalido');
select testes.como_postgres();
select is((select encerrada_em from app.despesa_fixa where id = '00000000-0000-4000-8000-00000000d701'), null::date,
  'a chamada sem membro não encerrou a fixa');

select * from finish();
rollback;
