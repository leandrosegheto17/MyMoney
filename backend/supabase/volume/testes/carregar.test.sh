#!/usr/bin/env bash
# Trava de host do carregar.sh: só aceita banco em localhost/127.0.0.1.
# Comandos externos (supabase, pnpm, psql, docker) são simulados num PATH temporário.
set -u

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$AQUI/../carregar.sh"
falhas=0

preparar() {
  TMP="$(mktemp -d)"
  LOG="$TMP/chamadas.log"
  : > "$LOG"
  mkdir -p "$TMP/bin"
  cat > "$TMP/bin/supabase" <<EOF
#!/usr/bin/env bash
echo "supabase \$*" >> "$LOG"
if [ "\${1:-}" = "status" ]; then
  [ -n "\${FALSO_DB_URL:-}" ] || exit 1
  echo "DB_URL=\"\$FALSO_DB_URL\""
  echo "API_URL=\"http://127.0.0.1:54321\""
fi
exit 0
EOF
  cat > "$TMP/bin/pnpm" <<EOF
#!/usr/bin/env bash
echo "pnpm \$*" >> "$LOG"
while [ \$# -gt 0 ] && [ "\$1" != "supabase" ]; do shift; done
[ \$# -gt 0 ] && { shift; exec "$TMP/bin/supabase" "\$@"; }
exit 0
EOF
  for cmd in psql docker; do
    cat > "$TMP/bin/$cmd" <<EOF
#!/usr/bin/env bash
echo "$cmd \$*" >> "$LOG"
exit 0
EOF
  done
  chmod +x "$TMP/bin/"*
}

rodar() {
  FALSO_DB_URL="$1" PATH="$TMP/bin:$PATH" bash "$SCRIPT" </dev/null >"$TMP/saida" 2>&1
}

conectou() {
  grep -Eq '^(psql|docker) ' "$LOG"
}

verificar() {
  local descricao="$1" ok="$2"
  if [ "$ok" = "1" ]; then
    echo "ok - $descricao"
  else
    echo "FALHOU - $descricao"
    sed 's/^/    /' "$TMP/saida" "$LOG"
    falhas=$((falhas + 1))
  fi
  rm -rf "$TMP"
}

recusa() {
  local descricao="$1" url="$2"
  preparar
  rodar "$url"
  local codigo=$?
  if [ "$codigo" -ne 0 ] && ! conectou; then verificar "$descricao" 1; else verificar "$descricao" 0; fi
}

aceita() {
  local descricao="$1" url="$2"
  preparar
  rodar "$url"
  local codigo=$?
  if [ "$codigo" -eq 0 ] && conectou; then verificar "$descricao" 1; else verificar "$descricao" 0; fi
}

recusa "URL do Supabase na nuvem é recusada antes de conectar" \
  "postgresql://postgres:segredo@db.abcdefghijkl.supabase.co:5432/postgres"
recusa "host que só começa com localhost é recusado" \
  "postgresql://postgres:postgres@localhost.exemplo.com:54322/postgres"
recusa "host que só começa com 127.0.0.1 é recusado" \
  "postgresql://postgres:postgres@127.0.0.1.exemplo.com:54322/postgres"
recusa "IP de outra máquina é recusado" \
  "postgresql://postgres:postgres@10.0.0.5:54322/postgres"
recusa "sem URL do supabase status, não conecta" ""

aceita "127.0.0.1 é aceito e o volume é carregado" \
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
aceita "localhost é aceito e o volume é carregado" \
  "postgresql://postgres:postgres@localhost:54322/postgres"

if [ "$falhas" -gt 0 ]; then
  echo "$falhas caso(s) falharam"
  exit 1
fi
echo "todos os casos passaram"
