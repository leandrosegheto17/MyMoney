begin;
create extension if not exists pgtap with schema extensions;
\ir ../apoio/executar_como.psql
select plan(10);

-- Conferência do seed 08-metas como superusuário.
select results_eq(
  $$select m.id::text, m.escopo,
           coalesce(sum(case mm.tipo when 'aporte' then mm.valor_centavos else -mm.valor_centavos end), 0)::bigint
      from app.meta m
      left join app.movimento_meta mm on mm.meta_id = m.id
     where m.id in ('00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000902',
                    '00000000-0000-4000-8000-000000000903', '00000000-0000-4000-8000-000000000904',
                    '00000000-0000-4000-8000-000000000905')
     group by m.id, m.escopo
     order by m.id$$,
  $$values ('00000000-0000-4000-8000-000000000901', 'conjunto', 1850000::bigint),
           ('00000000-0000-4000-8000-000000000902', 'conjunto', 620000::bigint),
           ('00000000-0000-4000-8000-000000000903', 'individual', 240000::bigint),
           ('00000000-0000-4000-8000-000000000904', 'individual', 180000::bigint),
           ('00000000-0000-4000-8000-000000000905', 'individual', 0::bigint)$$,
  'guardado de cada meta do seed bate com metas.json e meta-carro.json');

select results_eq(
  $$select count(*)::int from app.meta
     where id in ('00000000-0000-4000-8000-000000000903', '00000000-0000-4000-8000-000000000904', '00000000-0000-4000-8000-000000000905')
       and dono_id = '00000000-0000-4000-8000-000000000101'$$,
  $$values (3)$$, 'as individuais 903, 904 e 905 são de Leandro');

select isnt((select atingida_em from app.meta where id = '00000000-0000-4000-8000-000000000904'),
  null, 'a meta 904 tem atingida_em preenchido');

select results_eq(
  $$select escopo, dono_id::text from app.meta where id = '00000000-0000-4000-8000-000000000911'$$,
  $$values ('individual', '00000000-0000-4000-8000-000000000102')$$,
  'meta individual 911 de Ana');

select results_eq(
  $$select count(*)::int from app.movimento_meta
     where meta_id = '00000000-0000-4000-8000-000000000911' and local = 'Poupança Ana'$$,
  $$select count(*)::int from app.movimento_meta where meta_id = '00000000-0000-4000-8000-000000000911'$$,
  'a meta de Ana só usa o local exclusivo Poupança Ana');

select ok((select count(*) from app.movimento_meta where local = 'Poupança Ana') > 0,
  'o local exclusivo de Ana tem movimento');

select results_eq(
  $$select id::text, tipo, valor_centavos, data, local, autor_id::text
      from app.movimento_meta where meta_id = '00000000-0000-4000-8000-000000000902' order by data$$,
  $$values ('00000000-0000-4000-8000-000000000b01', 'aporte', 300000::bigint, '2026-07-05'::date, 'Caixinha Nubank', '00000000-0000-4000-8000-000000000101'),
           ('00000000-0000-4000-8000-000000000b02', 'retirada', 30000::bigint, '2026-07-12'::date, 'Caixinha Nubank', '00000000-0000-4000-8000-000000000102'),
           ('00000000-0000-4000-8000-000000000b03', 'aporte', 50000::bigint, '2026-08-05'::date, 'Caixinha Nubank', '00000000-0000-4000-8000-000000000101'),
           ('00000000-0000-4000-8000-000000000b04', 'aporte', 130000::bigint, '2026-08-15'::date, 'CDB Banco Inter', '00000000-0000-4000-8000-000000000102'),
           ('00000000-0000-4000-8000-000000000b05', 'aporte', 50000::bigint, '2026-09-05'::date, 'Caixinha Nubank', '00000000-0000-4000-8000-000000000101'),
           ('00000000-0000-4000-8000-000000000b06', 'aporte', 70000::bigint, '2026-09-20'::date, 'CDB Banco Inter', '00000000-0000-4000-8000-000000000102'),
           ('00000000-0000-4000-8000-000000000b07', 'aporte', 50000::bigint, '2026-10-05'::date, 'Caixinha Nubank', '00000000-0000-4000-8000-000000000101')$$,
  'os 7 movimentos da 902 são os de movimentos-meta.json');

select results_eq(
  $$select count(*)::int from app.movimento_meta mm
      join app.movimento_conta mc on mc.movimento_meta_id = mm.id
     where mm.meta_id = '00000000-0000-4000-8000-000000000902'
       and mm.autor_id = '00000000-0000-4000-8000-000000000101'
       and mc.conta_id = '00000000-0000-4000-8000-000000000201'$$,
  $$values (4)$$, 'os aportes de Leandro na 902 saem da conta Nubank');

select is(
  (select coalesce(sum(case tipo when 'aporte' then valor_centavos else -valor_centavos end), 0)::bigint
     from app.movimento_meta
    where autor_id = '00000000-0000-4000-8000-000000000101'
      and data >= '2026-10-01' and data < '2026-11-01'),
  50000::bigint, 'Leandro guardou 50.000 em outubro de 2026');

select bag_eq(
  $$select distinct mm.local from app.movimento_meta mm
      join app.meta m on m.id = mm.meta_id
     where m.escopo = 'conjunto' or m.dono_id = '00000000-0000-4000-8000-000000000101'$$,
  $$values ('Caixinha Nubank'), ('CDB Banco Inter')$$,
  'locais das metas visíveis a Leandro = locais-guardados.json');

select * from finish();
rollback;
