#!/usr/bin/env bash
# Teste do checar-aditiva.sh: repositório git temporário com a base (main) e um commit "PR"; sem banco.
# Uso: bash backend/operacao/deploy/testes/checar-aditiva.test.sh
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$AQUI/../checar-aditiva.sh"
PASTA_MIGRATIONS="backend/supabase/migrations"

TMP_RAIZ="$(mktemp -d)"
trap 'rm -rf "$TMP_RAIZ"' EXIT

total=0
falhas=0
REPO=""
SAIDA=""
CODIGO=0

dias_atras() { date -u -d "-$1 days" +%Y-%m-%dT12:00:00Z; }
data_relativa() { date -u -d "$1 days" +%Y-%m-%d; }

g() { git -C "$REPO" "$@"; }

guardrails_base() {
  cat <<'EOF'
# Guardrails

## Log de Alterações

| Data | Proposto por | Aprovado por | Mudança | Motivo | Validade |
|---|---|---|---|---|---|
| 2026-10-09 | coordenador | gestor | Versão inicial | Primeira versão | permanente |
EOF
}

# Repositório novo: commit inicial na main com uma migration (que tem drop, mas já está na base) e o GUARDRAILS.
novo_repo() {
  REPO="$(mktemp -d "$TMP_RAIZ/repo.XXXXXX")"
  git init -q -b main "$REPO"
  g config user.email "teste@exemplo.invalid"
  g config user.name "teste"
  g config commit.gpgsign false
  mkdir -p "$REPO/$PASTA_MIGRATIONS" "$REPO/.md"
  printf 'create table app.antiga (id uuid primary key);\ndrop table if exists app.rascunho;\n' \
    >"$REPO/$PASTA_MIGRATIONS/20260101000000_inicial.sql"
  guardrails_base >"$REPO/.md/GUARDRAILS.md"
  g add -A
  GIT_AUTHOR_DATE="$(dias_atras 90)" GIT_COMMITTER_DATE="$(dias_atras 90)" g commit -q -m "base"
}

# Commit na main com data de N dias atrás (fase expand já publicada).
commit_na_base_ha() {
  local dias="$1" arquivo="$2" conteudo="$3"
  g checkout -q main
  printf '%s\n' "$conteudo" >"$REPO/$arquivo"
  g add -- "$arquivo"
  GIT_AUTHOR_DATE="$(dias_atras "$dias")" GIT_COMMITTER_DATE="$(dias_atras "$dias")" \
    g commit -q -m "expand"
}

acrescentar_log_na_base() {
  g checkout -q main
  printf '%s\n' "$1" >>"$REPO/.md/GUARDRAILS.md"
  g add -- .md/GUARDRAILS.md
  g commit -q -m "log"
}

abrir_pr() { g checkout -q -b pr main; }

migration() { printf '%s\n' "$2" >"$REPO/$PASTA_MIGRATIONS/$1"; }

justificar() {
  local nome="$1" texto="$2"
  printf '%s\n' "$texto" >"$REPO/$PASTA_MIGRATIONS/${nome%.sql}.justificativa.md"
}

commit_pr() {
  g add -A
  g commit -q -m "pr"
}

rodar() {
  set +e
  SAIDA="$(cd "$REPO" && env -u GITHUB_BASE_REF -u GITHUB_EVENT_BEFORE bash "$SCRIPT" main 2>&1)"
  CODIGO=$?
  set -e
}

ok() { echo "ok - $1"; }
nok() {
  echo "FALHOU - $1"
  echo "  código: $CODIGO"
  printf '%s\n' "$SAIDA" | sed 's/^/  | /'
  falhas=$((falhas + 1))
}

espera_passar() {
  total=$((total + 1))
  rodar
  if [ "$CODIGO" -eq 0 ]; then ok "$1"; else nok "$1 (esperava código 0)"; fi
}

espera_falhar() {
  total=$((total + 1))
  rodar
  if [ "$CODIGO" -ne 0 ]; then ok "$1"; else nok "$1 (esperava código diferente de 0)"; fi
}

espera_saida_contem() {
  total=$((total + 1))
  if printf '%s' "$SAIDA" | grep -qiF -- "$2"; then ok "$1"; else nok "$1 (saída sem \"$2\")"; fi
}

MIG="20261001000000_mudanca.sql"
EXPAND="20260801000000_expand_apelido.sql"

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

# --- Justificativa (a): fase expand ---
novo_repo
commit_na_base_ha 31 "$PASTA_MIGRATIONS/$EXPAND" "alter table app.antiga add column apelido_novo text;"
abrir_pr
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Contract do apelido.
Fase expand: $EXPAND"
commit_pr
espera_passar "justificativa com expand de 31 dias passa"

novo_repo
commit_na_base_ha 10 "$PASTA_MIGRATIONS/$EXPAND" "alter table app.antiga add column apelido_novo text;"
abrir_pr
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Fase expand: $EXPAND"
commit_pr
espera_falhar "justificativa com expand de 10 dias falha"
espera_saida_contem "mensagem do expand recente cita a regra" "G-12"

novo_repo; abrir_pr
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Fase expand: 20260801000000_nao_existe.sql"
commit_pr
espera_falhar "justificativa com expand inexistente na base falha"

