-- Dados da tela de lançamento do chamador: categorias de despesa (mais usadas por ele
-- primeiro, empate por nome na collation padrão do banco), categorias de receita, formas e
-- contas ativas, e os padrões `forma_padrao_id` (preferida, senão a da despesa mais recente)
-- e `conta_receita_padrao_id` (conta da receita mais recente). "Mais recente" = maior
-- `app.lancamento.criado_em`. A contagem usa todo o histórico e filtra por `dono_id` do
-- membro de forma explícita: a conjunta lançada pelo outro é visível e não conta (SDD §7
-- item 6). Listas vazias são `[]`; padrões sem valor são `null`. Sem membro: `registro_invalido`.
create or replace function api.dados_lancamento()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
  v_forma_padrao uuid;
  v_conta_padrao uuid;
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;

  select f.id into v_forma_padrao
  from app.forma_pagamento f
  where f.dono_id = v_membro and f.preferida and not f.arquivada
  limit 1;

  if v_forma_padrao is null then
    select f.id into v_forma_padrao
    from app.lancamento l
    join app.lancamento_pagamento p on p.lancamento_id = l.id and p.dono_id = v_membro
    join app.forma_pagamento f on f.id = p.forma_pagamento_id and f.dono_id = v_membro
    where l.dono_id = v_membro and l.tipo = 'despesa' and not f.arquivada
    order by l.criado_em desc, l.id desc
    limit 1;
  end if;

  select c.id into v_conta_padrao
  from app.lancamento l
  join app.lancamento_pagamento p on p.lancamento_id = l.id and p.dono_id = v_membro
  join app.conta c on c.id = p.conta_id and c.dono_id = v_membro
  where l.dono_id = v_membro and l.tipo = 'receita' and not c.arquivada
  order by l.criado_em desc, l.id desc
  limit 1;

  return jsonb_build_object(
    'categorias_despesa', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'nome', c.nome, 'escopo', c.escopo, 'variavel', c.variavel)
             order by coalesce(u.usos, 0) desc, c.nome)
      from app.categoria c
      left join (
        select l.categoria_id, count(*) as usos
        from app.lancamento l
        where l.dono_id = v_membro and l.tipo = 'despesa'
        group by l.categoria_id
      ) u on u.categoria_id = c.id
      where c.tipo = 'despesa' and not c.arquivada
    ), '[]'::jsonb),
    'categorias_receita', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome, 'escopo', c.escopo)
             order by c.nome)
      from app.categoria c
      where c.tipo = 'receita' and not c.arquivada
    ), '[]'::jsonb),
    'formas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', f.id, 'nome', f.nome, 'tipo', f.tipo, 'preferida', f.preferida)
             order by f.nome)
      from app.forma_pagamento f
      where f.dono_id = v_membro and not f.arquivada
    ), '[]'::jsonb),
    'forma_padrao_id', v_forma_padrao,
    'contas', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome) order by c.nome)
      from app.conta c
      where c.dono_id = v_membro and not c.arquivada
    ), '[]'::jsonb),
    'conta_receita_padrao_id', v_conta_padrao
  );
end;
$$;

revoke execute on function api.dados_lancamento() from public, anon;
grant execute on function api.dados_lancamento() to authenticated;
