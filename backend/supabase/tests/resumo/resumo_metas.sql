begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(20);

create temp table resultados (chave text primary key, valor jsonb);
grant all on resultados to authenticated;

-- Como A, outubro de 2026
select testes.como_a();

insert into resultados values ('A_out', api.resumo_mes('2026-10-01'));
insert into resultados values ('A_metas_conjunto_esperadas', (
  select coalesce(jsonb_agg(jsonb_build_object(
           'meta_id', m.id, 'nome', m.nome, 'alvo_centavos', m.alvo_centavos,
           'guardado_centavos', p.guardado_centavos, 'falta_centavos', p.falta_centavos,
           'percentual', p.percentual, 'prazo', to_char(m.prazo, 'YYYY-MM'),
           'mensal_necessario_centavos', p.mensal_necessario_centavos, 'atingida', p.atingida)
         order by p.atingida, m.nome), '[]'::jsonb)
    from app.meta m cross join lateral app.progresso_meta(m.id) p
   where m.escopo = 'conjunto')));
insert into resultados values ('A_metas_individual_esperadas', (
  select coalesce(jsonb_agg(jsonb_build_object(
           'meta_id', m.id, 'nome', m.nome, 'alvo_centavos', m.alvo_centavos,
           'guardado_centavos', p.guardado_centavos, 'falta_centavos', p.falta_centavos,
           'percentual', p.percentual, 'prazo', to_char(m.prazo, 'YYYY-MM'),
           'mensal_necessario_centavos', p.mensal_necessario_centavos, 'atingida', p.atingida)
         order by p.atingida, m.nome), '[]'::jsonb)
    from app.meta m cross join lateral app.progresso_meta(m.id) p
   where m.escopo = 'individual' and m.dono_id = '00000000-0000-4000-8000-000000000101')));

select is((select valor -> 'conjunto' -> 'metas' from resultados where chave = 'A_out'),
  (select valor from resultados where chave = 'A_metas_conjunto_esperadas'),
  'conjunto.metas de A = metas compartilhadas com os números de app.progresso_meta');
select ok(
  (select valor -> 'conjunto' -> 'metas' from resultados where chave = 'A_out')
    @> '[{"meta_id": "00000000-0000-4000-8000-000000000901"}, {"meta_id": "00000000-0000-4000-8000-000000000902"}]'::jsonb,
  'conjunto.metas traz 901 e 902');
select is((select valor -> 'individual' -> 'metas' from resultados where chave = 'A_out'),
  (select valor from resultados where chave = 'A_metas_individual_esperadas'),
  'individual.metas de A = só as metas individuais de A');
select ok(
  (select valor -> 'individual' -> 'metas' from resultados where chave = 'A_out')
    @> '[{"meta_id": "00000000-0000-4000-8000-000000000903"}, {"meta_id": "00000000-0000-4000-8000-000000000904"}]'::jsonb,
  'individual.metas de A traz 903 e 904');
select is(
  (select valor -> 'individual' -> 'metas' -> -1 ->> 'meta_id' from resultados where chave = 'A_out'),
  '00000000-0000-4000-8000-000000000904', 'meta atingida vem por último');
select is(
  (select array_agg(k order by k) from resultados r, jsonb_array_elements(r.valor -> 'individual' -> 'metas') i, jsonb_object_keys(i) k
    where r.chave = 'A_out' and i ->> 'meta_id' = '00000000-0000-4000-8000-000000000903'),
  array['alvo_centavos', 'atingida', 'falta_centavos', 'guardado_centavos', 'mensal_necessario_centavos',
        'meta_id', 'nome', 'percentual', 'prazo'],
  'item de meta com as chaves de resumo-mes.json, sem escopo nem por_local');
select is(
  (select (valor -> 'individual' ->> 'guardado_no_mes_centavos')::bigint from resultados where chave = 'A_out'),
  50000::bigint, 'guardado no mês de A em outubro = 50.000');
select is(app.guardado_no_mes('2026-10-15'), 50000::bigint, 'app.guardado_no_mes usa o mês da data');

-- Como B, outubro de 2026
select testes.como_b();

insert into resultados values ('B_out', api.resumo_mes('2026-10-01'));

select testes.como_postgres();

select is((select valor -> 'conjunto' -> 'metas' from resultados where chave = 'B_out'),
  (select valor -> 'conjunto' -> 'metas' from resultados where chave = 'A_out'),
  'conjunto.metas de B = de A');