novo_repo; abrir_pr
migration "$EXPAND" "alter table app.antiga add column apelido_novo text;"
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Fase expand: $EXPAND"
commit_pr
espera_falhar "justificativa com expand acrescentado no próprio PR falha"

# --- Justificativa (b): exceção no Log da base ---
LINHA_EXCECAO="| 2026-09-15 | coordenador | gestor | Exceção à G-12 para \`$MIG\`: remove coluna sem uso | Coluna nunca lida | permanente |"

novo_repo
acrescentar_log_na_base "$LINHA_EXCECAO"
abrir_pr
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Exceção: 2026-09-15"
commit_pr
espera_passar "exceção no Log da base citando G-12 e o arquivo passa"

novo_repo
acrescentar_log_na_base "| 2026-09-15 | coordenador | gestor | Exceção à G-12 para \`$MIG\` | Motivo | $(data_relativa +30) |"
abrir_pr
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Exceção: 2026-09-15"
commit_pr
espera_passar "exceção com validade ainda não vencida passa"

novo_repo; abrir_pr
printf '%s\n' "$LINHA_EXCECAO" >>"$REPO/.md/GUARDRAILS.md"
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Exceção: 2026-09-15"
commit_pr
espera_falhar "linha de exceção só no PR falha"

novo_repo
acrescentar_log_na_base "| 2026-09-15 | coordenador | gestor | Exceção à G-12 para \`$MIG\` | Motivo | $(data_relativa -5) |"
abrir_pr
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Exceção: 2026-09-15"
commit_pr
espera_falhar "exceção com validade vencida falha"

novo_repo
acrescentar_log_na_base "| 2026-09-15 | coordenador | gestor | Exceção à G-12 para \`20260915000000_outra.sql\` | Motivo | permanente |"
abrir_pr
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Exceção: 2026-09-15"
commit_pr
espera_falhar "exceção que cita outra migration falha"

novo_repo
acrescentar_log_na_base "| 2026-09-15 | coordenador | gestor | Exceção à G-13 para \`$MIG\` | Motivo | permanente |"
abrir_pr
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "Exceção: 2026-09-15"
commit_pr
espera_falhar "exceção que não cita G-12 falha"

# --- Justificativa sem (a) nem (b) ---
novo_repo; abrir_pr
migration "$MIG" "alter table app.antiga drop column apelido;"
justificar "$MIG" "A coluna não é usada por ninguém, pode remover."
commit_pr
espera_falhar "justificativa livre, sem (a) nem (b), falha"
espera_saida_contem "mensagem da justificativa livre cita a regra" "G-12"

# --- Comentário e literal na mesma linha: '--' e '/*' dentro de literal não escondem drop ---
caso_falha_sql() {
  novo_repo; abrir_pr
  migration "$MIG" "$2"
  commit_pr
  espera_falhar "$1"
}

caso_falha_sql "'--' em literal simples não esconde drop" \
  "insert into app.antiga values ('--'); drop table app.antiga;"
caso_falha_sql "'--' em dollar-quoting \$\$ não esconde drop" \
  "select \$\$--\$\$; drop table app.antiga;"
caso_falha_sql "'--' em dollar-quoting com tag não esconde drop" \
  "select \$corpo\$--\$corpo\$; drop table app.antiga;"
caso_falha_sql "'--' em identificador entre aspas duplas não esconde drop" \
  "select 1 as \"a--b\"; drop table app.antiga;"
caso_falha_sql "'--' em comentário de bloco não esconde drop depois dele" \
  "/* -- */ drop table app.antiga;"
caso_falha_sql "drop depois de literal com aspas escapadas ('') falha" \
  "select 'it''s --'; drop table app.antiga;"
caso_falha_sql "drop depois de literal E'' com barra invertida falha" \
  "select E'it\\'s --'; drop table app.antiga;"
caso_falha_sql "'/*' em literal não esconde drop até um */ posterior" \
  "select '/*'; drop table app.antiga; /* fim */"
caso_falha_sql "rename depois de literal com '--' falha" \
  "select '--'; alter table app.antiga rename column apelido to nome_curto;"
caso_falha_sql "drop dentro de literal ainda é acusado (execute dinâmico)" \
  "do \$\$ begin execute 'drop table app.antiga'; end \$\$;"

novo_repo; abrir_pr
migration "$MIG" "create table app.nova (id uuid primary key); -- drop table app.antiga;
select 'texto', 1; -- rename column x to y"
commit_pr
espera_passar "comentário '--' real no fim da linha depois de literal não acusa"

novo_repo; abrir_pr
migration "$MIG" "select '--'; /* drop table app.antiga; */ create table app.nova (id uuid primary key);"
commit_pr
espera_passar "drop em comentário de bloco depois de literal com '--' não acusa"

novo_repo
commit_na_base_ha 31 "$PASTA_MIGRATIONS/$EXPAND" "alter table app.antiga add column apelido_novo text;"
abrir_pr
migration "$MIG" "insert into app.antiga values ('--'); drop table app.antiga;"
justificar "$MIG" "Fase expand: $EXPAND"
commit_pr
espera_passar "justificativa libera drop depois de literal com '--'"

echo
echo "$((total - falhas))/$total casos ok"
[ "$falhas" -eq 0 ]
