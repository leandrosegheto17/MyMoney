-- Volume de 2 anos (RNF-03): ~6.000 parcelas para os 2 membros, só para medir desempenho no
-- Supabase local. Fora de `seeds/` de propósito: o `db reset` e o CI não o carregam. Roda depois
-- de `pnpm local:resetar`, com `pnpm local:volume`.
--
-- Determinístico (aritmética modular sobre o número `n`, sem random()) e idempotente: cada
-- lançamento tem o id `md5('volume-...')::uuid`, então rodar de novo devolve os mesmos registros.
-- Tudo passa por `api.*` como o próprio membro (RLS e regras valem); nenhuma regra de parcela ou
-- de data de cartão é repetida aqui. Termina com erro se a contagem total de parcelas sair de
-- 5.500 a 6.500.
--
-- Ana só tem Pix no seed 03; este arquivo cria para ela um Débito (...0312) e um Crédito
-- (...0313, vence dia 15) por `api.salvar_forma`, na conta dela (...0211).
begin;

do $$
declare
  c_meses constant integer := 24;         -- do mais antigo até o mês de app.hoje()
  c_por_mes constant integer := 56;       -- despesas por membro por mês
  v_hoje date := app.hoje();
  v_inicio date := app.inicio_mes(app.hoje()) - interval '23 months';
  v_membros uuid[] := array[
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000102']::uuid[];
  v_users uuid[] := array[
    '00000000-0000-4000-8000-0000000000a1',
    '00000000-0000-4000-8000-0000000000a2']::uuid[];
  v_contas uuid[] := array[
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000211']::uuid[];
  v_cats uuid[];
  v_avista uuid[];
  v_credito uuid[];
  v_cat_receita uuid;
  v_mes date;
  v_data date;
  v_n bigint;
  v_parcelas integer;
  v_forma uuid;
  v_total bigint;
begin
  for m in 1..2 loop
    perform set_config('request.jwt.claims',
      jsonb_build_object('sub', v_users[m], 'role', 'authenticated')::text, true);
    set local role authenticated;

    if m = 2 then
      perform api.salvar_forma('00000000-0000-4000-8000-000000000312', 'Débito da Ana',
                               'debito', v_contas[2]);
      perform api.salvar_forma('00000000-0000-4000-8000-000000000313', 'Crédito da Ana',
                               'credito', v_contas[2], 15::smallint);
    end if;

    select array_agg(c.id order by c.id) into v_cats
      from app.categoria c
     where c.tipo = 'despesa' and not c.arquivada
       and (c.escopo = 'conjunto' or c.dono_id = v_membros[m]);
    select array_agg(f.id order by f.id) into v_avista
      from app.forma_pagamento f
     where f.dono_id = v_membros[m] and f.tipo in ('pix', 'debito') and not f.arquivada;
    select array_agg(f.id order by f.id) into v_credito
      from app.forma_pagamento f
     where f.dono_id = v_membros[m] and f.tipo = 'credito' and not f.arquivada;
    select c.id into v_cat_receita
      from app.categoria c
     where c.tipo = 'receita' and c.dono_id = v_membros[m] and not c.arquivada
     order by c.id limit 1;

    for i in 0..c_meses - 1 loop
      v_mes := (v_inicio + (i || ' months')::interval)::date;

      -- Receita mensal (RF-15 via api.lancar_receita), dia 5 ou hoje se ainda não chegou.
      perform api.lancar_receita(
        md5('volume-receita-' || m || '-' || i)::uuid,
        450000 + m * 35000 + (i % 6) * 5000, v_cat_receita, v_contas[m],
        least(v_mes + 4, v_hoje), null);

      for j in 1..c_por_mes loop
        v_n := ((m - 1) * c_meses + i) * c_por_mes + j;
        v_data := least(v_mes + ((v_n * 13) % 28)::integer, v_hoje);
        if v_n % 5 = 0 then
          v_forma := v_credito[1 + ((v_n / 5) % cardinality(v_credito))::integer];
          v_parcelas := 2 + ((v_n / 5) % 11)::integer;
        else
          v_forma := v_avista[1 + (v_n % cardinality(v_avista))::integer];
          v_parcelas := 1;
        end if;
        perform api.lancar_despesa(
          md5('volume-' || v_n)::uuid,
          1500 + (v_n * 7919) % 48500,
          v_cats[1 + ((v_n * 7) % cardinality(v_cats))::integer],
          v_forma, v_parcelas, v_data, null);
      end loop;
    end loop;

    reset role;
  end loop;

  select count(*) into v_total from app.parcela;
  if v_total not between 5500 and 6500 then
    raise exception 'volume fora da faixa: % parcelas (esperado de 5500 a 6500)', v_total;
  end if;
  raise notice 'volume carregado: % parcelas', v_total;
end
$$;

commit;

-- Estatísticas das tabelas tocadas: sem isso, logo após a carga (antes do autovacuum) o planner
-- estima 1 linha em app.parcela e escolhe nested loops ruins; a medição fica refém do momento.
analyze app.parcela, app.lancamento, app.categoria, app.lancamento_pagamento;
