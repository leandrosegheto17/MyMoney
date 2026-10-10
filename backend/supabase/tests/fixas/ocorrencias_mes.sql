-- api.ocorrencias_mes(mes): garante as ocorrências e devolve {mes, pagas, total, previsto_a_pagar_centavos, ocorrencias[]}.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(27);

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
  ('00000000-0000-4000-8000-00000000d701', '00000000-0000-4000-8000-000000000100', 'Aluguel',    '00000000-0000-4000-8000-00000000c401', 120000, 10, '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d702', '00000000-0000-4000-8000-000000000100', 'Condomínio', '00000000-0000-4000-8000-00000000c401', 22010,  15, '2026-01-01'),
  ('00000000-0000-4000-8000-00000000d703', '00000000-0000-4000-8000-000000000100', 'Luz',        '00000000-0000-4000-8000-00000000c402', 18000,  8,  '2026-01-01');

-- Catálogo
select is((select provolatile::text from pg_proc where oid = 'api.ocorrencias_mes(date)'::regprocedure),
  'v', 'ocorrencias_mes é volatile (escreve pelo garantir)');
select ok(not (select prosecdef from pg_proc where oid = 'api.ocorrencias_mes(date)'::regprocedure),
  'ocorrencias_mes é security invoker');
select ok((select 'search_path=""' = any(proconfig) from pg_proc where oid = 'api.ocorrencias_mes(date)'::regprocedure),
  'ocorrencias_mes com search_path vazio');
select ok(not has_function_privilege('anon', 'api.ocorrencias_mes(date)', 'execute'), 'anon não executa ocorrencias_mes');
select ok(position('lancamento_pagamento' in pg_get_functiondef('api.ocorrencias_mes(date)'::regprocedure)) = 0,
  'ocorrencias_mes não lê lancamento_pagamento');

-- Mês sem ocorrências: a chamada cria 1 por fixa ativa
select testes.como_a();
select is((api.ocorrencias_mes('2027-03-17') ->> 'total')::int, 3, 'total = 3 fixas ativas');
select is((api.ocorrencias_mes('2027-03-17') ->> 'mes'), '2027-03-01', 'mes normalizado para o dia 1');

select testes.como_postgres();
select is((select count(*)::int from app.ocorrencia_fixa where mes = '2027-03-01'), 3, 'a chamada criou 3 ocorrências');

select testes.como_a();
select is((api.ocorrencias_mes('2027-03-01') ->> 'total')::int, 3, 'segunda chamada continua com total 3');
select testes.como_postgres();
select is((select count(*)::int from app.ocorrencia_fixa where mes = '2027-03-01'), 3, 'segunda chamada não duplica');

-- A paga a Luz de março (lançamento conjunto de A, parcela de 18740 no vencimento)
insert into app.lancamento (id, lar_id, dono_id, tipo, escopo, categoria_id, descricao, valor_total_centavos, num_parcelas)
values ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'despesa', 'conjunto', '00000000-0000-4000-8000-00000000c402', 'Luz', 18740, 1);
insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
values ('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-000000000100', 'conjunto', testes.membro_a(), 1, 18740, '2027-03-08');
insert into app.lancamento_pagamento (lancamento_id, dono_id, lar_id, forma_pagamento_id, conta_id, data_operacao)
values ('00000000-0000-4000-8000-00000000e501', testes.membro_a(), '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000c301', '00000000-0000-4000-8000-00000000c201', '2027-03-02');
update app.ocorrencia_fixa set lancamento_id = '00000000-0000-4000-8000-00000000e501' where despesa_fixa_id = '00000000-0000-4000-8000-00000000d703' and mes = '2027-03-01';

-- Totais batem com a lista
select testes.como_b();
select is((r ->> 'pagas')::int, 1, 'pagas = 1') from api.ocorrencias_mes('2027-03-01') as t(r);
select is((r ->> 'total')::int, jsonb_array_length(r -> 'ocorrencias'), 'total = tamanho da lista')
  from api.ocorrencias_mes('2027-03-01') as t(r);
select is((r ->> 'pagas')::int,
          (select count(*)::int from jsonb_array_elements(r -> 'ocorrencias') e where e ->> 'situacao' = 'paga'),
          'pagas = itens pagos da lista')
  from api.ocorrencias_mes('2027-03-01') as t(r);