select ok(
  not exists (
    select 1 from resultados r, jsonb_array_elements(r.valor -> 'individual' -> 'metas') i
     where r.chave = 'B_out'
       and (i ->> 'meta_id')::uuid in (select id from app.meta where escopo = 'individual' and dono_id = '00000000-0000-4000-8000-000000000101')),
  'B não recebe meta individual de A');
select ok(
  not exists (
    select 1 from resultados r, app.meta m
     where r.chave = 'B_out' and m.escopo = 'individual'
       and m.dono_id = '00000000-0000-4000-8000-000000000101'
       and position(m.id::text in r.valor::text) > 0),
  'nenhum id de meta individual de A no JSON de B');
select is(
  (select (valor -> 'individual' ->> 'guardado_no_mes_centavos')::bigint from resultados where chave = 'B_out'),
  (select coalesce(sum(case tipo when 'aporte' then valor_centavos else -valor_centavos end), 0)::bigint
     from app.movimento_meta
    where autor_id = '00000000-0000-4000-8000-000000000102' and data >= '2026-10-01' and data < '2026-11-01'),
  'guardado no mês de B = só os movimentos de B');

-- Aporte de A numa compartilhada em outubro e movimentos em março de 2025
insert into app.movimento_meta (lar_id, meta_id, tipo, valor_centavos, data, local, autor_id) values
  ((select id from app.lar), '00000000-0000-4000-8000-000000000902', 'aporte', 10000, '2026-10-06', 'Caixinha Nubank', '00000000-0000-4000-8000-000000000101'),
  ((select id from app.lar), '00000000-0000-4000-8000-000000000902', 'aporte', 7000, '2025-03-10', 'Caixinha Nubank', '00000000-0000-4000-8000-000000000101'),
  ((select id from app.lar), '00000000-0000-4000-8000-000000000902', 'retirada', 2000, '2025-03-20', 'Caixinha Nubank', '00000000-0000-4000-8000-000000000101');

select testes.como_a();
insert into resultados values ('A_out_depois', api.resumo_mes('2026-10-01'));
select is(
  (select (valor -> 'individual' ->> 'guardado_no_mes_centavos')::bigint from resultados where chave = 'A_out_depois'),
  60000::bigint, 'aporte de A no mês aumenta o guardado no mês');
select is(
  (select (valor -> 'individual' ->> 'guardado_no_mes_centavos')::bigint from api.resumo_mes('2025-03-01') as t(valor)),
  5000::bigint, 'mês com aporte e retirada = diferença');
select is(
  (select (valor -> 'individual' ->> 'guardado_no_mes_centavos')::bigint from api.resumo_mes('2025-04-01') as t(valor)),
  0::bigint, 'mês sem movimento = 0');

select testes.como_b();
insert into resultados values ('B_out_depois', api.resumo_mes('2026-10-01'));

select testes.como_postgres();

select is((select valor -> 'individual' -> 'resultado' from resultados where chave = 'A_out_depois'),
  (select valor -> 'individual' -> 'resultado' from resultados where chave = 'A_out'),
  'guardar não muda individual.resultado');
select is((select valor -> 'conjunto' -> 'resultado' from resultados where chave = 'A_out_depois'),
  (select valor -> 'conjunto' -> 'resultado' from resultados where chave = 'A_out'),
  'guardar não muda conjunto.resultado');
select is(
  (select valor -> 'individual' ->> 'guardado_no_mes_centavos' from resultados where chave = 'B_out_depois'),
  (select valor -> 'individual' ->> 'guardado_no_mes_centavos' from resultados where chave = 'B_out'),
  'aporte de A na compartilhada não entra no guardado de B');

-- Sem metas
delete from app.movimento_conta where movimento_meta_id is not null;
delete from app.movimento_meta;
delete from app.meta;

select testes.como_a();
insert into resultados values ('A_sem_metas', api.resumo_mes('2026-10-01'));
select testes.como_postgres();

select is((select valor -> 'conjunto' -> 'metas' from resultados where chave = 'A_sem_metas'),
  '[]'::jsonb, 'sem metas: conjunto.metas vazio');
select is((select valor -> 'individual' -> 'metas' from resultados where chave = 'A_sem_metas'),
  '[]'::jsonb, 'sem metas: individual.metas vazio');

select * from finish();
rollback;
