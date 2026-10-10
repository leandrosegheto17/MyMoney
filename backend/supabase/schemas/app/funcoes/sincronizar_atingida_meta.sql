-- Reavalia `atingida_em` de uma meta a partir do progresso derivado: marca com a data de hoje
-- quando o guardado alcança o alvo (mantém a data original se já marcada) e desmarca quando
-- deixa de alcançar. Não soma nada: a conta é de app.progresso_meta. security invoker: meta
-- invisível ao chamador não é tocada.
create or replace function app.sincronizar_atingida_meta(p_meta_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update app.meta m
     set atingida_em = case
       when (select p.atingida from app.progresso_meta(m.id) p) then coalesce(m.atingida_em, app.hoje())
       else null
     end
   where m.id = p_meta_id;
$$;

revoke execute on function app.sincronizar_atingida_meta(uuid) from public, anon;
grant execute on function app.sincronizar_atingida_meta(uuid) to authenticated;
