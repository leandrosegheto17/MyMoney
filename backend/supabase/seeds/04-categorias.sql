-- Categorias fictícias do mockup: 5 conjuntas e, para cada membro, as individuais
-- (5 de despesa e 3 de receita). Leandro usa ...0411-...0423; Ana, ...0431-...0443.
-- Só insere para membros que já existem (o lar e os membros vêm do seed de acesso).
insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel)
select c.id::uuid, m.lar_id, c.tipo, 'conjunto', null, c.nome, c.variavel
from (values
  ('00000000-0000-4000-8000-000000000401', 'despesa', 'Mercado', true),
  ('00000000-0000-4000-8000-000000000402', 'despesa', 'Delivery/iFood do casal', true),
  ('00000000-0000-4000-8000-000000000403', 'despesa', 'Moradia', false),
  ('00000000-0000-4000-8000-000000000404', 'despesa', 'Contas da casa', false),
  ('00000000-0000-4000-8000-000000000405', 'despesa', 'Outros da casa', false)
) as c (id, tipo, nome, variavel)
cross join (select lar_id from app.membro order by posicao limit 1) m
on conflict do nothing;

insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel)
select c.id::uuid, m.lar_id, c.tipo, 'individual', m.id, c.nome, c.variavel
from (values
  ('00000000-0000-4000-8000-000000000411', 'despesa', 'Almoço/Alimentação fora', true),
  ('00000000-0000-4000-8000-000000000412', 'despesa', 'Delivery pessoal', true),
  ('00000000-0000-4000-8000-000000000413', 'despesa', 'Transporte', true),
  ('00000000-0000-4000-8000-000000000414', 'despesa', 'Lazer pessoal', true),
  ('00000000-0000-4000-8000-000000000415', 'despesa', 'Outros', false),
  ('00000000-0000-4000-8000-000000000421', 'receita', 'Salário', null),
  ('00000000-0000-4000-8000-000000000422', 'receita', 'Extra', null),
  ('00000000-0000-4000-8000-000000000423', 'receita', 'Outros', null)
) as c (id, tipo, nome, variavel)
join app.membro m on m.id = '00000000-0000-4000-8000-000000000101'
on conflict do nothing;

insert into app.categoria (id, lar_id, tipo, escopo, dono_id, nome, variavel)
select c.id::uuid, m.lar_id, c.tipo, 'individual', m.id, c.nome, c.variavel
from (values
  ('00000000-0000-4000-8000-000000000431', 'despesa', 'Almoço/Alimentação fora', true),
  ('00000000-0000-4000-8000-000000000432', 'despesa', 'Delivery pessoal', true),
  ('00000000-0000-4000-8000-000000000433', 'despesa', 'Transporte', true),
  ('00000000-0000-4000-8000-000000000434', 'despesa', 'Lazer pessoal', true),
  ('00000000-0000-4000-8000-000000000435', 'despesa', 'Outros', false),
  ('00000000-0000-4000-8000-000000000441', 'receita', 'Salário', null),
  ('00000000-0000-4000-8000-000000000442', 'receita', 'Extra', null),
  ('00000000-0000-4000-8000-000000000443', 'receita', 'Outros', null)
) as c (id, tipo, nome, variavel)
join app.membro m on m.id = '00000000-0000-4000-8000-000000000102'
on conflict do nothing;
