-- Exclui a categoria. Com vínculo (qualquer FK para app.categoria) recebe `categoria_em_uso`, sem
-- detalhe. Conjunta: qualquer um dos 2 do lar; individual: só o dono. Inexistente, de outro lar
-- ou individual do outro membro recebe `registro_invalido` antes de qualquer outra resposta.
create or replace function api.excluir_categoria(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
begin
  begin
    delete from app.categoria
    where id = p_id
      and lar_id = app.lar_atual()
      and (escopo = 'conjunto' or dono_id = v_membro);
  exception when foreign_key_violation then
    raise exception 'categoria_em_uso';
  end;
  if not found then
    raise exception 'registro_invalido';
  end if;
end;
$$;

revoke execute on function api.excluir_categoria(uuid) from public, anon;
grant execute on function api.excluir_categoria(uuid) to authenticated;
