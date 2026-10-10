begin;

-- Cria as categorias iniciais: as conjuntas uma vez por lar e as individuais do chamador.
-- Só cria se o lar não tem nenhuma conjunta e o chamador nenhuma individual (inclusive
-- arquivadas), então renomear ou excluir uma inicial não a recria. A restrição única
-- resolve a corrida entre os dois membros.
create or replace function api.inicializar_membro()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_membro uuid := app.membro_atual();
begin
  if v_membro is null then
    raise exception 'registro_invalido';
  end if;

  if not exists (select 1 from app.categoria where escopo = 'conjunto') then
    insert into app.categoria (lar_id, tipo, escopo, dono_id, nome, variavel)
    select app.lar_atual(), c.tipo, 'conjunto', null, c.nome, c.variavel
    from (values
      ('despesa', 'Mercado', true),
      ('despesa', 'Delivery/iFood do casal', true),
      ('despesa', 'Moradia', false),
      ('despesa', 'Contas da casa', false),
      ('despesa', 'Outros da casa', false)
    ) as c (tipo, nome, variavel)
    on conflict on constraint categoria_unica do nothing;
  end if;

  if not exists (select 1 from app.categoria where escopo = 'individual' and dono_id = v_membro) then
    insert into app.categoria (lar_id, tipo, escopo, dono_id, nome, variavel)
    select app.lar_atual(), c.tipo, 'individual', v_membro, c.nome, c.variavel
    from (values
      ('despesa', 'Almoço/Alimentação fora', true),
      ('despesa', 'Delivery pessoal', true),
      ('despesa', 'Transporte', true),
      ('despesa', 'Lazer pessoal', true),
      ('despesa', 'Outros', false),
      ('receita', 'Salário', null),
      ('receita', 'Extra', null),
      ('receita', 'Outros', null)
    ) as c (tipo, nome, variavel)
    on conflict on constraint categoria_unica do nothing;
  end if;
end;
$$;

revoke execute on function api.inicializar_membro() from public, anon;
grant execute on function api.inicializar_membro() to authenticated;

commit;
