-- Aportes e retiradas de uma meta, do mais recente ao mais antigo (RF-18). A conta de origem só
-- aparece nas linhas do próprio autor (RN-08): a RLS de movimento_conta já esconde a do outro e
-- o filtro por autor é a segunda barreira. Meta inexistente e individual alheia dão o mesmo
-- `registro_invalido`; meta visível sem movimentos devolve lista vazia.
create or replace function api.movimentos_meta(p_meta_id uuid)
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
  if p_meta_id is null then
    raise exception 'valor_invalido';
  end if;

  perform 1 from app.meta where id = p_meta_id;
  if not found then
    raise exception 'registro_invalido';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', mm.id,
      'tipo', mm.tipo,
      'valor_centavos', mm.valor_centavos,
      'data', mm.data,
      'local', mm.local,
      'autor', jsonb_build_object('nome', a.nome, 'sou_eu', mm.autor_id = v_membro)
    ) || case
      when mm.autor_id = v_membro and c.id is not null
        then jsonb_build_object('conta', jsonb_build_object('nome', c.nome))
      else '{}'::jsonb
    end
    order by mm.data desc, mm.criado_em desc, mm.id desc
  ), '[]'::jsonb) into v_resultado
  from app.movimento_meta mm
  join app.membro a on a.id = mm.autor_id
  left join app.movimento_conta mc on mc.movimento_meta_id = mm.id
  left join app.conta c on c.id = mc.conta_id
  where mm.meta_id = p_meta_id;

  return v_resultado;
end;
$$;

revoke execute on function api.movimentos_meta(uuid) from public, anon;
grant execute on function api.movimentos_meta(uuid) to authenticated;
