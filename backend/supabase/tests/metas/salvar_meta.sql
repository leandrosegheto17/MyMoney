begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(32);

create temp table erros_capturados (caso text primary key, mensagem text);
grant all on erros_capturados to authenticated;

-- Como A
select testes.como_a();

select is(api.salvar_meta('f6000000-0000-4000-8000-000000000001', 'Bicicleta', 500000, null, 'individual'),
  'f6000000-0000-4000-8000-000000000001'::uuid, 'A cria meta individual e recebe o id');
select results_eq(
  $$select guardado_centavos, falta_centavos from api.metas where id = 'f6000000-0000-4000-8000-000000000001'$$,
  $$values (0::bigint, 500000::bigint)$$, 'meta nova começa com guardado zero e falta = alvo');
select is(api.salvar_meta('f6000000-0000-4000-8000-000000000002', '  Viagem a dois  ', 800000, '2027-07-20', 'conjunto'),
  'f6000000-0000-4000-8000-000000000002'::uuid, 'A cria meta compartilhada');
select is(api.salvar_meta('f6000000-0000-4000-8000-000000000001', 'Bicicleta', 500000, null, 'individual'),
  'f6000000-0000-4000-8000-000000000001'::uuid, 'reenvio idêntico devolve o mesmo id');

select testes.como_postgres();

select results_eq(
  $$select dono_id::text, escopo, atingida_em from app.meta where id = 'f6000000-0000-4000-8000-000000000001'$$,
  $$values ('00000000-0000-4000-8000-000000000101', 'individual', null::date)$$,
  'individual criada com dono A e sem atingida_em');
select is((select count(*)::int from app.meta where id = 'f6000000-0000-4000-8000-000000000001'),
  1, 'reenvio não duplica');
select is((select count(*)::int from app.movimento_meta where meta_id = 'f6000000-0000-4000-8000-000000000001'),
  0, 'criar não gera movimento');
select results_eq(
  $$select nome, prazo from app.meta where id = 'f6000000-0000-4000-8000-000000000002'$$,
  $$values ('Viagem a dois', '2027-07-01'::date)$$,
  'nome gravado sem espaços nas pontas e prazo no primeiro dia do mês');

-- Como B
select testes.como_b();

select is((select count(*)::int from app.meta where id = 'f6000000-0000-4000-8000-000000000001'),
  0, 'B não vê a individual criada por A');
select is((select count(*)::int from app.meta where id = 'f6000000-0000-4000-8000-000000000002'),
  1, 'B vê a compartilhada criada por A');
select lives_ok(
  $$select api.salvar_meta('f6000000-0000-4000-8000-000000000002', 'Viagem editada por B', 900000, '2028-03-10')$$,
  'B edita nome, alvo e prazo da compartilhada');

do $$
begin
  perform api.salvar_meta('f6000000-0000-4000-8000-000000000001', 'Tomada por B', 1000);
  insert into erros_capturados values ('id_real', null);
exception when others then
  insert into erros_capturados values ('id_real', sqlerrm);
end $$;
do $$
begin
  perform api.salvar_meta('0f0f0f0f-0000-4000-8000-000000000000', 'Tomada por B', 1000);
  insert into erros_capturados values ('id_aleatorio', null);
exception when others then
  insert into erros_capturados values ('id_aleatorio', sqlerrm);
end $$;

select throws_ok(
  $$select api.salvar_meta('f6000000-0000-4000-8000-000000000001', 'Tomada por B', 1000, null, 'individual')$$,
  'P0001', 'registro_invalido', 'B cria com o id da individual de A: registro_invalido');

select testes.como_postgres();

select isnt((select mensagem from erros_capturados where caso = 'id_real'), null,
  'B editando a individual de A recebe erro');
select is((select mensagem from erros_capturados where caso = 'id_real'),
  (select mensagem from erros_capturados where caso = 'id_aleatorio'),
  'individual de A e id inexistente dão o mesmo erro');