select is((r ->> 'previsto_a_pagar_centavos')::bigint,
          (select sum((e ->> 'valor_previsto_centavos')::bigint) from jsonb_array_elements(r -> 'ocorrencias') e
           where e ->> 'situacao' <> 'paga'),
          'previsto_a_pagar = soma do previsto das não pagas')
  from api.ocorrencias_mes('2027-03-01') as t(r);
select is((r ->> 'previsto_a_pagar_centavos')::bigint, 142010::bigint, 'previsto_a_pagar = 120000 + 22010')
  from api.ocorrencias_mes('2027-03-01') as t(r);

-- Item pago e item pendente, vistos por B
select is(e -> 'pagador', '{"nome": "Leandro", "sou_eu": false}'::jsonb, 'para B, o pagador é Leandro e sou_eu = false')
  from api.ocorrencias_mes('2027-03-01') as t(r), jsonb_array_elements(r -> 'ocorrencias') e
  where e ->> 'despesa_fixa_id' = '00000000-0000-4000-8000-00000000d703';
select is((e ->> 'valor_pago_centavos')::bigint, 18740::bigint, 'valor pago = soma das parcelas')
  from api.ocorrencias_mes('2027-03-01') as t(r), jsonb_array_elements(r -> 'ocorrencias') e
  where e ->> 'despesa_fixa_id' = '00000000-0000-4000-8000-00000000d703';
select is(e ->> 'vencimento', '2027-03-08', 'a data mostrada para B é o vencimento')
  from api.ocorrencias_mes('2027-03-01') as t(r), jsonb_array_elements(r -> 'ocorrencias') e
  where e ->> 'despesa_fixa_id' = '00000000-0000-4000-8000-00000000d703';
select is(jsonb_typeof(e -> 'pagador'), 'null', 'pendente traz pagador null')
  from api.ocorrencias_mes('2027-03-01') as t(r), jsonb_array_elements(r -> 'ocorrencias') e
  where e ->> 'despesa_fixa_id' = '00000000-0000-4000-8000-00000000d701';
select is(jsonb_typeof(e -> 'valor_pago_centavos'), 'null', 'pendente traz valor_pago_centavos null')
  from api.ocorrencias_mes('2027-03-01') as t(r), jsonb_array_elements(r -> 'ocorrencias') e
  where e ->> 'despesa_fixa_id' = '00000000-0000-4000-8000-00000000d701';
select is(
  (select array_agg(k order by k) from (select distinct jsonb_object_keys(e) as k
     from api.ocorrencias_mes('2027-03-01') as t(r), jsonb_array_elements(r -> 'ocorrencias') e) s),
  array['categoria', 'descricao', 'despesa_fixa_id', 'id', 'pagador', 'situacao',
        'valor_pago_centavos', 'valor_previsto_centavos', 'vencimento'],
  'cada item traz só as chaves de respostas/ocorrencias-mes.json');
select is(
  (select array_agg(k order by k) from (select jsonb_object_keys(r) as k from api.ocorrencias_mes('2027-03-01') as t(r)) s),
  array['mes', 'ocorrencias', 'pagas', 'previsto_a_pagar_centavos', 'total'],
  'a raiz traz só as chaves do contrato');

select testes.como_a();
select is(e -> 'pagador', '{"nome": "Leandro", "sou_eu": true}'::jsonb, 'para A, o mesmo pagador vem com sou_eu = true')
  from api.ocorrencias_mes('2027-03-01') as t(r), jsonb_array_elements(r -> 'ocorrencias') e
  where e ->> 'despesa_fixa_id' = '00000000-0000-4000-8000-00000000d703';

-- Mês sem fixas ativas
select is(api.ocorrencias_mes('2025-12-01'),
  '{"mes": "2025-12-01", "pagas": 0, "total": 0, "previsto_a_pagar_centavos": 0, "ocorrencias": []}'::jsonb,
  'mês sem fixas: forma de ocorrencias-mes-vazio.json');

-- Erros
select throws_ok($$select api.ocorrencias_mes(null)$$, null, 'valor_invalido', 'p_mes nulo → valor_invalido');

select testes.como_sem_membro();
select throws_ok($$select api.ocorrencias_mes('2027-04-01')$$, null, 'registro_invalido', 'sem membro → registro_invalido');
select testes.como_postgres();
select is((select count(*)::int from app.ocorrencia_fixa where mes = '2027-04-01'), 0, 'sem membro não cria ocorrência');

select * from finish();
rollback;
