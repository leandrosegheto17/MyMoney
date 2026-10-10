-- api.salvar_despesa_fixa: cria ou edita, só categoria conjunta de despesa, dia 1 a 31, qualquer membro.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(30);

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

insert into app.despesa_fixa (id, lar_id, descricao, categoria_id, valor_previsto_centavos, dia_vencimento, inicio, encerrada_em)
values ('00000000-0000-4000-8000-00000000d703', '00000000-0000-4000-8000-000000000100', 'Diarista', '00000000-0000-4000-8000-00000000c402', 10000, 4, '2026-01-01', '2026-09-30');

-- Catálogo
select ok(not (select prosecdef from pg_proc where oid = 'api.salvar_despesa_fixa(uuid,text,uuid,bigint,integer)'::regprocedure),
  'salvar_despesa_fixa é security invoker');
select ok((select 'search_path=""' = any(proconfig) from pg_proc
           where oid = 'api.salvar_despesa_fixa(uuid,text,uuid,bigint,integer)'::regprocedure),
  'salvar_despesa_fixa com search_path vazio');
select ok(not has_function_privilege('anon', 'api.salvar_despesa_fixa(uuid,text,uuid,bigint,integer)', 'execute'),
  'anon não executa salvar_despesa_fixa');
select ok(has_function_privilege('authenticated', 'api.salvar_despesa_fixa(uuid,text,uuid,bigint,integer)', 'execute'),
  'authenticated executa salvar_despesa_fixa');

-- A cria (CA-10.1)
select testes.como_a();
select is(api.salvar_despesa_fixa('00000000-0000-4000-8000-00000000d701', 'Aluguel', '00000000-0000-4000-8000-00000000c401', 120000, 10), '00000000-0000-4000-8000-00000000d701'::uuid,
  'A cria "Aluguel" e recebe o id');

select testes.como_postgres();
select results_eq(
  $$select lar_id, descricao, categoria_id, valor_previsto_centavos, dia_vencimento::int, inicio, encerrada_em
    from app.despesa_fixa where id = '00000000-0000-4000-8000-00000000d701'$$,
  $$values ('00000000-0000-4000-8000-000000000100'::uuid, 'Aluguel'::text, '00000000-0000-4000-8000-00000000c401'::uuid, 120000::bigint, 10, app.inicio_mes(app.hoje()), null::date)$$,
  '1 linha no lar, com início no mês de app.hoje() e ativa');

-- B lê e edita (RN-06)
select testes.como_b();
select is((select count(*)::int from app.despesa_fixa where id = '00000000-0000-4000-8000-00000000d701'), 1, 'B lê a fixa criada por A');
select is(api.salvar_despesa_fixa('00000000-0000-4000-8000-00000000d701', 'Aluguel', '00000000-0000-4000-8000-00000000c401', 125000, 10), '00000000-0000-4000-8000-00000000d701'::uuid,
  'B edita a fixa de A para 125000');

select testes.como_a();
select is((select valor_previsto_centavos from app.despesa_fixa where id = '00000000-0000-4000-8000-00000000d701'), 125000::bigint,
  'A vê 125000');

-- Validação de valor, dia, descrição e id → valor_invalido, nada gravado
select throws_ok($$select api.salvar_despesa_fixa('00000000-0000-4000-8000-00000000d702', 'Gás', '00000000-0000-4000-8000-00000000c402', 5000, 0)$$,
  null, 'valor_invalido', 'dia 0 → valor_invalido');
select throws_ok($$select api.salvar_despesa_fixa('00000000-0000-4000-8000-00000000d702', 'Gás', '00000000-0000-4000-8000-00000000c402', 5000, 32)$$,
  null, 'valor_invalido', 'dia 32 → valor_invalido');
select throws_ok($$select api.salvar_despesa_fixa('00000000-0000-4000-8000-00000000d702', 'Gás', '00000000-0000-4000-8000-00000000c402', 5000, null)$$,
  null, 'valor_invalido', 'dia nulo → valor_invalido');
select throws_ok($$select api.salvar_despesa_fixa('00000000-0000-4000-8000-00000000d702', 'Gás', '00000000-0000-4000-8000-00000000c402', 0, 6)$$,
  null, 'valor_invalido', 'valor 0 → valor_invalido');
select throws_ok($$select api.salvar_despesa_fixa('00000000-0000-4000-8000-00000000d702', 'Gás', '00000000-0000-4000-8000-00000000c402', -1, 6)$$,
  null, 'valor_invalido', 'valor −1 → valor_invalido');
select throws_ok($$select api.salvar_despesa_fixa('00000000-0000-4000-8000-00000000d702', 'Gás', '00000000-0000-4000-8000-00000000c402', null, 6)$$,
  null, 'valor_invalido', 'valor nulo → valor_invalido');
