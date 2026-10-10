-- Cria ou edita uma despesa fixa (modelo recorrente do lar), idempotente pelo id do cliente.
-- Só categoria conjunta de despesa; a individual do outro, a própria, a de receita e a
-- inexistente dão o mesmo `registro_invalido`. Qualquer membro do lar edita (a RLS do lar).
-- Fixa encerrada não é editada. Editar valor ou dia atualiza as ocorrências pendentes do mês
-- atual em diante; as pagas e os meses passados ficam intactos. Lar e início vêm dos defaults.
create or replace function api.salvar_despesa_fixa(
  p_id uuid,
  p_descricao text,
  p_categoria_id uuid,
  p_valor_previsto_centavos bigint,
  p_dia_vencimento integer
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_descricao text := btrim(p_descricao);
  v_existe boolean;
  v_encerrada date;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;

  if p_id is null or v_descricao is null or v_descricao = ''
     or p_valor_previsto_centavos is null or p_valor_previsto_centavos <= 0
     or p_dia_vencimento is null or p_dia_vencimento not between 1 and 31 then
    raise exception 'valor_invalido';
  end if;

  if p_categoria_id is null or not exists (
    select 1 from app.categoria c
    where c.id = p_categoria_id and c.tipo = 'despesa' and c.escopo = 'conjunto'
  ) then
    raise exception 'registro_invalido';
  end if;

  select true, f.encerrada_em into v_existe, v_encerrada
  from app.despesa_fixa f
  where f.id = p_id;

  begin
    if found then
      if v_encerrada is not null then
        raise exception 'valor_invalido';
      end if;
      update app.despesa_fixa
      set descricao = v_descricao,
          categoria_id = p_categoria_id,
          valor_previsto_centavos = p_valor_previsto_centavos,
          dia_vencimento = p_dia_vencimento
      where id = p_id;

      update app.ocorrencia_fixa o
      set valor_previsto_centavos = p_valor_previsto_centavos,
          vencimento = app.dia_no_mes(o.mes, p_dia_vencimento)
      where o.despesa_fixa_id = p_id
        and o.lancamento_id is null
        and o.mes >= app.inicio_mes(app.hoje());
    else
      insert into app.despesa_fixa (id, descricao, categoria_id, valor_previsto_centavos, dia_vencimento)
      values (p_id, v_descricao, p_categoria_id, p_valor_previsto_centavos, p_dia_vencimento);
    end if;
  exception when unique_violation then
    raise exception 'registro_invalido';
  end;

  return p_id;
end;
$$;

revoke execute on function api.salvar_despesa_fixa(uuid, text, uuid, bigint, integer) from public, anon;
grant execute on function api.salvar_despesa_fixa(uuid, text, uuid, bigint, integer) to authenticated;
