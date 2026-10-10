-- Pagamento de despesa fixa (lançamento ligado a ocorrência): só o pagador edita ou exclui (RN-06, I-20).
-- Outro membro: excluir -> registro_invalido; editar -> sem_permissao; nada muda. Conjunto comum segue livre.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(13);

create or replace function app.hoje(p_instante timestamptz default now()) returns date
language sql stable set search_path = '' as $$ select date '2026-10-12' $$;

select testes.preparar_lar();

insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel) values
  ('00000000-0000-4000-8000-00000000c401', '00000000-0000-4000-8000-000000000100', 'despesa', 'conjunto', null, 'Moradia', false);
insert into app.conta (id, lar_id, dono_id, nome, saldo_inicial_centavos) values
  ('00000000-0000-4000-8000-00000000c201', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Nubank', 250000);
insert into app.forma_pagamento (id, lar_id, dono_id, nome, tipo, conta_id, dia_vencimento, preferida) values
  ('00000000-0000-4000-8000-00000000c301', '00000000-0000-4000-8000-000000000100', testes.membro_a(), 'Pix Nubank', 'pix', '00000000-0000-4000-8000-00000000c201', null, true);
insert into app.despesa_fixa (id, lar_id, descricao, categoria_id, valor_previsto_centavos, dia_vencimento, inicio) values
  ('00000000-0000-4000-8000-00000000d701', '00000000-0000-4000-8000-000000000100', 'Condomínio', '00000000-0000-4000-8000-00000000c401', 22010, 10, '2026-01-01');
insert into app.ocorrencia_fixa (id, lar_id, despesa_fixa_id, mes, vencimento, valor_previsto_centavos) values
  ('00000000-0000-4000-8000-00000000d801', '00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-00000000d701', '2026-10-01', '2026-10-10', 22010);

-- A paga a fixa e lança um gasto conjunto comum
select testes.como_a();
select lives_ok($$select api.pagar_ocorrencia('00000000-0000-4000-8000-00000000e501', '00000000-0000-4000-8000-00000000d801', '00000000-0000-4000-8000-00000000c301')$$, 'A paga a fixa');
select lives_ok($$select api.lancar_despesa('00000000-0000-4000-8000-00000000e502', 5000, '00000000-0000-4000-8000-00000000c401', '00000000-0000-4000-8000-00000000c301', 1, '2026-10-05')$$, 'A lança conjunto comum');

-- B não edita o pagamento da fixa
select testes.como_b();
select throws_ok($$select api.editar_lancamento('00000000-0000-4000-8000-00000000e501', 99900)$$,
  'P0001', 'sem_permissao', 'B edita valor do pagamento da fixa: sem_permissao');
select throws_ok($$select api.editar_lancamento('00000000-0000-4000-8000-00000000e501', null, null, null, '2026-10-20')$$,
  'P0001', 'sem_permissao', 'B edita data do pagamento da fixa: sem_permissao');
select throws_ok($$select api.editar_lancamento('00000000-0000-4000-8000-00000000e501', null, null, 'x')$$,
  'P0001', 'sem_permissao', 'B edita descrição do pagamento da fixa: sem_permissao');
-- B não exclui
select throws_ok($$select api.excluir_lancamento('00000000-0000-4000-8000-00000000e501')$$,
  'P0001', 'registro_invalido', 'B exclui o pagamento da fixa: registro_invalido');

select testes.como_postgres();
select results_eq($$select l.valor_total_centavos, p.valor_centavos, p.data, o.lancamento_id
  from app.lancamento l join app.parcela p on p.lancamento_id = l.id
  join app.ocorrencia_fixa o on o.lancamento_id = l.id where l.id = '00000000-0000-4000-8000-00000000e501'$$,
  $$values (22010::bigint, 22010::bigint, date '2026-10-10', '00000000-0000-4000-8000-00000000e501'::uuid)$$,
  'valor, data e vínculo da fixa intactos');

-- Regressão: conjunto comum segue livre para B
select testes.como_b();
select lives_ok($$select api.editar_lancamento('00000000-0000-4000-8000-00000000e502', 6000)$$, 'B edita conjunto comum de A');
select lives_ok($$select api.excluir_lancamento('00000000-0000-4000-8000-00000000e502')$$, 'B exclui conjunto comum de A');

-- A edita e exclui o próprio pagamento da fixa
select testes.como_a();
select lives_ok($$select api.editar_lancamento('00000000-0000-4000-8000-00000000e501', 23000)$$, 'A edita o pagamento da fixa');
select testes.como_postgres();
select is((select valor_total_centavos from app.lancamento where id = '00000000-0000-4000-8000-00000000e501'), 23000::bigint, 'valor mudou');
select testes.como_a();
select lives_ok($$select api.excluir_lancamento('00000000-0000-4000-8000-00000000e501')$$, 'A exclui o pagamento da fixa');
select testes.como_postgres();
select is((select lancamento_id from app.ocorrencia_fixa where id = '00000000-0000-4000-8000-00000000d801'), null::uuid, 'ocorrência volta a pendente');

select * from finish();
rollback;
