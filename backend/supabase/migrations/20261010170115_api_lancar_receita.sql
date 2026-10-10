begin;

-- Resposta comum dos lançamentos (despesa e receita), montada a partir do gravado:
-- {id, escopo, categoria (nome), valor_total_centavos, num_parcelas, primeira_parcela_data,
-- ja_existia}. security invoker: a RLS decide o que o membro enxerga.
create or replace function app.resposta_lancamento(p_id uuid, p_ja_existia boolean)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
           'id', l.id,
           'escopo', l.escopo,
           'categoria', c.nome,
           'valor_total_centavos', l.valor_total_centavos,
           'num_parcelas', l.num_parcelas,
           'primeira_parcela_data', p.data,
           'ja_existia', p_ja_existia)
  from app.lancamento l
  join app.categoria c on c.id = l.categoria_id
  join app.parcela p on p.lancamento_id = l.id and p.numero = 1
  where l.id = p_id;
$$;

-- Idempotência pelo id (G-17): nulo se o lançamento não existe ou é invisível ao membro;
-- a resposta gravada com `ja_existia: true` se é do próprio membro; `registro_invalido`
-- se é visível e de outro dono (G-05). Não compara parâmetros do reenvio.
create or replace function app.lancamento_repetido(p_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_dono uuid;
begin
  select l.dono_id into v_dono from app.lancamento l where l.id = p_id;
  if not found then
    return null;
  end if;
  if v_dono is distinct from app.membro_atual() then
    raise exception 'registro_invalido';
  end if;
  return app.resposta_lancamento(p_id, true);
end;
$$;

-- Lança uma despesa (Pix, Débito ou Crédito parcelado) de forma idempotente pelo id (G-17).
-- O escopo vem sempre da categoria (RN-01) e o pagador é quem lança (RN-05). Pix e Débito
-- geram 1 parcela na data da operação; Crédito usa `app.gerar_parcelas` e grava o dia de
-- vencimento aplicado. Reenvio do mesmo id do mesmo membro devolve o gravado, sem comparar
-- parâmetros. Id de outro dono ou invisível pela RLS dá o mesmo `registro_invalido` (G-05).
create or replace function api.lancar_despesa(
  p_id uuid,
  p_valor_centavos bigint,
  p_categoria_id uuid,
  p_forma_id uuid,
  p_parcelas integer default 1,
  p_data date default null,
  p_descricao text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid;
  v_repetido jsonb;
  v_escopo text;
  v_cat_arquivada boolean;
  v_forma_tipo text;
  v_forma_conta uuid;
  v_forma_dia integer;
  v_forma_arquivada boolean;
  v_data date;
begin
  v_membro := app.membro_atual();
  if v_membro is null or p_id is null then
    raise exception 'registro_invalido';
  end if;

  v_repetido := app.lancamento_repetido(p_id);
  if v_repetido is not null then
    return v_repetido;
  end if;

  if p_valor_centavos is null or p_valor_centavos <= 0 then
    raise exception 'valor_invalido';
  end if;

  select c.escopo, c.arquivada into v_escopo, v_cat_arquivada
  from app.categoria c
  where c.id = p_categoria_id and c.tipo = 'despesa';
  if not found then
    raise exception 'registro_invalido';
  end if;

  select f.tipo, f.conta_id, f.dia_vencimento, f.arquivada
    into v_forma_tipo, v_forma_conta, v_forma_dia, v_forma_arquivada
  from app.forma_pagamento f
  where f.id = p_forma_id and f.dono_id = v_membro;
  if not found then
    raise exception 'registro_invalido';
  end if;

  if v_cat_arquivada then
    raise exception 'categoria_arquivada';
  end if;
  if v_forma_arquivada then
    raise exception 'forma_arquivada';
  end if;

  if p_parcelas is null
     or (v_forma_tipo <> 'credito' and p_parcelas <> 1)
     or (v_forma_tipo = 'credito' and p_parcelas not between 1 and 24) then
    raise exception 'valor_invalido';
  end if;

  v_data := coalesce(p_data, app.hoje());

  begin
    insert into app.lancamento (id, lar_id, tipo, escopo, dono_id, categoria_id, descricao,
                                valor_total_centavos, num_parcelas)
    values (p_id, app.lar_atual(), 'despesa', v_escopo, v_membro, p_categoria_id,
            nullif(pg_catalog.btrim(p_descricao), ''), p_valor_centavos, p_parcelas);

    insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, forma_pagamento_id,
                                          conta_id, data_operacao, dia_vencimento_aplicado)
    values (p_id, app.lar_atual(), v_membro, p_forma_id,
            case when v_forma_tipo = 'credito' then null else v_forma_conta end,
            v_data,
            case when v_forma_tipo = 'credito' then v_forma_dia else null end);

    if v_forma_tipo = 'credito' then
      insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
      select p_id, app.lar_atual(), v_escopo, v_membro, g.numero, g.valor_centavos, g.data
      from app.gerar_parcelas(v_data, v_forma_dia, p_parcelas, p_valor_centavos) g;
    else
      insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
      values (p_id, app.lar_atual(), v_escopo, v_membro, 1, p_valor_centavos, v_data);
    end if;
  exception when unique_violation then
    -- Corrida do mesmo membro ou id de lançamento invisível a ele (G-05).
    v_repetido := app.lancamento_repetido(p_id);
    if v_repetido is null then
      raise exception 'registro_invalido';
    end if;
    return v_repetido;
  end;

  return app.resposta_lancamento(p_id, false);
end;
$$;

revoke execute on function api.lancar_despesa(uuid, bigint, uuid, uuid, integer, date, text) from public, anon;
grant execute on function api.lancar_despesa(uuid, bigint, uuid, uuid, integer, date, text) to authenticated;

-- Lança uma receita de forma idempotente pelo id (G-17). Receita é sempre individual (RN-17):
-- categoria de receita do próprio membro e conta de destino própria; sem forma de pagamento,
-- 1 parcela na data da operação. O saldo da conta e os totais do resumo somam o gravado
-- (`app.saldo_conta`, `app.totais_individuais`). Reenvio do mesmo id do mesmo membro devolve o
-- gravado, sem comparar parâmetros. Id de outro dono ou invisível pela RLS, categoria ou conta
-- alheia dão o mesmo `registro_invalido` (G-05).
create or replace function api.lancar_receita(
  p_id uuid,
  p_valor_centavos bigint,
  p_categoria_id uuid,
  p_conta_id uuid,
  p_data date default null,
  p_descricao text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid;
  v_repetido jsonb;
  v_cat_arquivada boolean;
  v_conta_arquivada boolean;
  v_data date;
begin
  v_membro := app.membro_atual();
  if v_membro is null or p_id is null then
    raise exception 'registro_invalido';
  end if;

  v_repetido := app.lancamento_repetido(p_id);
  if v_repetido is not null then
    return v_repetido;
  end if;

  if p_valor_centavos is null or p_valor_centavos <= 0 then
    raise exception 'valor_invalido';
  end if;

  select c.arquivada into v_cat_arquivada
  from app.categoria c
  where c.id = p_categoria_id and c.tipo = 'receita' and c.dono_id = v_membro;
  if not found then
    raise exception 'registro_invalido';
  end if;

  select c.arquivada into v_conta_arquivada
  from app.conta c
  where c.id = p_conta_id and c.dono_id = v_membro;
  if not found then
    raise exception 'registro_invalido';
  end if;

  if v_cat_arquivada then
    raise exception 'categoria_arquivada';
  end if;
  if v_conta_arquivada then
    raise exception 'conta_arquivada';
  end if;

  v_data := coalesce(p_data, app.hoje());

  begin
    insert into app.lancamento (id, lar_id, tipo, escopo, dono_id, categoria_id, descricao,
                                valor_total_centavos, num_parcelas)
    values (p_id, app.lar_atual(), 'receita', 'individual', v_membro, p_categoria_id,
            nullif(pg_catalog.btrim(p_descricao), ''), p_valor_centavos, 1);

    insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, forma_pagamento_id,
                                          conta_id, data_operacao, dia_vencimento_aplicado)
    values (p_id, app.lar_atual(), v_membro, null, p_conta_id, v_data, null);

    insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
    values (p_id, app.lar_atual(), 'individual', v_membro, 1, p_valor_centavos, v_data);
  exception when unique_violation then
    -- Corrida do mesmo membro ou id de lançamento invisível a ele (G-05).
    v_repetido := app.lancamento_repetido(p_id);
    if v_repetido is null then
      raise exception 'registro_invalido';
    end if;
    return v_repetido;
  end;

  return app.resposta_lancamento(p_id, false);
end;
$$;

revoke execute on function api.lancar_receita(uuid, bigint, uuid, uuid, date, text) from public, anon;
grant execute on function api.lancar_receita(uuid, bigint, uuid, uuid, date, text) to authenticated;

commit;
