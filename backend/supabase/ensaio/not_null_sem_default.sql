-- Fixture do ensaio de migration: coluna not null sem default numa tabela com dados. O ensaio precisa falhar.
begin;
alter table app.lancamento add column ensaio_obrigatoria text not null;
commit;
