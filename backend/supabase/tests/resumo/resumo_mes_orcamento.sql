-- api.resumo_mes: seção de orçamento dos dois blocos e resultado da casa (orçado conjunto - total do casal).
-- Seeds 01-07, outubro/2026. A = usuário ...00a1 (membro ...0101); B = usuário ...00a2 (membro ...0102).
begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(17);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select set_config('teste.r_a', api.resumo_mes('2026-10-01')::text, true);
select set_config('teste.o_conj', app.orcado_realizado('2026-10-01', 'conjunto')::text, true);
select set_config('teste.o_ind_a', app.orcado_realizado('2026-10-01', 'individual')::text, true);
select set_config('teste.vazio_a', api.resumo_mes('2027-06-01')::text, true);
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select set_config('teste.r_b', api.resumo_mes('2026-10-01')::text, true);
reset role;

-- Bloco conjunto
select is(
  (select array_agg(k order by k) from jsonb_object_keys(current_setting('teste.r_a')::jsonb -> 'conjunto' -> 'orcamento') k),
  array['destaques', 'orcado_centavos', 'percentual', 'realizado_centavos', 'situacao'],
  'conjunto.orcamento com a forma do mockup');
select is((current_setting('teste.r_a')::jsonb -> 'conjunto' -> 'orcamento' ->> 'orcado_centavos')::bigint, 430000::bigint, 'orçado conjunto de outubro');
select is((current_setting('teste.r_a')::jsonb -> 'conjunto' -> 'orcamento') - 'destaques', current_setting('teste.o_conj')::jsonb -> 'total',
  'total do orçamento conjunto vem de app.orcado_realizado');
select is(
  current_setting('teste.r_a')::jsonb -> 'conjunto' -> 'orcamento' -> 'destaques',
  (select jsonb_agg(e order by i) from jsonb_array_elements(current_setting('teste.o_conj')::jsonb -> 'linhas') with ordinality t(e, i) where i <= 3),
  'destaques são as 3 primeiras linhas de app.orcado_realizado');
select ok(
  (select coalesce(bool_and((e ->> 'percentual')::int <= lag_p), true)
     from (select e, lag((e ->> 'percentual')::int) over (order by i) as lag_p
             from jsonb_array_elements(current_setting('teste.r_a')::jsonb -> 'conjunto' -> 'orcamento' -> 'destaques') with ordinality t(e, i)) q
    where lag_p is not null)
  and (select e ->> 'categoria_id' from jsonb_array_elements(current_setting('teste.r_a')::jsonb -> 'conjunto' -> 'orcamento' -> 'destaques') e limit 1) = '00000000-0000-4000-8000-000000000404',
  'destaques na ordem decrescente de percentual (Contas da casa, estourada, primeiro)');
select is(
  (current_setting('teste.r_a')::jsonb -> 'conjunto' -> 'resultado' ->> 'valor_centavos')::bigint,
  430000 - (current_setting('teste.r_a')::jsonb -> 'conjunto' ->> 'total_centavos')::bigint,
  'resultado da casa = orçado conjunto - total do casal');
select is((current_setting('teste.r_a')::jsonb -> 'conjunto' -> 'resultado' ->> 'parcial')::boolean, not app.mes_fechado('2026-10-01'),
  'rótulo parcial continua pelo mês fechado');
select is(current_setting('teste.r_b')::jsonb -> 'conjunto', current_setting('teste.r_a')::jsonb -> 'conjunto', 'conjunto de A = conjunto de B');

-- Bloco individual
select is((current_setting('teste.r_a')::jsonb -> 'individual' -> 'orcamento') - 'destaques', current_setting('teste.o_ind_a')::jsonb -> 'total',
  'total do orçamento individual de A vem de app.orcado_realizado');
select ok(
  not exists (
    select 1
    from jsonb_array_elements(current_setting('teste.r_a')::jsonb -> 'individual' -> 'orcamento' -> 'destaques') e
    join app.categoria c on c.id = (e ->> 'categoria_id')::uuid
    where c.dono_id is distinct from '00000000-0000-4000-8000-000000000101'),
  'destaques individuais de A só com categorias de A');
select is(jsonb_array_length(current_setting('teste.r_b')::jsonb -> 'individual' -> 'orcamento' -> 'destaques'), 1,
  'B com uma categoria orçada tem um destaque só');
select ok(
  not exists (
    select 1 from app.categoria c
    where c.dono_id = '00000000-0000-4000-8000-000000000101'
      and position(c.id::text in current_setting('teste.r_b')) > 0),
  'resumo de B não contém categoria individual de A');

-- Mudança aditiva
select ok(
  (current_setting('teste.r_a')::jsonb -> 'conjunto') ?& array['total_centavos', 'total_variaveis_centavos', 'pago_por_membro', 'por_categoria', 'fixas_pendentes', 'metas', 'resultado']
  and (current_setting('teste.r_a')::jsonb -> 'individual') ?& array['resultado', 'metas', 'guardado_no_mes_centavos', 'contas', 'credito'],
  'demais chaves dos blocos continuam presentes');

-- Mês sem orçamento
select ok(coalesce(current_setting('teste.vazio_a')::jsonb -> 'conjunto' -> 'orcamento', 'null'::jsonb) = 'null'::jsonb, 'mês sem orçamento: conjunto.orcamento nulo');
select ok(coalesce(current_setting('teste.vazio_a')::jsonb -> 'individual' -> 'orcamento', 'null'::jsonb) = 'null'::jsonb, 'mês sem orçamento: individual.orcamento nulo');

-- Inferência: orçamento individual de A não muda o bloco individual de B
insert into app.orcamento (lar_id, mes, categoria_id, escopo, dono_id, valor_centavos)
values ((select id from app.lar), '2026-10-01', '00000000-0000-4000-8000-000000000415', 'individual', '00000000-0000-4000-8000-000000000101', 5000);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select is(api.resumo_mes('2026-10-01') -> 'individual', current_setting('teste.r_b')::jsonb -> 'individual',
  'bloco individual de B idêntico depois de A orçar uma individual');
reset role;

-- O resultado individual não depende do orçamento
delete from app.orcamento where mes = '2026-10-01';

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select is(api.resumo_mes('2026-10-01') -> 'individual' -> 'resultado', current_setting('teste.r_a')::jsonb -> 'individual' -> 'resultado',
  'individual.resultado igual com ou sem orçamento');
reset role;

select * from finish();
rollback;
