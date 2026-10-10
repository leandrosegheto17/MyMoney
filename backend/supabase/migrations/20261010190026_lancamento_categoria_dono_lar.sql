-- A categoria do lançamento precisa ser do mesmo lar e, quando individual, do mesmo dono.
-- O FK composto (categoria_id, tipo, escopo) já garante tipo e escopo; este amarra o resto,
-- para que o uuid de uma categoria individual alheia (ou de outro lar) não seja aceito.

-- Alvo do FK de lar.
alter table app.categoria
  add constraint categoria_id_lar unique (id, lar_id);

-- Dono da categoria esperado: o do lançamento se individual; nulo se conjunto, e o FK
-- (match simple) não é checado, pois a categoria conjunta não tem dono.
alter table app.lancamento
  add column categoria_dono_id uuid
    generated always as (case when escopo = 'individual' then dono_id end) stored;

alter table app.lancamento
  add constraint lancamento_categoria_dono_fk foreign key (categoria_id, categoria_dono_id)
    references app.categoria (id, dono_id),
  add constraint lancamento_categoria_lar_fk foreign key (categoria_id, lar_id)
    references app.categoria (id, lar_id);
