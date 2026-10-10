begin;

create or replace function api.contexto()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;

  return jsonb_build_object(
    'membro', (
      select jsonb_build_object('id', m.id, 'nome', m.nome, 'email', auth.jwt() ->> 'email')
      from app.membro m
      where m.id = v_membro
    ),
    'outro_membro', (
      select jsonb_build_object('nome', o.nome)
      from app.membro o
      where o.id <> v_membro
      limit 1
    ),
    'mes_corrente', app.inicio_mes(app.hoje()),
    'hoje', app.hoje()
  );
end;
$$;

revoke execute on function api.contexto() from public, anon;
grant execute on function api.contexto() to authenticated;

commit;
