#!/usr/bin/env bash
# Roda um arquivo SQL desta pasta (padrão: volume-2-anos.sql; `medir.sql` mede o desempenho)
# no banco do Supabase local. Recusa qualquer host que não seja exatamente localhost ou
# 127.0.0.1 (G-06), antes de abrir conexão. A URL vem de `supabase status -o env`.
# Uso: bash backend/supabase/volume/carregar.sh [arquivo.sql]
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$(cd "$AQUI/../.." && pwd)"
ARQUIVO="$AQUI/${1:-volume-2-anos.sql}"

if command -v supabase >/dev/null 2>&1; then
  STATUS="$(supabase status -o env --workdir "$BACKEND" 2>/dev/null || true)"
else
  STATUS="$(pnpm exec supabase status -o env --workdir "$BACKEND" 2>/dev/null || true)"
fi

DB_URL="$(printf '%s\n' "$STATUS" | sed -n 's/^DB_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' | head -n 1)"
if [ -z "$DB_URL" ]; then
  echo "Supabase local parado ou sem DB_URL. Rode: pnpm local:subir" >&2
  exit 1
fi

# shellcheck source=../../operacao/comum/host-local.sh
source "$BACKEND/operacao/comum/host-local.sh"
exigir_host_local "$DB_URL" "o volume" || exit 1

if [ ! -f "$ARQUIVO" ]; then
  echo "Arquivo SQL não encontrado: $ARQUIVO" >&2
  exit 1
fi

if command -v psql >/dev/null 2>&1; then
  psql "$DB_URL" -v ON_ERROR_STOP=1 -X -f "$ARQUIVO"
else
  # Sem psql na máquina: usa o psql do container do banco local.
  PROJETO="$(sed -n 's/^project_id *= *"\(.*\)"/\1/p' "$BACKEND/supabase/config.toml" | head -n 1)"
  docker exec -i "supabase_db_${PROJETO}" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -X < "$ARQUIVO"
fi
