#!/usr/bin/env bash
# shellcheck disable=SC2016  # corpos dos comandos falsos expandem só quando executados
# Ajudante de teste dos scripts de operação: comandos falsos num PATH temporário que
# registram cada chamada em $SIM_LOG, cópia do repositório numa pasta temporária e
# asserções simples. Uso: "source" deste arquivo dentro do teste.
#
# Comportamento dos comandos falsos, controlado por variáveis de ambiente:
#   git       SIM_GIT_STATUS (saída de "status --porcelain"), SIM_REPO (raiz), SIM_SHA
#   gh        SIM_GH_RUNS (JSON de "run list"), SIM_GH_JOBS (JSON de "run view")
#   supabase  SIM_DUMP_FALHA=1 faz "db dump" falhar; SIM_REF e SIM_REGIAO para "projects list"
#   pg_dump   cria o arquivo de "-f"; pg_restore --list imprime SIM_PG_RESTORE_LISTA
#   psql      imprime SIM_PSQL_SAIDA

SIM_CASOS=0
SIM_FALHAS=0
SIM_CASO_ATUAL=''

simular_iniciar() {
  SIM_DIR="$(mktemp -d)"
  SIM_BIN="$SIM_DIR/bin"
  SIM_LOG="$SIM_DIR/chamadas.log"
  SIM_REPO="$SIM_DIR/repo"
  SIM_PATH_ORIGINAL="$PATH"
  mkdir -p "$SIM_BIN" "$SIM_REPO"
  : > "$SIM_LOG"
  export SIM_DIR SIM_BIN SIM_LOG SIM_REPO
  export PATH="$SIM_BIN:$PATH"
  simular_padroes
}

simular_encerrar() {
  export PATH="$SIM_PATH_ORIGINAL"
  rm -rf "$SIM_DIR"
}

# simular_comando <nome> [corpo]: o corpo é bash e recebe os argumentos em "$@".
simular_comando() {
  local nome="$1" corpo="${2:-exit 0}"
  cat > "$SIM_BIN/$nome" <<EOF
#!/usr/bin/env bash
echo "$nome \$*" >> "\$SIM_LOG"
$corpo
EOF
  chmod +x "$SIM_BIN/$nome"
}

simular_limpar_log() { : > "$SIM_LOG"; }
simular_chamadas() { cat "$SIM_LOG"; }

# simular_repositorio <raiz real>: copia backend/operacao para $SIM_REPO e grava o ref
# falso em backend/supabase/.temp/project-ref.
simular_repositorio() {
  local raiz="$1"
  rm -rf "$SIM_REPO"
  mkdir -p "$SIM_REPO/backend/supabase/.temp"
  cp -R "$raiz/backend/operacao" "$SIM_REPO/backend/"
  printf '%s\n' "$SIM_REF" > "$SIM_REPO/backend/supabase/.temp/project-ref"
}

simular_padroes() {
  export SIM_GIT_STATUS=''
  export SIM_SHA='0123456789abcdef0123456789abcdef01234567'
  export SIM_REF='refteste'
  export SIM_REGIAO='sa-east-1'
  export SIM_DUMP_FALHA=0
  export SIM_GH_RUNS='[{"databaseId":42,"conclusion":"success","status":"completed"}]'
  export SIM_GH_JOBS='{"jobs":[{"name":"base","conclusion":"success","status":"completed"}]}'
  export SIM_PG_RESTORE_LISTA=$'; Archive created\n1; 2615 2200 SCHEMA - app postgres\n2; 1259 16385 TABLE public exemplo postgres'
  export SIM_PSQL_SAIDA=''

  simular_comando git '
while [ "${1:-}" = "-C" ]; do shift 2; done
case "${1:-}" in
  status) printf "%s" "$SIM_GIT_STATUS" ;;
  rev-parse)
    case " $* " in
      *" --show-toplevel "*) echo "$SIM_REPO" ;;
      *) echo "$SIM_SHA" ;;
    esac ;;
  branch) echo "  origin/main" ;;
  ls-remote) printf "%s\trefs/heads/main\n" "$SIM_SHA" ;;
