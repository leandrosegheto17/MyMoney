begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(16);

select testes.preparar_lar();

-- Como A (forma de .md/mockup/respostas/contexto.json)
select testes.como_a();
select is(
  (api.contexto() -> 'membro' ->> 'id')::uuid, testes.membro_a(),
  'como A, membro.id é o id de A'
);
select is(api.contexto() -> 'membro' ->> 'nome', 'Leandro', 'como A, membro.nome é Leandro');
select is(
  api.contexto() -> 'membro' ->> 'email', 'leandro@exemplo.com',
  'como A, membro.email vem do JWT'
);
select is(api.contexto() -> 'outro_membro' ->> 'nome', 'Ana', 'como A, outro_membro.nome é Ana');
select set_eq(
  $$ select jsonb_object_keys(api.contexto()) $$,
  array['membro', 'outro_membro', 'mes_corrente', 'hoje'],
  'como A, só as chaves de contexto.json'
);
select set_eq(
  $$ select jsonb_object_keys(api.contexto() -> 'membro') $$,
  array['id', 'nome', 'email'],
  'como A, membro só com id, nome e email'
);
select set_eq(
  $$ select jsonb_object_keys(api.contexto() -> 'outro_membro') $$,
  array['nome'],
  'como A, outro_membro só com nome'
);
select is(
  (api.contexto() ->> 'mes_corrente')::date, app.inicio_mes(app.hoje()),
  'mes_corrente = app.inicio_mes(app.hoje())'
);
select is((api.contexto() ->> 'hoje')::date, app.hoje(), 'hoje = app.hoje()');
select ok(
  position(testes.membro_b()::text in api.contexto()::text) = 0
  and position(testes.usuario_b()::text in api.contexto()::text) = 0,
  'como A, nenhum id de B na resposta'
);

-- Como B (contexto-ana.json)
select testes.como_b();
select is(
  (api.contexto() -> 'membro' ->> 'id')::uuid, testes.membro_b(),
  'como B, membro.id é o id de B'
);
select is(api.contexto() -> 'membro' ->> 'nome', 'Ana', 'como B, membro.nome é Ana');
select is(api.contexto() -> 'outro_membro' ->> 'nome', 'Leandro', 'como B, outro_membro.nome é Leandro');
select ok(
  position(testes.membro_a()::text in api.contexto()::text) = 0
  and position(testes.usuario_a()::text in api.contexto()::text) = 0,
  'como B, nenhum id de A na resposta'
);

-- Usuário sem membro: registro_invalido, sem dado
select testes.como_sem_membro();
select throws_ok(
  $$ select api.contexto() $$,
  'P0001',
  'registro_invalido',
  'sem membro, contexto recusa com registro_invalido'
);

-- anon não executa
select testes.como_anon();
select throws_ok(
  $$ select api.contexto() $$,
  '42501',
  null,
  'anon não executa api.contexto'
);

select * from finish();
rollback;
