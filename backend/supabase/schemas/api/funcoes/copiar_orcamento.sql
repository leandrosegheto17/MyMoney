-- Copia o orçamento do mês anterior para o mês pedido, no escopo pedido (RF-15). Devolve o nº de
-- categorias copiadas. Não sobrescreve o que o mês já tem; categoria arquivada não volta. A origem
-- é `app.orcamentos_escopo`, que já limita ao que o membro vê (na individual, só os dele); escopo
-- e dono vêm dessa origem, nunca do cliente. Nada a copiar devolve 0 (idempotente).
-- Sem membro: `registro_invalido`; mês nulo ou escopo fora de conjunto/individual: `valor_invalido`.
create or replace function api.copiar_orcamento(p_mes date, p_escopo text)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_mes date;
  v_copiadas integer;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;
  if p_mes is null or p_escopo is null or p_escopo not in ('conjunto', 'individual') then
    raise exception 'valor_invalido';
  end if;
  v_mes := app.inicio_mes(p_mes);

  insert into app.orcamento (mes, categoria_id, escopo, dono_id, valor_centavos)
  select v_mes, o.categoria_id, o.escopo, o.dono_id, o.valor_centavos
    from app.orcamentos_escopo((v_mes - interval '1 month')::date, p_escopo) o
    join app.categoria c on c.id = o.categoria_id and not c.arquivada
  on conflict (categoria_id, mes) do nothing;

  get diagnostics v_copiadas = row_count;
  return v_copiadas;
end;
$$;

revoke execute on function api.copiar_orcamento(date, text) from public, anon;
grant execute on function api.copiar_orcamento(date, text) to authenticated;
