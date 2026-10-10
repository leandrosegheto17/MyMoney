#!/usr/bin/env bash
# Apoio dos testes do checar-aditiva.sh: repositório git temporário com a base (main) e um commit "PR"; sem banco.
# Sourceado pelos arquivos checar-aditiva.*.test.sh; não é executável sozinho.
# shellcheck disable=SC2034  # variáveis lidas pelos arquivos que fazem source daqui
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

# Caso que deve reprovar: $1 = rótulo, $2 = conteúdo da migration.
caso_falha_sql() {
  novo_repo; abrir_pr
  migration "$MIG" "$2"
  commit_pr
  espera_falhar "$1"
}

# Resumo final de cada arquivo de teste; sai com código diferente de 0 se algum caso falhou.
resumo() {
  echo
  echo "$((total - falhas))/$total casos ok"
  [ "$falhas" -eq 0 ]
}
