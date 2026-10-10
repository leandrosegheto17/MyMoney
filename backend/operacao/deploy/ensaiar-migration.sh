#!/usr/bin/env bash
# Ensaio de migration sobre dados: recria o Supabase local com as migrations da base (main), carrega o
# seed de volume e aplica por cima as migrations novas da árvore do PR (G-12, ADR-011 §4.2).
# Qualquer erro do Postgres termina com código diferente de 0 e fica no log.
#
# Uso: backend/operacao/deploy/ensaiar-migration.sh --base <ref> [--workdir-pr <pasta backend>]
#   --base         commit/ref da main (a versão de supabase/ e do carregar.sh vem dele, via git archive)
#   --workdir-pr   pasta "backend" com as migrations do PR (padrão: backend)
#   SUPABASE       comando da CLI (padrão: supabase, ou "pnpm exec supabase")
# Só toca o Supabase local; a árvore de trabalho não é alterada.
# shellcheck source-path=SCRIPTDIR
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../comum/host-local.sh
source "$AQUI/../comum/host-local.sh"

abortar() {
  echo "ERRO: $*" >&2
  exit 1
}

BASE=''
WORKDIR_PR='backend'
while [ $# -gt 0 ]; do
  case "$1" in
    --base)
      [ $# -ge 2 ] || abortar "--base pede um valor"
      BASE="$2"
      shift 2
      ;;
    --workdir-pr)
      [ $# -ge 2 ] || abortar "--workdir-pr pede um valor"
      WORKDIR_PR="$2"
      shift 2
      ;;
    *) abortar "argumento desconhecido: $1" ;;
  esac
done
[ -n "$BASE" ] || abortar "informe --base <ref>"
[ -d "$WORKDIR_PR/supabase/migrations" ] || abortar "sem migrations em $WORKDIR_PR/supabase/migrations"

RAIZ="$(git rev-parse --show-toplevel)"
cd "$RAIZ"

if [ -n "${SUPABASE:-}" ]; then
  read -r -a CLI <<< "$SUPABASE"
elif command -v supabase > /dev/null 2>&1; then
  CLI=(supabase)
else
  CLI=(pnpm exec supabase)
fi

# Trava de host antes de qualquer escrita no banco.
DB_URL="$("${CLI[@]}" status -o env --workdir "$WORKDIR_PR" 2> /dev/null | sed -n 's/^DB_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' | head -n 1 || true)"
[ -n "$DB_URL" ] || abortar "Supabase local parado ou sem DB_URL; rode: pnpm local:subir"
exigir_host_local "$DB_URL" "o ensaio de migration" || exit 1

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Versão da base: supabase/ (migrations, seeds, config) e o trecho comum que o carregar.sh usa.
git archive "$BASE" backend/supabase | tar -x -C "$TMP"
mkdir -p "$TMP/backend/operacao/comum"
cp -- "$AQUI/../comum/host-local.sh" "$TMP/backend/operacao/comum/host-local.sh"

echo "== 1/3 Recriando o banco local com as migrations de $BASE"
"${CLI[@]}" db reset --workdir "$TMP/backend"

echo "== 2/3 Carregando o seed de volume (versão de $BASE)"
bash "$TMP/backend/supabase/volume/carregar.sh"

echo "== 3/3 Aplicando as migrations novas do PR"
"${CLI[@]}" migration up --local --workdir "$WORKDIR_PR"

echo "Ensaio concluído: as migrations novas aplicam sobre os dados de volume."