esac
exit 0'

  simular_comando gh '
json=""
case "${1:-} ${2:-}" in
  "run list") json="$SIM_GH_RUNS" ;;
  "run view") json="$SIM_GH_JOBS" ;;
esac
filtro=""; anterior=""
for a in "$@"; do
  case "$a" in --jq=*|-q=*) filtro="${a#*=}" ;; esac
  if [ "$anterior" = "--jq" ] || [ "$anterior" = "-q" ]; then filtro="$a"; fi
  anterior="$a"
done
if [ -n "$filtro" ] && command -v jq >/dev/null 2>&1; then
  printf "%s" "$json" | jq -r "$filtro"
else
  printf "%s\n" "$json"
fi
exit 0'

  simular_comando supabase '
arquivo_destino() {
  local anterior=""
  for a in "$@"; do
    case "$a" in --file=*) echo "${a#*=}"; return ;; esac
    if [ "$anterior" = "-f" ] || [ "$anterior" = "--file" ]; then echo "$a"; return; fi
    anterior="$a"
  done
}
case " $* " in
  *" db dump "*)
    [ "$SIM_DUMP_FALHA" = "1" ] && { echo "erro no dump" >&2; exit 1; }
    destino="$(arquivo_destino "$@")"
    if [ -n "$destino" ]; then echo "-- dump simulado" > "$destino"; else echo "-- dump simulado"; fi ;;
  *" db push "*)
    case " $* " in *" --dry-run "*) echo "create table exemplo (id int);" ;; esac ;;
  *" projects list "*)
    printf "[{\"id\":\"%s\",\"ref\":\"%s\",\"name\":\"mymoney\",\"region\":\"%s\"}]\n" "$SIM_REF" "$SIM_REF" "$SIM_REGIAO" ;;
esac
exit 0'

  simular_comando pg_dump '
anterior=""
for a in "$@"; do
  case "$a" in --file=*) echo "dump simulado" > "${a#*=}"; exit 0 ;; esac
  if [ "$anterior" = "-f" ] || [ "$anterior" = "--file" ]; then echo "dump simulado" > "$a"; exit 0; fi
  anterior="$a"
done
echo "dump simulado"
exit 0'

  simular_comando pg_restore '
case " $* " in *" --list "*|*" -l "*) [ -n "$SIM_PG_RESTORE_LISTA" ] && printf "%s\n" "$SIM_PG_RESTORE_LISTA" ;; esac
exit 0'

  simular_comando psql '
[ -n "$SIM_PSQL_SAIDA" ] && printf "%s\n" "$SIM_PSQL_SAIDA"
exit 0'

  # Quem chamar a CLI por "pnpm exec" ou "npx" cai no supabase falso acima.
  simular_comando pnpm '
[ "${1:-}" = "exec" ] && { shift; exec "$@"; }
exit 0'
  simular_comando npx '
exec "$@"'
}

# ---------- asserções ----------

caso() {
  SIM_CASO_ATUAL="$1"
  SIM_CASOS=$((SIM_CASOS + 1))
  echo "- $1"
}

falhar() {
  SIM_FALHAS=$((SIM_FALHAS + 1))
  echo "  FALHOU [$SIM_CASO_ATUAL]: $1" >&2
}

afirmar_codigo_nao_zero() {
  [ "$1" -ne 0 ] || falhar "${2:-esperava código diferente de zero}"
}

afirmar_codigo_zero() {
  [ "$1" -eq 0 ] || falhar "${2:-esperava código zero, veio $1}"
}

# afirmar_contem <texto> <regex estendida> [mensagem]
afirmar_contem() {
  grep -qE -- "$2" <<< "$1" || falhar "${3:-esperava encontrar /$2/}"
}

afirmar_nao_contem() {
  if grep -qE -- "$2" <<< "$1"; then falhar "${3:-não esperava encontrar /$2/}"; fi
}

resumo_testes() {
  echo "$SIM_CASOS casos, $SIM_FALHAS falhas"
  [ "$SIM_FALHAS" -eq 0 ]
}
