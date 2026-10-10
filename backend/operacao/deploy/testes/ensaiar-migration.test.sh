#!/usr/bin/env bash
# Teste do ensaiar-migration.sh contra o Supabase local [BD]. Pré-requisito: `pnpm local:subir`.
# Ao terminar, volta o banco local ao estado do HEAD (`supabase db reset`).
# Uso: bash backend/operacao/deploy/testes/ensaiar-migration.test.sh
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RAIZ="$(git -C "$AQUI" rev-parse --show-toplevel)"
SCRIPT="$RAIZ/backend/operacao/deploy/ensaiar-migration.sh"
ENSAIO="$RAIZ/backend/supabase/ensaio"
SUPABASE="${SUPABASE:-supabase}"
NOME_FUTURO="29991231000000_ensaio.sql"

TMP_RAIZ="$(mktemp -d)"

restaurar() {
  "$SUPABASE" db reset --workdir "$RAIZ/backend" >/dev/null 2>&1 || echo "aviso: rode 'pnpm local:resetar' para voltar o banco local ao HEAD" >&2
  rm -rf "$TMP_RAIZ"
}
trap restaurar EXIT

if ! "$SUPABASE" status --workdir "$RAIZ/backend" >/dev/null 2>&1; then
  echo "Supabase local parado: rode 'pnpm local:subir' antes deste teste." >&2
  exit 1
fi

ARVORE_ANTES="$(git -C "$RAIZ" status --porcelain -- backend/supabase)"
total=0
falhas=0
SAIDA=""
CODIGO=0

ok() { echo "ok - $1"; }
nok() {
  echo "FALHOU - $1"
  echo "  código: $CODIGO"
  printf '%s\n' "$SAIDA" | tail -n 40 | sed 's/^/  | /'
  falhas=$((falhas + 1))
}

# Pasta do "PR": backend/supabase do HEAD + a fixture como migration nova com timestamp no futuro.
preparar_pr() {
  local fixture="$1" destino
  destino="$(mktemp -d "$TMP_RAIZ/pr.XXXXXX")"
  git -C "$RAIZ" archive HEAD backend/supabase | tar -x -C "$destino"
  cp -- "$ENSAIO/$fixture" "$destino/backend/supabase/migrations/$NOME_FUTURO"
  printf '%s' "$destino/backend"
}

rodar() {
  set +e
  SAIDA="$(cd "$RAIZ" && bash "$SCRIPT" --base HEAD --workdir-pr "$1" 2>&1)"
  CODIGO=$?
  set -e
}

consultar() {
  local url
  if command -v psql >/dev/null 2>&1; then
    url="$("$SUPABASE" status -o env --workdir "$RAIZ/backend" | sed -n 's/^DB_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p')"
    psql "$url" -At -c "$1"
  else
    docker exec "$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -n 1)" \
      psql -U postgres -At -c "$1"
  fi
}

# --- not null sem default sobre o seed de volume: falha ---
total=$((total + 1))
rodar "$(preparar_pr not_null_sem_default.sql)"
if [ "$CODIGO" -ne 0 ]; then ok "not null sem default termina com código diferente de 0"; else nok "not null sem default termina com código diferente de 0"; fi

total=$((total + 1))
if printf '%s' "$SAIDA" | grep -qi "violates not-null"; then
  ok "log traz o erro do Postgres (violates not-null)"
else
  nok "log traz o erro do Postgres (violates not-null)"
fi

total=$((total + 1))
parcelas="$(consultar "select count(*) from app.parcela;")"
if [ "${parcelas:-0}" -ge 5500 ] 2>/dev/null; then
  ok "a falha veio depois do seed de volume ($parcelas parcelas)"
else
  CODIGO="-"; SAIDA="parcelas no banco: ${parcelas:-?}"
  nok "a falha veio depois do seed de volume"
fi

total=$((total + 1))
coluna="$(consultar "select count(*) from information_schema.columns where table_schema = 'app' and table_name = 'lancamento' and column_name = 'ensaio_obrigatoria';")"
if [ "$coluna" = "0" ]; then
  ok "a migration que falhou não deixou a coluna"
else
  CODIGO="-"; SAIDA="coluna ensaio_obrigatoria encontrada: $coluna"
  nok "a migration que falhou não deixou a coluna"
fi

# --- coluna com default: passa ---
total=$((total + 1))
rodar "$(preparar_pr coluna_com_default.sql)"
if [ "$CODIGO" -eq 0 ]; then ok "coluna com default termina com código 0"; else nok "coluna com default termina com código 0"; fi

total=$((total + 1))
coluna="$(consultar "select count(*) from information_schema.columns where table_schema = 'app' and table_name = 'lancamento' and column_name = 'ensaio_opcional';")"
if [ "$coluna" = "1" ]; then
  ok "a migration nova foi aplicada"
else
  CODIGO="-"; SAIDA="coluna ensaio_opcional encontrada: $coluna"
  nok "a migration nova foi aplicada"
fi

# --- árvore de trabalho intocada ---
total=$((total + 1))
if [ "$(git -C "$RAIZ" status --porcelain -- backend/supabase)" = "$ARVORE_ANTES" ]; then
  ok "o ensaio não mexe na árvore de trabalho de backend/supabase"
else
  CODIGO="-"; SAIDA="$(git -C "$RAIZ" status --porcelain -- backend/supabase)"
  nok "o ensaio não mexe na árvore de trabalho de backend/supabase"
fi

echo
echo "$((total - falhas))/$total casos ok"
[ "$falhas" -eq 0 ]
