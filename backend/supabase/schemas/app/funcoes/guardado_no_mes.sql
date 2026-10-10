-- Quanto o membro logado guardou no mês (RN-16c): aportes menos retiradas dele em todas as metas
-- visíveis (compartilhadas e individuais). Informativo: não entra em nenhum resultado. O saldo
-- pode ser negativo (mês só com retiradas) e é devolvido como está. p_mes é normalizado para o
-- início do mês. Sem membro logado, 0. security invoker: a RLS de movimento_meta decide a
-- visibilidade; o autor é filtrado de forma explícita além da RLS.
create or replace function app.guardado_no_mes(p_mes date)
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(case mm.tipo when 'aporte' then mm.valor_centavos else -mm.valor_centavos end), 0)::bigint
    from app.movimento_meta mm
   where mm.autor_id = app.membro_atual()
     and mm.data >= app.inicio_mes(p_mes)
     and mm.data < (app.inicio_mes(p_mes) + interval '1 month')::date;
$$;
