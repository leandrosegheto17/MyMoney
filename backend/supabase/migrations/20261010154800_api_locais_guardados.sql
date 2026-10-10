begin;

-- Locais já usados nos aportes e retiradas das metas visíveis ao membro (RF-18), do uso mais
-- recente ao mais antigo. Sem filtro por lar ou escopo: a RLS de movimento_meta, via meta, já
-- limita às metas visíveis, então o local de uma individual alheia nunca aparece (SDD §7 item 6).
-- Inclui locais já zerados: o saldo por local é assunto da retirada.
create or replace function api.locais_guardados()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_resultado jsonb;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;

  select coalesce(jsonb_agg(s.local order by s.ultimo_uso desc, s.local), '[]'::jsonb)
    into v_resultado
  from (
    select mm.local, max(mm.data) as ultimo_uso
    from app.movimento_meta mm
    group by mm.local
  ) s;

  return v_resultado;
end;
$$;

revoke execute on function api.locais_guardados() from public, anon;
grant execute on function api.locais_guardados() to authenticated;

commit;
