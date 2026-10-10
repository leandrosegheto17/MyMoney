-- Aporte ou retirada de uma meta, idempotente pelo id gerado no cliente. A conta é opcional e,
-- quando informada, vira um movimento privado do autor (aporte debita, retirada credita); a
-- resposta devolve só o id, para o outro membro nunca obter a conta pela API. Meta individual
-- alheia, conta alheia e id inexistente recebem o mesmo `registro_invalido`. A retirada é
-- limitada ao guardado no local, lido de app.progresso_meta (nada é somado aqui); o `for update`
-- na meta serializa duas retiradas simultâneas. `atingida_em` é reavaliado ao final.
create or replace function api.movimentar_meta(
  p_id uuid,
  p_meta_id uuid,
  p_tipo text,
  p_valor_centavos bigint,
  p_local text,
  p_data date default null,
  p_conta_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_local text := btrim(p_local);
  v_data date;
  v_autor uuid;
  v_meta uuid;
  v_guardado bigint;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;

  if p_id is null or p_tipo is null or p_tipo not in ('aporte', 'retirada')
     or p_valor_centavos is null or p_valor_centavos <= 0
     or v_local is null or v_local = '' then
    raise exception 'valor_invalido';
  end if;

  v_data := coalesce(p_data, app.hoje());

  select m.autor_id into v_autor from app.movimento_meta m where m.id = p_id;
  if found then
    if v_autor = v_membro then
      return p_id;
    end if;
    raise exception 'registro_invalido';
  end if;

  select m.id into v_meta from app.meta m where m.id = p_meta_id for update;
  if not found then
    raise exception 'registro_invalido';
  end if;

  if p_conta_id is not null and not exists (
    select 1 from app.conta c
    where c.id = p_conta_id and c.dono_id = v_membro and not c.arquivada
  ) then
    raise exception 'registro_invalido';
  end if;

  if p_tipo = 'retirada' then
    select coalesce(sum((l ->> 'guardado_centavos')::bigint), 0) into v_guardado
    from app.progresso_meta(p_meta_id) p, jsonb_array_elements(p.por_local) l
    where l ->> 'local' = v_local;

    if p_valor_centavos > v_guardado then
      raise exception 'retirada_maior_que_guardado';
    end if;
  end if;

  begin
    insert into app.movimento_meta (id, meta_id, tipo, valor_centavos, data, local, autor_id)
    values (p_id, p_meta_id, p_tipo, p_valor_centavos, v_data, v_local, v_membro);
  exception when unique_violation then
    raise exception 'registro_invalido';
  end;

  if p_conta_id is not null then
    insert into app.movimento_conta (conta_id, tipo, sentido, valor_centavos, data, movimento_meta_id)
    values (
      p_conta_id, p_tipo,
      case p_tipo when 'aporte' then 'saida' else 'entrada' end,
      p_valor_centavos, v_data, p_id
    );
  end if;

  perform app.sincronizar_atingida_meta(p_meta_id);

  return p_id;
end;
$$;

revoke execute on function api.movimentar_meta(uuid, uuid, text, bigint, text, date, uuid) from public, anon;
grant execute on function api.movimentar_meta(uuid, uuid, text, bigint, text, date, uuid) to authenticated;
