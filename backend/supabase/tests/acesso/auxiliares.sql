begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(10);

select testes.preparar_lar();

select testes.como_a();
select is(app.membro_atual(), testes.membro_a(), 'como A, membro_atual é o id de A');
select is(app.lar_atual(), '00000000-0000-4000-8000-000000000100'::uuid, 'como A, lar_atual é o lar');
select isnt(app.membro_atual(), testes.membro_b(), 'como A, membro_atual nunca é o id de B');
select isnt(app.lar_atual(), testes.membro_b(), 'como A, lar_atual nunca é o id de B');

select testes.como_b();
select is(app.membro_atual(), testes.membro_b(), 'como B, membro_atual é o id de B');
select is(app.lar_atual(), '00000000-0000-4000-8000-000000000100'::uuid, 'como B, lar_atual é o lar');
select isnt(app.membro_atual(), testes.membro_a(), 'como B, membro_atual nunca é o id de A');

select testes.como_sem_membro();
select is(app.membro_atual(), null::uuid, 'sem membro, membro_atual é null');
select is(app.lar_atual(), null::uuid, 'sem membro, lar_atual é null');

select testes.como_anon();
select throws_ok(
  $$ select app.membro_atual() $$,
  '42501',
  null,
  'anon não chama as auxiliares'
);

select * from finish();
rollback;
