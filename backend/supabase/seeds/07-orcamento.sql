-- Orçamentos fictícios de outubro/2026 (mockup) e um de setembro/2026 (...0715, categoria ...0415, que também tem outubro).
-- Outubro: conjunto ...0401-...0405 (a ...0406, Almoço, fica sem orçamento); individual de Leandro ...0412-...0415; uma de Ana (...0421,
-- categoria ...0434) para o teste de isolamento.
-- Novembro fica vazio de propósito. Depende dos seeds de acesso e de categorias.
insert into app.orcamento (id, lar_id, mes, categoria_id, escopo, dono_id, valor_centavos)
select o.id::uuid, c.lar_id, date '2026-10-01', o.categoria_id::uuid, c.escopo, c.dono_id, o.valor_centavos
from (values
  ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000401', 100000),
  ('00000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-000000000402', 40000),
  ('00000000-0000-4000-8000-000000000703', '00000000-0000-4000-8000-000000000403', 240000),
  ('00000000-0000-4000-8000-000000000704', '00000000-0000-4000-8000-000000000404', 30000),
  ('00000000-0000-4000-8000-000000000705', '00000000-0000-4000-8000-000000000405', 20000),
  ('00000000-0000-4000-8000-000000000711', '00000000-0000-4000-8000-000000000415', 40000),
  ('00000000-0000-4000-8000-000000000712', '00000000-0000-4000-8000-000000000412', 12000),
  ('00000000-0000-4000-8000-000000000713', '00000000-0000-4000-8000-000000000413', 30000),
  ('00000000-0000-4000-8000-000000000714', '00000000-0000-4000-8000-000000000414', 38000),
  ('00000000-0000-4000-8000-000000000721', '00000000-0000-4000-8000-000000000434', 25000)
) as o (id, categoria_id, valor_centavos)
join app.categoria c on c.id = o.categoria_id::uuid
on conflict do nothing;

-- Orçamento de setembro/2026 da individual "Outros" (...0415), fora dos meses do mockup: dá vínculo
-- à categoria (pode_excluir = false, como em respostas/categorias.json) sem mexer em outubro.
insert into app.orcamento (id, lar_id, mes, categoria_id, escopo, dono_id, valor_centavos)
select '00000000-0000-4000-8000-000000000715', c.lar_id, date '2026-09-01', c.id, c.escopo, c.dono_id, 10000
from app.categoria c
where c.id = '00000000-0000-4000-8000-000000000415'
on conflict do nothing;
