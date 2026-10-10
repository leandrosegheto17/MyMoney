-- Define o orçamento de uma categoria de despesa num mês; valor nulo remove (idempotente).
-- Escopo e dono vêm sempre da categoria, nunca do cliente: conjunta vale para os dois
-- membros, individual só para o dono. Inexistente, alheia e de receita dão o mesmo
-- `registro_invalido`. Categoria arquivada aceita remoção, mas não recebe valor.
create or replace function api.definir_orcamento(
  p_mes date,
  p_categoria_id uuid,
  p_valor_centavos bigint default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_mes date;
  v_escopo text;
  v_dono uuid;
  v_arquivada boolean;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;
  if p_mes is null then
    raise exception 'valor_invalido';
  end if;
  v_mes := app.inicio_mes(p_mes);

  select c.escopo, c.dono_id, c.arquivada into v_escopo, v_dono, v_arquivada
  from app.categoria c
  where c.id = p_categoria_id and c.tipo = 'despesa';

  if not found or (v_escopo = 'individual' and v_dono is distinct from v_membro) then
    raise exception 'registro_invalido';
  end if;

  if p_valor_centavos is null then
    delete from app.orcamento
    where categoria_id = p_categoria_id and mes = v_mes;
    return;
  end if;

  if p_valor_centavos <= 0 then
    raise exception 'valor_invalido';
  end if;
  if v_arquivada then
    raise exception 'registro_invalido';
  end if;

  insert into app.orcamento (mes, categoria_id, escopo, dono_id, valor_centavos)
  values (v_mes, p_categoria_id, v_escopo, v_dono, p_valor_centavos)
  on conflict (categoria_id, mes) do update set valor_centavos = excluded.valor_centavos;
end;
$$;

revoke execute on function api.definir_orcamento(date, uuid, bigint) from public, anon;
grant execute on function api.definir_orcamento(date, uuid, bigint) to authenticated;
