-- Fixture do ensaio de migration: coluna nova com default, aditiva. O ensaio precisa passar.
begin;
alter table app.lancamento add column ensaio_opcional text not null default '';
commit;
