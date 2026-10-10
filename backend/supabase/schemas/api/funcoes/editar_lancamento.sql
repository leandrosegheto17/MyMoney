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

  if p_valor_total_centavos is not null and p_valor_total_centavos <= 0 then
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
    from app.forma_pagamento f
    where f.id = p_forma_id and f.dono_id = v_membro;
    if not found then
      raise exception 'registro_invalido';
    end if;
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
