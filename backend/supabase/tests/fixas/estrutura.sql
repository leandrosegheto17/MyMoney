-- Tabelas app.despesa_fixa e app.ocorrencia_fixa: colunas, tipos, chaves, índices, RLS, grants e seed.
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(39);

-- Seed local (antes de qualquer limpeza)
select is((select count(*)::int from app.despesa_fixa
           where id between '00000000-0000-4000-8000-000000000701' and '00000000-0000-4000-8000-000000000707' and inicio = '2026-01-01' and encerrada_em is null),
  7, 'o seed cria os 7 modelos do mockup, ativos desde 2026-01-01');
select is((select count(*)::int from app.ocorrencia_fixa
           where id between '00000000-0000-4000-8000-000000000801' and '00000000-0000-4000-8000-000000000807' and mes = '2026-10-01'),
  7, 'o seed cria as 7 ocorrências de outubro/2026');
select results_eq(
  $$select id from app.ocorrencia_fixa
    where id between '00000000-0000-4000-8000-000000000801' and '00000000-0000-4000-8000-000000000807' and lancamento_id is not null order by id$$,
  $$values ('00000000-0000-4000-8000-000000000803'::uuid), ('00000000-0000-4000-8000-000000000805'::uuid), ('00000000-0000-4000-8000-000000000806'::uuid), ('00000000-0000-4000-8000-000000000807'::uuid)$$,
  'as 4 ocorrências pagas do mockup (Luz, Diarista, Água e Gás) têm lançamento');
select results_eq(
  $$select o.id, l.escopo::text, l.dono_id, (select sum(p.valor_centavos) from app.parcela p where p.lancamento_id = l.id)::bigint
    from app.ocorrencia_fixa o join app.lancamento l on l.id = o.lancamento_id
    where o.id between '00000000-0000-4000-8000-000000000801' and '00000000-0000-4000-8000-000000000807' order by o.id$$,
  $$values ('00000000-0000-4000-8000-000000000803'::uuid, 'conjunto', '00000000-0000-4000-8000-000000000102'::uuid, 18740::bigint),
           ('00000000-0000-4000-8000-000000000805'::uuid, 'conjunto', '00000000-0000-4000-8000-000000000102'::uuid, 10000::bigint),
           ('00000000-0000-4000-8000-000000000806'::uuid, 'conjunto', '00000000-0000-4000-8000-000000000101'::uuid, 9510::bigint),
           ('00000000-0000-4000-8000-000000000807'::uuid, 'conjunto', '00000000-0000-4000-8000-000000000102'::uuid, 5000::bigint)$$,
  'os lançamentos das pagas são conjuntos, do pagador do mockup, com o valor pago');
select results_eq(
  $$select o.id, p.data from app.ocorrencia_fixa o join app.parcela p on p.lancamento_id = o.lancamento_id
    where o.id between '00000000-0000-4000-8000-000000000801' and '00000000-0000-4000-8000-000000000807' order by o.id$$,
  $$select id, vencimento from app.ocorrencia_fixa
    where id between '00000000-0000-4000-8000-000000000801' and '00000000-0000-4000-8000-000000000807' and lancamento_id is not null order by id$$,
  'a parcela única de cada fixa paga do seed fica no vencimento');

-- Estrutura de app.despesa_fixa
select has_table('app', 'despesa_fixa', 'app.despesa_fixa existe');
select col_type_is('app', 'despesa_fixa', 'valor_previsto_centavos', 'bigint', 'despesa_fixa.valor_previsto_centavos é bigint');
select col_type_is('app', 'despesa_fixa', 'dia_vencimento', 'smallint', 'despesa_fixa.dia_vencimento é smallint');
select col_type_is('app', 'despesa_fixa', 'inicio', 'date', 'despesa_fixa.inicio é date');
select col_type_is('app', 'despesa_fixa', 'encerrada_em', 'date', 'despesa_fixa.encerrada_em é date');
select col_is_null('app', 'despesa_fixa', 'encerrada_em', 'encerrada_em aceita nulo (fixa ativa)');
select col_not_null('app', 'despesa_fixa', 'descricao', 'descricao é obrigatória');
select col_not_null('app', 'despesa_fixa', 'categoria_id', 'categoria_id é obrigatória');
select col_not_null('app', 'despesa_fixa', 'valor_previsto_centavos', 'valor previsto é obrigatório');
select col_not_null('app', 'despesa_fixa', 'dia_vencimento', 'dia de vencimento é obrigatório');
select col_not_null('app', 'despesa_fixa', 'inicio', 'inicio é obrigatório');
select hasnt_column('app', 'despesa_fixa', 'dono_id', 'a fixa é do lar: sem dono_id');
select fk_ok('app', 'despesa_fixa', array['categoria_id', 'tipo', 'escopo'],
             'app', 'categoria', array['id', 'tipo', 'escopo'],
             'categoria por FK composto (id, tipo, escopo)');
