-- Corrige bug real (não achado de segurança): validate_category_hierarchy()
-- exigia user_id do filho IDÊNTICO ao do pai, inclusive quando o pai é uma
-- categoria de sistema (user_id IS NULL, as 12 categorias padrão seedadas no
-- primeiro acesso). Como toda conta nova só tem essas 12 categorias como raiz,
-- CRIAR QUALQUER SUBCATEGORIA FALHAVA 100% DAS VEZES (reproduzido ao vivo:
-- INSERT autenticado com parent_category_id apontando pra "Moradia" rejeitado
-- com "parent category must belong to the same user"). Contradiz RF-MVP-03
-- AC1 ("taxonomia padrão... 100% editável", PRD-TECNICO.md).
--
-- Regra corrigida: pai pode ser (a) do mesmo usuário, ou (b) categoria de
-- sistema (user_id IS NULL) — nunca de OUTRO usuário real, defesa em
-- profundidade preservada (RLS já impede isso via SELECT, mas o trigger
-- também nunca deveria permitir).
CREATE OR REPLACE FUNCTION "public"."validate_category_hierarchy"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_parent_user_id   uuid;
  v_parent_parent_id uuid;
  v_has_children     boolean;
begin
  if new.parent_category_id is not null then
    if new.parent_category_id = new.id then
      raise exception 'a category cannot be its own parent';
    end if;

    select user_id, parent_category_id
    into v_parent_user_id, v_parent_parent_id
    from public.categories
    where id = new.parent_category_id;

    if not found then
      raise exception 'parent_category_id % does not reference an existing category', new.parent_category_id;
    end if;

    if v_parent_user_id is not null and v_parent_user_id is distinct from new.user_id then
      raise exception 'parent category must belong to the same user (or be a system category)';
    end if;

    if v_parent_parent_id is not null then
      raise exception 'category hierarchy is limited to 1 level: parent category % already has its own parent', new.parent_category_id;
    end if;

    select exists (
      select 1
      from public.categories
      where parent_category_id = new.id
    )
    into v_has_children;

    if v_has_children then
      raise exception 'category % already has child categories and cannot itself receive a parent', new.id;
    end if;
  end if;

  return new;
end;
$$;

COMMENT ON FUNCTION "public"."validate_category_hierarchy"() IS 'Valida hierarquia de categorias (SDD.md §2.5): pai deve ser do mesmo usuário OU categoria de sistema (user_id IS NULL) — nunca de outro usuário real; profundidade máxima de 1 nível nos dois sentidos; proíbe auto-referência. Corrigido em 20260904110000: a regra anterior ("mesmo user_id, sempre") bloqueava 100% das tentativas de subcategoria sob as 12 categorias padrão seedadas (user_id NULL), contradizendo RF-MVP-03 AC1.';
