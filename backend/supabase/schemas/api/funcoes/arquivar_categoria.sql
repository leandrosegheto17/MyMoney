-- Arquiva a categoria (só o estado: lançamentos, orçamentos e fixas ficam como estão). Idempotente.
-- Conjunta: qualquer um dos 2 do lar; individual: só o dono. Inexistente, de outro lar ou
-- individual do outro membro recebe `registro_invalido`.
create or replace function api.arquivar_categoria(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
begin
  update app.categoria
  set arquivada = true
  where id = p_id
    and lar_id = app.lar_atual()
    and (escopo = 'conjunto' or dono_id = v_membro);
  if not found then
    raise exception 'registro_invalido';
  end if;
end;
$$;

revoke execute on function api.arquivar_categoria(uuid) from public, anon;
grant execute on function api.arquivar_categoria(uuid) to authenticated;
