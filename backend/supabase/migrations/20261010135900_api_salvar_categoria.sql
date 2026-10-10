begin;

-- Cria ou edita uma categoria, idempotente pelo id gerado no cliente.
-- Receita força escopo individual e variavel nulo (o escopo recebido é ignorado);
-- despesa grava variavel (nulo vira falso). Tipo e escopo são imutáveis depois de criada.
-- Conjunta: editável pelos 2; individual: só pelo dono (a RLS esconde a do outro, e o id
-- dela recebe `registro_invalido`). Dono e lar vêm das auxiliares, nunca de parâmetro.
-- Não mexe em `arquivada`.
create or replace function api.salvar_categoria(
  p_id uuid,
  p_nome text,
  p_tipo text,
  p_escopo text,
  p_variavel boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_nome text := btrim(p_nome);
  v_escopo text;
  v_variavel boolean;
  v_tipo_atual text;
  v_escopo_atual text;
  v_constraint text;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;

  if p_id is null or v_nome is null or v_nome = ''
     or p_tipo is null or p_tipo not in ('despesa', 'receita')
     or p_escopo is null or p_escopo not in ('conjunto', 'individual') then
    raise exception 'valor_invalido';
  end if;

  if p_tipo = 'receita' then
    v_escopo := 'individual';
    v_variavel := null;
  else
    v_escopo := p_escopo;
    v_variavel := coalesce(p_variavel, false);
  end if;

  select c.tipo, c.escopo into v_tipo_atual, v_escopo_atual
  from app.categoria c
  where c.id = p_id;

  begin
    if found then
      if v_tipo_atual <> p_tipo or v_escopo_atual <> v_escopo then
        raise exception 'valor_invalido';
      end if;
      update app.categoria
      set nome = v_nome, variavel = v_variavel
      where id = p_id;
    else
      insert into app.categoria (id, tipo, escopo, dono_id, nome, variavel)
      values (
        p_id, p_tipo, v_escopo,
        case when v_escopo = 'individual' then v_membro end,
        v_nome, v_variavel
      );
    end if;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'categoria_unica' then
      raise exception 'nome_repetido';
    end if;
    raise exception 'registro_invalido';
  end;

  return p_id;
end;
$$;

revoke execute on function api.salvar_categoria(uuid, text, text, text, boolean) from public, anon;
grant execute on function api.salvar_categoria(uuid, text, text, text, boolean) to authenticated;

commit;
