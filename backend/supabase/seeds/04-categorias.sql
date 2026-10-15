-- Categorias fictícias do mockup: a lista das 13 iniciais (6 conjuntas e, por membro, 4 de
-- despesa e 3 de receita) mora só em api.inicializar_membro(); aqui cada membro a chama como
-- na primeira entrada e depois os ids ganham os valores fixos do mockup, pela ordem de criação
-- da função (conjuntas ...0401-...0406; Leandro ...0412-...0415 e ...0421-...0423;
-- Ana ...0432-...0435 e ...0441-...0443; o ...0411 e o ...0431 ficam vagos desde que Almoço virou conjunta). Roda antes dos seeds que referenciam esses ids, então nada aponta para eles ainda.
-- Só ambiente local; depende do seed de acesso.
begin;

-- Usuários do Auth de Leandro (...00a1) e Ana (...00a2), definidos no seed de acesso.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;
select api.inicializar_membro();
reset role;

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
set local role authenticated;
select api.inicializar_membro();
reset role;

with ordem as (
  select c.id, c.escopo, c.dono_id,
    row_number() over (partition by c.escopo, c.dono_id order by c.ctid) as n
  from app.categoria c
),
alvo as (
  select o.id,
    case
      when o.escopo = 'conjunto' then 400 + o.n
      else (case o.dono_id
              when '00000000-0000-4000-8000-000000000101' then 410
              else 430 end)
           + (case when o.n <= 4 then 1 + o.n else 10 + (o.n - 4) end)
    end as numero
  from ordem o
)
update app.categoria c
set id = ('00000000-0000-4000-8000-' || lpad(a.numero::text, 12, '0'))::uuid
from alvo a
where c.id = a.id;

commit;