select throws_ok($$select api.salvar_despesa_fixa('00000000-0000-4000-8000-00000000d702', '  ', '00000000-0000-4000-8000-00000000c402', 5000, 6)$$,
  null, 'valor_invalido', 'descrição só com espaços → valor_invalido');
select throws_ok($$select api.salvar_despesa_fixa(null, 'Gás', '00000000-0000-4000-8000-00000000c402', 5000, 6)$$,
  null, 'valor_invalido', 'id nulo → valor_invalido');

-- Categoria fora de "conjunta de despesa" → registro_invalido
select testes.como_b();
select throws_ok($$select api.salvar_despesa_fixa('00000000-0000-4000-8000-00000000d702', 'Gás', '00000000-0000-4000-8000-00000000c411', 5000, 6)$$,
  null, 'registro_invalido', 'B usando a categoria individual de A → registro_invalido');
select testes.como_a();
select throws_ok($$select api.salvar_despesa_fixa('00000000-0000-4000-8000-00000000d702', 'Gás', '00000000-0000-4000-8000-00000000c411', 5000, 6)$$,
  null, 'registro_invalido', 'categoria individual própria → registro_invalido');
select throws_ok($$select api.salvar_despesa_fixa('00000000-0000-4000-8000-00000000d702', 'Gás', '00000000-0000-4000-8000-00000000c421', 5000, 6)$$,
  null, 'registro_invalido', 'categoria de receita → registro_invalido');
select throws_ok($$select api.salvar_despesa_fixa('00000000-0000-4000-8000-00000000d702', 'Gás', '00000000-0000-4000-8000-00000000ffff', 5000, 6)$$,
  null, 'registro_invalido', 'categoria inexistente → registro_invalido');

select testes.como_postgres();
select is((select count(*)::int from app.despesa_fixa where id = '00000000-0000-4000-8000-00000000d702'), 0, 'nenhuma chamada recusada gravou a fixa');

-- Reenvio idêntico é idempotente
select testes.como_a();
select lives_ok($$select api.salvar_despesa_fixa('00000000-0000-4000-8000-00000000d701', 'Aluguel', '00000000-0000-4000-8000-00000000c401', 125000, 10)$$, 'reenvio 1');
select lives_ok($$select api.salvar_despesa_fixa('00000000-0000-4000-8000-00000000d701', 'Aluguel', '00000000-0000-4000-8000-00000000c401', 125000, 10)$$, 'reenvio 2');
select testes.como_postgres();
select is((select count(*)::int from app.despesa_fixa where id = '00000000-0000-4000-8000-00000000d701'), 1, 'reenvio do mesmo id mantém 1 linha');

-- Fixa encerrada não é editada
select testes.como_a();
select throws_ok($$select api.salvar_despesa_fixa('00000000-0000-4000-8000-00000000d703', 'Diarista', '00000000-0000-4000-8000-00000000c402', 12000, 4)$$,
  null, 'valor_invalido', 'editar fixa encerrada → valor_invalido');
select testes.como_postgres();
select is((select valor_previsto_centavos from app.despesa_fixa where id = '00000000-0000-4000-8000-00000000d703'), 10000::bigint,
  'a fixa encerrada continua com o valor antigo');

-- Ocorrência paga nunca muda com a edição do modelo
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, descricao, valor_total_centavos, num_parcelas)
values ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'despesa', 'conjunto', '00000000-0000-4000-8000-00000000c401', 'Aluguel', 125000, 1);
insert into app.ocorrencia_fixa (id, lar_id, despesa_fixa_id, mes, vencimento, valor_previsto_centavos, lancamento_id)
values ('00000000-0000-4000-8000-00000000d801', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d701', app.inicio_mes(app.hoje()),
        app.dia_no_mes(app.inicio_mes(app.hoje()), 10), 125000, '00000000-0000-4000-8000-00000000e501');

select testes.como_b();
select lives_ok($$select api.salvar_despesa_fixa('00000000-0000-4000-8000-00000000d701', 'Aluguel', '00000000-0000-4000-8000-00000000c402', 130000, 12)$$,
  'B muda valor, dia e categoria do modelo');
select testes.como_postgres();
select results_eq(
  $$select valor_previsto_centavos, vencimento, lancamento_id from app.ocorrencia_fixa where id = '00000000-0000-4000-8000-00000000d801'$$,
  $$values (125000::bigint, app.dia_no_mes(app.inicio_mes(app.hoje()), 10), '00000000-0000-4000-8000-00000000e501'::uuid)$$,
  'a ocorrência paga fica intacta');

-- Usuário sem membro
select testes.como_sem_membro();
select throws_ok($$select api.salvar_despesa_fixa('00000000-0000-4000-8000-00000000d704', 'Gás', '00000000-0000-4000-8000-00000000c402', 5000, 6)$$,
  null, 'registro_invalido', 'sem membro → registro_invalido');

select * from finish();
rollback;