select is(
  (select confdeltype::text from pg_constraint
   where conrelid = 'app.despesa_fixa'::regclass and contype = 'f' and confrelid = 'app.categoria'::regclass),
  'a', 'FK da categoria sem on delete (no action)');

-- Estrutura de app.ocorrencia_fixa
select has_table('app', 'ocorrencia_fixa', 'app.ocorrencia_fixa existe');
select col_type_is('app', 'ocorrencia_fixa', 'valor_previsto_centavos', 'bigint', 'ocorrencia_fixa.valor_previsto_centavos é bigint');
select col_type_is('app', 'ocorrencia_fixa', 'mes', 'date', 'ocorrencia_fixa.mes é date');
select col_type_is('app', 'ocorrencia_fixa', 'vencimento', 'date', 'ocorrencia_fixa.vencimento é date');
select col_is_null('app', 'ocorrencia_fixa', 'lancamento_id', 'lancamento_id aceita nulo (pendente)');
select col_is_unique('app', 'ocorrencia_fixa', array['despesa_fixa_id', 'mes'], 'unique (despesa_fixa_id, mes)');
select col_is_unique('app', 'ocorrencia_fixa', array['lancamento_id'], 'unique (lancamento_id)');
select fk_ok('app', 'ocorrencia_fixa', 'despesa_fixa_id', 'app', 'despesa_fixa', 'id');
select fk_ok('app', 'ocorrencia_fixa', 'lancamento_id', 'app', 'lancamento', 'id');
select hasnt_column('app', 'lancamento', 'ocorrencia_id', 'o vínculo mora em ocorrencia_fixa, não em lancamento');
select is(
  (select confdeltype::text from pg_constraint
   where conrelid = 'app.ocorrencia_fixa'::regclass and contype = 'f' and confrelid = 'app.lancamento'::regclass),
  'n', 'FK do lançamento com on delete set null');
select ok(
  exists (
    select 1 from pg_index i
    where i.indrelid = 'app.ocorrencia_fixa'::regclass
      and (select array_agg(a.attname::text order by k.ordem)
           from unnest(i.indkey) with ordinality as k(attnum, ordem)
           join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum)
          = array['lar_id', 'mes']),
  'índice ocorrencia_fixa(lar_id, mes)');

-- RLS, políticas e grants
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'app.despesa_fixa'::regclass),
  'app.despesa_fixa com RLS enable e force');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'app.ocorrencia_fixa'::regclass),
  'app.ocorrencia_fixa com RLS enable e force');
select ok(
  not exists (select 1 from pg_policies
              where schemaname = 'app' and tablename in ('despesa_fixa', 'ocorrencia_fixa')
                and (qual = 'true' or with_check = 'true')),
  'nenhuma política true nas tabelas de fixas');
select ok(
  not exists (select 1 from pg_policies
              where schemaname = 'app' and tablename in ('despesa_fixa', 'ocorrencia_fixa')
                and (coalesce(qual, '') like '%membro%' and coalesce(qual, '') not like '%lar_atual%')),
  'as políticas usam app.lar_atual(), sem ler app.membro');
select table_privs_are('app', 'despesa_fixa', 'authenticated', array['SELECT', 'INSERT', 'UPDATE'],
  'authenticated lê, cria e edita fixas, sem delete');
select table_privs_are('app', 'ocorrencia_fixa', 'authenticated', array['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'authenticated tem select, insert, update e delete em ocorrencia_fixa');
select table_privs_are('app', 'despesa_fixa', 'anon', array[]::text[], 'anon sem privilégio em despesa_fixa');
select table_privs_are('app', 'ocorrencia_fixa', 'anon', array[]::text[], 'anon sem privilégio em ocorrencia_fixa');

select * from finish();
rollback;
