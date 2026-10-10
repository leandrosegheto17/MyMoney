-- Prazo de uma meta como texto "YYYY-MM" (nulo sem prazo): única origem do formato, usada pelo item
-- de meta e por api.metas.
create or replace function app.prazo_meta_texto(p_prazo date)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select to_char(p_prazo, 'YYYY-MM');
$$;

-- Item de meta do resumo do mês: o JSON de uma meta com o progresso de app.progresso_meta, sem
-- escopo nem por_local. security invoker: a RLS de app.meta decide a visibilidade; meta invisível
-- ou inexistente devolve nulo.
create or replace function app.meta_item_json(p_meta_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
           'meta_id', m.id, 'nome', m.nome, 'alvo_centavos', m.alvo_centavos,
           'guardado_centavos', p.guardado_centavos, 'falta_centavos', p.falta_centavos,
           'percentual', p.percentual, 'prazo', app.prazo_meta_texto(m.prazo),
           'mensal_necessario_centavos', p.mensal_necessario_centavos, 'atingida', p.atingida)
    from app.meta m
   cross join lateral app.progresso_meta(m.id) p
   where m.id = p_meta_id;
$$;
