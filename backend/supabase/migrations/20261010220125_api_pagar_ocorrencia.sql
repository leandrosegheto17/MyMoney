begin;

-- Forma de pagamento do membro atual: tipo, conta (Pix/Débito) e dia de vencimento (Crédito),
-- mais `arquivada` para quem decide a recusa. Forma inexistente, invisível ou de outro membro
-- dá o mesmo `registro_invalido` (G-05). Serve também às funções DEFINER: o filtro por dono
-- é explícito e não depende da RLS.
create or replace function app.forma_do_membro(p_forma_id uuid)
returns table (tipo text, conta_id uuid, dia_vencimento smallint, arquivada boolean)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  return query
  select f.tipo, f.conta_id, f.dia_vencimento, f.arquivada
  from app.forma_pagamento f
  where f.id = p_forma_id and f.dono_id = app.membro_atual();
  if not found then
    raise exception 'registro_invalido';
  end if;
end;
$$;

-- Resposta do pagamento de uma ocorrência: {ocorrencia_id, lancamento_id, situacao,
-- valor_pago_centavos, vencimento, ja_existia}. O valor pago vem da parcela e a data mostrada
-- é o vencimento; forma, conta e data do pagamento nunca entram (RN-04).
create or replace function app.resposta_pagamento_ocorrencia(p_ocorrencia_id uuid, p_ja_existia boolean)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
           'ocorrencia_id', o.id,
           'lancamento_id', o.lancamento_id,
           'situacao', 'paga',
           'valor_pago_centavos', (select pg_catalog.sum(p.valor_centavos)::bigint
                                   from app.parcela p where p.lancamento_id = o.lancamento_id),
           'vencimento', o.vencimento,
           'ja_existia', p_ja_existia)
  from app.ocorrencia_fixa o
  where o.id = p_ocorrencia_id;
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

  if p_valor_centavos is null or p_valor_centavos <= 0
     or p_valor_centavos > 100000000000 then
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
  from app.forma_do_membro(p_forma_id) f;

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

    insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
    select p_id, app.lar_atual(), v_escopo, v_membro, c.numero, c.valor_centavos, c.data
    from app.calcular_parcelas(v_forma_tipo, v_data, v_forma_dia, p_parcelas, p_valor_centavos) c;
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

