-- Forma do orçamento no resumo do mês: total de `app.orcado_realizado` + destaques (as 3 primeiras
-- linhas, já ordenadas por percentual). Escopo sem orçamento (total nulo) = null.
create or replace function app.resumo_orcamento(p_orcado jsonb)
returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  select case when jsonb_typeof(p_orcado -> 'total') = 'object'
              then (p_orcado -> 'total') || jsonb_build_object('destaques',
                     coalesce((select jsonb_agg(e order by i)
                                 from jsonb_array_elements(p_orcado -> 'linhas') with ordinality t(e, i)
                                where i <= 3), '[]'::jsonb))
         end;
$$;
