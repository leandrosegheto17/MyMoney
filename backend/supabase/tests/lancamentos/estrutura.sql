begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

-- RLS ligada e forçada nas 3 tabelas do agregado
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'app.lancamento'::regclass),
  'app.lancamento tem RLS enable e force');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'app.lancamento_pagamento'::regclass),
  'app.lancamento_pagamento tem RLS enable e force');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'app.parcela'::regclass),
  'app.parcela tem RLS enable e force');

-- Índices pedidos, conferidos pelas colunas (o nome é livre)
select ok(exists (
  select 1 from pg_index i
  where i.indrelid = 'app.parcela'::regclass
    and (select array_agg(a.attname::text order by k.ordem)
         from unnest(i.indkey::smallint[]) with ordinality k(attnum, ordem)
         join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum) = array['lar_id', 'data']
), 'índice parcela(lar_id, data)');
select ok(exists (
  select 1 from pg_index i
  where i.indrelid = 'app.parcela'::regclass
    and (select array_agg(a.attname::text order by k.ordem)
         from unnest(i.indkey::smallint[]) with ordinality k(attnum, ordem)
         join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum) = array['dono_id', 'data']
), 'índice parcela(dono_id, data)');
select ok(exists (
  select 1 from pg_index i
  where i.indrelid = 'app.lancamento'::regclass
    and (select array_agg(a.attname::text order by k.ordem)
         from unnest(i.indkey::smallint[]) with ordinality k(attnum, ordem)
         join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum) = array['dono_id']
), 'índice lancamento(dono_id)');

-- Colunas
select col_type_is('app', 'lancamento', 'valor_total_centavos', 'bigint', 'valor total em centavos bigint');
select col_type_is('app', 'parcela', 'valor_centavos', 'bigint', 'valor da parcela em centavos bigint');
select col_type_is('app', 'parcela', 'data', 'date', 'data da parcela é date');
select col_default_is('app', 'parcela', 'data_ajustada', false, 'data_ajustada padrão false');
select col_is_unique('app', 'parcela', array['lancamento_id', 'numero'], 'unique (lancamento_id, numero)');
select col_is_pk('app', 'lancamento_pagamento', 'lancamento_id', 'parte privada é 1:1 com o lançamento');

-- Dados do pagamento só na parte privada
select hasnt_column('app', 'lancamento', 'forma_pagamento_id', 'lançamento não guarda a forma');
select hasnt_column('app', 'lancamento', 'conta_id', 'lançamento não guarda a conta');
select hasnt_column('app', 'lancamento', 'data_operacao', 'lançamento não guarda a data da operação');
select hasnt_column('app', 'parcela', 'forma_pagamento_id', 'parcela não guarda a forma');
select hasnt_column('app', 'parcela', 'conta_id', 'parcela não guarda a conta');

-- Exclusão em cascata do lançamento para as partes
select ok(exists (
  select 1 from pg_constraint
  where contype = 'f' and conrelid = 'app.lancamento_pagamento'::regclass
    and confrelid = 'app.lancamento'::regclass and confdeltype = 'c'
), 'lancamento_pagamento é excluída em cascata com o lançamento');
select ok(exists (
  select 1 from pg_constraint
  where contype = 'f' and conrelid = 'app.parcela'::regclass
    and confrelid = 'app.lancamento'::regclass and confdeltype = 'c' and confupdtype = 'c'
), 'parcela é excluída e atualizada em cascata com o lançamento');

select * from finish();
rollback;