-- Edita um lançamento (CA-08.1, 08.2, 08.5a). É a única função DEFINER de `api` (ADR-003 §3):
-- o outro membro precisa mudar a conjunta do pagador, o que a RLS não deixa, e a parte
-- privada (forma, conta, data da operação) continua só do pagador. Como a RLS não vale aqui,
-- toda leitura filtra lar/escopo/dono de forma explícita e a resposta é mínima: nunca
-- devolve nem chama nada que monte campo privado (RN-04). Parâmetro nulo = não muda;
-- `p_descricao = ''` limpa; parâmetro igual ao gravado não conta como mudança. Qualquer
-- mudança sem permissão recusa a edição inteira, antes de gravar. Receita aceita valor,
-- data, descrição e categoria de receita.
create or replace function api.editar_lancamento(
  p_id uuid,
  p_valor_total_centavos bigint default null,
  p_categoria_id uuid default null,
  p_descricao text default null,
  p_data date default null,
  p_forma_id uuid default null,
  p_num_parcelas integer default null,
  p_confirmar_descarte boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membro uuid;
  v_lanc app.lancamento%rowtype;
  v_perm record;
  v_pag app.lancamento_pagamento%rowtype;
  v_tipo_atual text;
  v_cat_escopo text;
  v_cat_arquivada boolean;
  v_forma_tipo text;
  v_forma_conta uuid;
  v_forma_dia integer;
  v_forma_arquivada boolean;
  v_mudou_desc boolean;
  v_mudou_valor boolean;
  v_mudou_data boolean;
  v_mudou_forma boolean;
  v_mudou_parcelas boolean;
  v_mudou_cat boolean;
  v_valor bigint;
  v_data date;
  v_num integer;
  v_escopo text;
  v_forma uuid;
  v_tipo text;
  v_dia integer;
  v_conta uuid;
  v_descricao text;
  v_alterado timestamptz := pg_catalog.now();
begin
  v_membro := app.membro_atual();
  if v_membro is null or p_id is null then
    raise exception 'registro_invalido';
  end if;

  select l.* into v_lanc
  from app.lancamento l
  where l.id = p_id
    and l.lar_id = app.lar_atual()
    and (l.escopo = 'conjunto' or l.dono_id = v_membro)
  for update;
  if not found then
    raise exception 'registro_invalido';
  end if;

  select * into v_perm from app.permissoes_edicao(p_id);

  select lp.* into v_pag from app.lancamento_pagamento lp where lp.lancamento_id = p_id;

  if v_pag.forma_pagamento_id is not null then
    select f.tipo into v_tipo_atual
    from app.forma_pagamento f
    where f.id = v_pag.forma_pagamento_id and f.dono_id = v_lanc.dono_id;
  end if;

  v_mudou_desc := p_descricao is not null
    and nullif(pg_catalog.btrim(p_descricao), '') is distinct from v_lanc.descricao;
  v_mudou_valor := p_valor_total_centavos is not null
    and p_valor_total_centavos is distinct from v_lanc.valor_total_centavos;
  v_mudou_data := p_data is not null and p_data is distinct from v_pag.data_operacao;
  v_mudou_forma := p_forma_id is not null and p_forma_id is distinct from v_pag.forma_pagamento_id;
  v_mudou_parcelas := p_num_parcelas is not null and p_num_parcelas is distinct from v_lanc.num_parcelas;
  v_mudou_cat := p_categoria_id is not null and p_categoria_id is distinct from v_lanc.categoria_id;

  v_escopo := v_lanc.escopo;
  if v_mudou_cat then
    -- Categoria nova: mesmo tipo e visível a quem edita (conjunta ou individual dele).
    select c.escopo, c.arquivada into v_cat_escopo, v_cat_arquivada
    from app.categoria c
    where c.id = p_categoria_id
      and c.lar_id = app.lar_atual()
      and c.tipo = v_lanc.tipo
      and (c.escopo = 'conjunto' or c.dono_id = v_membro);
    if not found then
      raise exception 'registro_invalido';
    end if;
    v_escopo := v_cat_escopo;
  end if;

  if (v_mudou_desc and not v_perm.descricao)
     or (v_mudou_valor and not v_perm.valor)
     or (v_mudou_data and not v_perm.data)
     or (v_mudou_forma and not v_perm.forma)
     or (v_mudou_parcelas and not v_perm.parcelas)
     or (v_mudou_cat and v_escopo <> v_lanc.escopo and not v_perm.troca_escopo)
     or (v_mudou_cat and v_escopo = v_lanc.escopo and not v_perm.categoria_mesmo_escopo) then
    raise exception 'sem_permissao';
  end if;

  if p_valor_total_centavos is not null
     and (p_valor_total_centavos <= 0 or p_valor_total_centavos > 100000000000) then
    raise exception 'valor_invalido';
  end if;
  if v_mudou_cat and v_cat_arquivada then
    raise exception 'categoria_arquivada';
  end if;

  v_valor := coalesce(p_valor_total_centavos, v_lanc.valor_total_centavos);
  v_data := coalesce(p_data, v_pag.data_operacao);
  v_num := coalesce(p_num_parcelas, v_lanc.num_parcelas);
  v_forma := v_pag.forma_pagamento_id;
  v_conta := v_pag.conta_id;
  v_dia := v_pag.dia_vencimento_aplicado;
  v_tipo := coalesce(v_tipo_atual, 'pix');

  if v_lanc.tipo = 'receita' then
    -- Receita é 1 parcela na data; forma não existe nela.
    if p_forma_id is not null then
      raise exception 'registro_invalido';
    end if;
  elsif v_mudou_forma then
    -- Só o pagador chega aqui (permissão `forma`): a forma nova tem de ser dele.
    select f.tipo, f.conta_id, f.dia_vencimento, f.arquivada
      into v_forma_tipo, v_forma_conta, v_forma_dia, v_forma_arquivada
    from app.forma_do_membro(p_forma_id) f;
    if v_forma_arquivada then
      raise exception 'forma_arquivada';
    end if;
    v_forma := p_forma_id;
    v_tipo := v_forma_tipo;
    v_conta := case when v_forma_tipo = 'credito' then null else v_forma_conta end;
    v_dia := case when v_forma_tipo = 'credito' then v_forma_dia else null end;
  end if;

  if v_mudou_valor or v_mudou_parcelas or v_mudou_data or v_mudou_forma or v_mudou_cat then
    -- Valida N e total pela mesma regra do lançamento, antes de qualquer escrita.
    if v_num not between 1 and 24 then
      raise exception 'valor_invalido';
    end if;
    perform 1 from app.calcular_parcelas(v_tipo, v_data, v_dia, v_num, v_valor);

    if not p_confirmar_descarte
       and exists (select 1 from app.parcela p where p.lancamento_id = p_id and p.data_ajustada) then
      raise exception 'confirmar_descarte_ajustes';
    end if;
  end if;

  v_descricao := case when p_descricao is null then v_lanc.descricao
                      else nullif(pg_catalog.btrim(p_descricao), '') end;

  -- Categoria e escopo no mesmo update (RN-07); as parcelas acompanham pelo cascade.
  update app.lancamento
  set categoria_id = coalesce(p_categoria_id, categoria_id),
      escopo = v_escopo,
      descricao = v_descricao,
      valor_total_centavos = v_valor,
      num_parcelas = v_num,
      alterado_por = v_membro,
      alterado_em = v_alterado
  where id = p_id;

  update app.lancamento_pagamento
  set forma_pagamento_id = v_forma,
      conta_id = v_conta,
      data_operacao = v_data,
      dia_vencimento_aplicado = v_dia
  where lancamento_id = p_id;

  if v_mudou_valor or v_mudou_parcelas or v_mudou_data or v_mudou_forma or v_mudou_cat then
    -- Mantém os ids das parcelas que continuam; remove as que sobram e cria as novas.
    delete from app.parcela p where p.lancamento_id = p_id and p.numero > v_num;

    update app.parcela p
    set valor_centavos = c.valor_centavos, data = c.data, data_ajustada = false
    from app.calcular_parcelas(v_tipo, v_data, v_dia, v_num, v_valor) c
    where p.lancamento_id = p_id and p.numero = c.numero;

    insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
    select p_id, v_lanc.lar_id, v_escopo, v_lanc.dono_id, c.numero, c.valor_centavos, c.data
    from app.calcular_parcelas(v_tipo, v_data, v_dia, v_num, v_valor) c
    where not exists (select 1 from app.parcela p where p.lancamento_id = p_id and p.numero = c.numero);
  end if;

  return pg_catalog.jsonb_build_object(
    'id', p_id,
    'escopo', v_escopo,
    'num_parcelas', v_num,
    'alterado_em', v_alterado);
end;
$$;

revoke execute on function api.editar_lancamento(uuid, bigint, uuid, text, date, uuid, integer, boolean) from public, anon;
grant execute on function api.editar_lancamento(uuid, bigint, uuid, text, date, uuid, integer, boolean) to authenticated;

-- Paga uma ocorrência de despesa fixa à vista (CA-12.1, 12.2, 12.2a): cria o lançamento
-- conjunto do pagador ligado à ocorrência, com 1 parcela no vencimento da ocorrência (I-20,
-- ADR-005 §3) e a parte privada (forma, conta, data do pagamento) só do pagador. Valor padrão
-- é o previsto e data padrão é hoje. Pix/Débito afetam o saldo pela data da operação; Crédito
-- guarda o dia de vencimento da forma e não toca nenhuma conta. Idempotente pelo id (G-17).
-- A resposta não carrega forma, conta nem data do pagamento (RN-04).
create or replace function api.pagar_ocorrencia(
  p_id uuid,
  p_ocorrencia_id uuid,
  p_forma_id uuid,
  p_valor_centavos bigint default null,
  p_data date default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid;
  v_repetido app.lancamento%rowtype;
  v_ocorrencia record;
  v_forma record;
  v_valor bigint;
  v_data date;
begin
  v_membro := app.membro_atual();
  if v_membro is null or p_id is null or p_ocorrencia_id is null then
    raise exception 'registro_invalido';
  end if;

  -- Mesmo id já gravado: do próprio membro e ligado a esta ocorrência é reenvio;
  -- de outro dono ou invisível a ele é recusa (G-05).
  if app.lancamento_repetido(p_id) is not null then
    if exists (select 1 from app.ocorrencia_fixa o
               where o.id = p_ocorrencia_id and o.lancamento_id = p_id) then
      return app.resposta_pagamento_ocorrencia(p_ocorrencia_id, true);
    end if;
    raise exception 'registro_invalido';
  end if;

  select o.id, o.lancamento_id, o.vencimento, o.valor_previsto_centavos,
         d.categoria_id, d.descricao
    into v_ocorrencia
  from app.ocorrencia_fixa o
  join app.despesa_fixa d on d.id = o.despesa_fixa_id
  where o.id = p_ocorrencia_id
  for update of o;
  if not found then
    raise exception 'registro_invalido';
  end if;
  if v_ocorrencia.lancamento_id is not null then
    raise exception 'ocorrencia_paga';
  end if;

  select * into v_forma from app.forma_do_membro(p_forma_id);
  if v_forma.arquivada then
    raise exception 'forma_arquivada';
  end if;

  v_valor := coalesce(p_valor_centavos, v_ocorrencia.valor_previsto_centavos);
  if v_valor <= 0 or v_valor > 100000000000 then
    raise exception 'valor_invalido';
  end if;
  v_data := coalesce(p_data, app.hoje());

  begin
    insert into app.lancamento (id, lar_id, tipo, escopo, dono_id, categoria_id, descricao,
                                valor_total_centavos, num_parcelas)
    values (p_id, app.lar_atual(), 'despesa', 'conjunto', v_membro, v_ocorrencia.categoria_id,
            v_ocorrencia.descricao, v_valor, 1);

    insert into app.lancamento_pagamento (lancamento_id, lar_id, dono_id, forma_pagamento_id,
                                          conta_id, data_operacao, dia_vencimento_aplicado)
    values (p_id, app.lar_atual(), v_membro, p_forma_id,
            case when v_forma.tipo = 'credito' then null else v_forma.conta_id end,
            v_data,
            case when v_forma.tipo = 'credito' then v_forma.dia_vencimento else null end);

    insert into app.parcela (lancamento_id, lar_id, escopo, dono_id, numero, valor_centavos, data)
    values (p_id, app.lar_atual(), 'conjunto', v_membro, 1, v_valor, v_ocorrencia.vencimento);
  exception when unique_violation then
    -- Corrida com o mesmo id: só o próprio membro lendo o gravado é reenvio (G-17).
    if app.lancamento_repetido(p_id) is null
       or not exists (select 1 from app.ocorrencia_fixa o
                      where o.id = p_ocorrencia_id and o.lancamento_id = p_id) then
      raise exception 'registro_invalido';
    end if;
    return app.resposta_pagamento_ocorrencia(p_ocorrencia_id, true);
  end;

  update app.ocorrencia_fixa set lancamento_id = p_id where id = p_ocorrencia_id;

  return app.resposta_pagamento_ocorrencia(p_ocorrencia_id, false);
end;
$$;

revoke execute on function api.pagar_ocorrencia(uuid, uuid, uuid, bigint, date) from public, anon;
grant execute on function api.pagar_ocorrencia(uuid, uuid, uuid, bigint, date) to authenticated;

commit;
