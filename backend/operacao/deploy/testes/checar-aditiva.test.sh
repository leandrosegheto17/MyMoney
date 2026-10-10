#!/usr/bin/env bash
# Teste do checar-aditiva.sh: migrations aditivas, não aditivas sem justificativa e nome de arquivo hostil.
# Uso: bash backend/operacao/deploy/testes/checar-aditiva.test.sh
set -euo pipefail

# shellcheck source-path=SCRIPTDIR source=checar-aditiva.apoio.sh
source "$(dirname "${BASH_SOURCE[0]}")/checar-aditiva.apoio.sh"

# --- Sem migration nova ---
novo_repo; abrir_pr
printf 'x\n' >"$REPO/LEIAME.txt"; commit_pr
espera_passar "sem migration nova passa"
espera_saida_contem "sem migration nova registra a mensagem" "nenhuma migration nova"

# --- Aditivas ---
novo_repo; abrir_pr
migration "$MIG" "create table app.nova (id uuid primary key);
alter table app.antiga add column apelido text not null default '';
create index nova_id on app.nova (id);"
commit_pr
espera_passar "create e add column com default passam"

novo_repo; abrir_pr
migration "$MIG" "alter type app.tipo_forma add value 'boleto';"
commit_pr
espera_passar "alter type ... add value passa"

novo_repo; abrir_pr
migration "$MIG" "-- drop table app.antiga; (fica para depois)
/* rename column x to y
   drop table app.antiga; */
create table app.nova (id uuid primary key);"
commit_pr
espera_passar "drop e rename só em comentário passam"

novo_repo; abrir_pr
migration "$MIG" "create table app.gotas_dropadas (id uuid primary key, renamed_em date);"
commit_pr
espera_passar "palavra que só contém drop/rename passa"

novo_repo; abrir_pr
migration "$MIG" "create table app.nova (id uuid primary key);"
commit_pr
espera_passar "drop em migration que já está na base não conta"

# --- Não aditivas sem justificativa ---
novo_repo; abrir_pr
migration "$MIG" "drop table app.antiga;"
commit_pr
espera_falhar "drop table sem justificativa falha"
espera_saida_contem "mensagem cita a regra" "G-12"
espera_saida_contem "mensagem cita a migration" "$MIG"

novo_repo; abrir_pr
migration "$MIG" "DROP TABLE app.antiga;"
commit_pr
espera_falhar "DROP em maiúsculas falha"

novo_repo; abrir_pr
migration "$MIG" "alter table app.antiga drop column apelido;"
commit_pr
espera_falhar "drop column sem justificativa falha"

novo_repo; abrir_pr
migration "$MIG" "alter table app.antiga rename column apelido to nome_curto;"
commit_pr
espera_falhar "rename column falha"

novo_repo; abrir_pr
migration "$MIG" "alter table app.antiga alter column valor type numeric(14,2);"
commit_pr
espera_falhar "alter column ... type falha"

novo_repo; abrir_pr
migration "$MIG" "alter table app.antiga alter column valor set data type bigint;"
commit_pr
espera_falhar "alter column ... set data type falha"

novo_repo; abrir_pr
migration "$MIG" "alter table app.antiga alter valor type bigint;"
commit_pr
espera_falhar "alter ... type sem a palavra column falha"

novo_repo; abrir_pr
migration "20261001000000_a;touch PWNED.sql" "drop table app.antiga;"
commit_pr
espera_falhar "nome de arquivo com caracteres de shell falha sem executar"
total=$((total + 1))
if [ ! -e "$REPO/PWNED" ] && [ ! -e "$REPO/$PASTA_MIGRATIONS/PWNED" ]; then
  ok "nome de arquivo não é executado"
else
  nok "nome de arquivo não é executado"
fi

resumo
