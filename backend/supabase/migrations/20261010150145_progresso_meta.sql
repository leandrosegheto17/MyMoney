begin;

-- Única fonte do progresso de uma meta (SDD §5 Derivações; CA-17.2, 17.3). Tudo derivado dos
-- movimentos, em inteiros. security invoker: a RLS de meta/movimento_meta decide a visibilidade;
-- meta invisível ou inexistente devolve zero linhas. p_hoje existe para tornar o cálculo testável.
create or replace function app.progresso_meta(p_meta_id uuid, p_hoje date default app.hoje())
returns table (
  guardado_centavos bigint,
  falta_centavos bigint,
  percentual integer,
  mensal_necessario_centavos bigint,
  atingida boolean,
  por_local jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with soma as (
    select m.id, m.alvo_centavos, m.prazo,
           coalesce((select sum(case mm.tipo when 'aporte' then mm.valor_centavos else -mm.valor_centavos end)
                       from app.movimento_meta mm where mm.meta_id = m.id), 0)::bigint as guardado
      from app.meta m
     where m.id = p_meta_id
  ),
  calc as (
    select s.*,
           greatest(0, s.alvo_centavos - s.guardado)::bigint as falta,
           case when s.prazo is null then null
                else greatest(1,
                  (extract(year from s.prazo)::int * 12 + extract(month from s.prazo)::int)
                  - (extract(year from app.inicio_mes(p_hoje))::int * 12
                     + extract(month from app.inicio_mes(p_hoje))::int))
           end as meses
      from soma s
  )
  select c.guardado,
         c.falta,
         case when c.guardado < c.alvo_centavos
              then least(99, round(100.0 * c.guardado / c.alvo_centavos)::int)
              else 100
         end,
         case when c.meses is null or c.falta = 0 then null
              else (c.falta + c.meses - 1) / c.meses
         end,
         c.guardado >= c.alvo_centavos,
         coalesce((
           select jsonb_agg(jsonb_build_object('local', l.local, 'guardado_centavos', l.saldo)
                            order by l.saldo desc, l.local)
             from (select mm.local,
                          sum(case mm.tipo when 'aporte' then mm.valor_centavos else -mm.valor_centavos end) as saldo
                     from app.movimento_meta mm
                    where mm.meta_id = c.id
                    group by mm.local
                   having sum(case mm.tipo when 'aporte' then mm.valor_centavos else -mm.valor_centavos end) > 0) l
         ), '[]'::jsonb)
    from calc c;
$$;

revoke execute on function app.progresso_meta(uuid, date) from public, anon;
grant execute on function app.progresso_meta(uuid, date) to authenticated;

commit;