select results_eq(
  $$select nome, alvo_centavos, dono_id::text from app.meta where id = 'f6000000-0000-4000-8000-000000000001'$$,
  $$values ('Bicicleta', 500000::bigint, '00000000-0000-4000-8000-000000000101')$$,
  'individual de A continua intacta');
select results_eq(
  $$select nome, alvo_centavos, prazo, escopo, (count(*) over ())::int from app.meta where id = 'f6000000-0000-4000-8000-000000000002'$$,
  $$values ('Viagem editada por B', 900000::bigint, '2028-03-01'::date, 'conjunto', 1)$$,
  'edição de B gravada em uma linha só, com escopo intacto');

-- Como A: escopo imutável e validações
select testes.como_a();

select throws_ok(
  $$select api.salvar_meta('f6000000-0000-4000-8000-000000000002', 'Viagem', 900000, null, 'individual')$$,
  'P0001', 'valor_invalido', 'mudar o escopo na edição é recusado');
select lives_ok(
  $$select api.salvar_meta('f6000000-0000-4000-8000-000000000002', 'Viagem', 900000, null, null)$$,
  'edição sem escopo é aceita');
select lives_ok(
  $$select api.salvar_meta('f6000000-0000-4000-8000-000000000002', 'Viagem', 900000, null, 'conjunto')$$,
  'edição com o mesmo escopo é aceita');
select throws_ok($$select api.salvar_meta(null, 'Meta', 1000, null, 'conjunto')$$,
  'P0001', 'valor_invalido', 'id nulo é recusado');
select throws_ok($$select api.salvar_meta(gen_random_uuid(), '   ', 1000, null, 'conjunto')$$,
  'P0001', 'valor_invalido', 'nome em branco é recusado');
select throws_ok($$select api.salvar_meta(gen_random_uuid(), 'Meta', 0, null, 'conjunto')$$,
  'P0001', 'valor_invalido', 'alvo zero é recusado');
select throws_ok($$select api.salvar_meta(gen_random_uuid(), 'Meta', -1, null, 'conjunto')$$,
  'P0001', 'valor_invalido', 'alvo negativo é recusado');
select throws_ok($$select api.salvar_meta(gen_random_uuid(), 'Meta', null, null, 'conjunto')$$,
  'P0001', 'valor_invalido', 'alvo nulo é recusado');
select throws_ok($$select api.salvar_meta(gen_random_uuid(), 'Meta', 1000, null, 'casal')$$,
  'P0001', 'valor_invalido', 'escopo inválido na criação é recusado');

select testes.como_postgres();

select results_eq(
  $$select escopo from app.meta where id = 'f6000000-0000-4000-8000-000000000002'$$,
  $$values ('conjunto')$$, 'escopo continua o original');

-- Reavaliação de atingida_em ao mudar o alvo (Notebook novo: guardado 240.000)
select testes.como_a();
select lives_ok(
  $$select api.salvar_meta('00000000-0000-4000-8000-000000000903', 'Notebook novo', 200000)$$,
  'A reduz o alvo abaixo do guardado');
select testes.como_postgres();
select isnt((select atingida_em from app.meta where id = '00000000-0000-4000-8000-000000000903'), null,
  'alvo abaixo do guardado marca atingida_em');

select testes.como_a();
select lives_ok(
  $$select api.salvar_meta('00000000-0000-4000-8000-000000000903', 'Notebook novo', 600000)$$,
  'A aumenta o alvo acima do guardado');
select testes.como_postgres();
select is((select atingida_em from app.meta where id = '00000000-0000-4000-8000-000000000903'), null,
  'alvo acima do guardado desmarca atingida_em');

-- Sem membro e anon
select testes.como_sem_membro();
select throws_ok($$select api.salvar_meta(gen_random_uuid(), 'Meta', 1000, null, 'conjunto')$$,
  'P0001', 'registro_invalido', 'usuário sem membro recebe registro_invalido');
select testes.como_postgres();
select testes.como_anon();
select throws_ok($$select api.salvar_meta(gen_random_uuid(), 'Meta', 1000, null, 'conjunto')$$,
  '42501', null, 'anon não executa salvar_meta');
select testes.como_postgres();

select * from finish();
rollback;
