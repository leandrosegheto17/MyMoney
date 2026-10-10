-- Arquiva a conta do chamador (só o estado: lançamentos, movimentos e formas ficam como estão).
-- Idempotente. Inexistente ou de outro membro recebe `registro_invalido`.
create or replace function api.arquivar_conta(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
begin
  update app.conta set arquivada = true where id = p_id and dono_id = v_membro;
  if not found then
    raise exception 'registro_invalido';
  end if;
end;
$$;

revoke execute on function api.arquivar_conta(uuid) from public, anon;
grant execute on function api.arquivar_conta(uuid) to authenticated;
