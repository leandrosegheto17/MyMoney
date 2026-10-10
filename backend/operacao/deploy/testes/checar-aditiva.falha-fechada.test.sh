#!/usr/bin/env bash
# Teste da falha fechada do checar-aditiva.sh: perl que falha, morre por sinal ou não produz saída,
# e migration ilegível ou symlink pendente nunca podem virar aprovação. Sem banco.
# Uso: bash backend/operacao/deploy/testes/checar-aditiva.falha-fechada.test.sh
# CHECAR_ADITIVA=<caminho> troca o script sob teste.
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="${CHECAR_ADITIVA:-$AQUI/../checar-aditiva.sh}"
PASTA="backend/supabase/migrations"

TMP_RAIZ="$(mktemp -d)"
trap 'rm -rf "$TMP_RAIZ"' EXIT

total=0
falhas=0
REPO=""
SAIDA=""
CODIGO=0

g() { git -C "$REPO" "$@"; }

novo_repo() {
  REPO="$(mktemp -d "$TMP_RAIZ/repo.XXXXXX")"
  git init -q -b main "$REPO"
  g config user.email "teste@exemplo.invalid"
  g config user.name "teste"
  g config commit.gpgsign false
  mkdir -p "$REPO/$PASTA" "$REPO/.md"
  printf 'create table app.antiga (id uuid primary key);\n' >"$REPO/$PASTA/20260101000000_inicial.sql"
  printf '# Guardrails\n' >"$REPO/.md/GUARDRAILS.md"
  g add -A
  g commit -q -m "base"
  g checkout -q -b pr main
}

commit_pr() { g add -A; g commit -q -m "pr"; }

# perl falso no PATH: $1 = corpo do script.
perl_falso() {
  FALSO="$(mktemp -d "$TMP_RAIZ/falso.XXXXXX")"
  printf '#!/usr/bin/env bash\n%s\n' "$1" >"$FALSO/perl"
  chmod +x "$FALSO/perl"
}

rodar() {
  set +e
  SAIDA="$(cd "$REPO" && env -u GITHUB_BASE_REF -u GITHUB_EVENT_BEFORE PATH="${1:+$1:}$PATH" bash "$SCRIPT" main 2>&1)"
  CODIGO=$?
  set -e
}

verificar() {
  local nome="$1" esperado_zero="$2"
  total=$((total + 1))
  local bom=1
  if [ "$esperado_zero" = sim ]; then
    [ "$CODIGO" -eq 0 ] || bom=0
  else
    [ "$CODIGO" -ne 0 ] || bom=0
    case "$SAIDA" in *"é aditiva"*) bom=0 ;; esac
  fi
  if [ "$bom" -eq 1 ]; then
    echo "ok - $nome"
  else
    falhas=$((falhas + 1))
    echo "FALHOU - $nome (rc=$CODIGO)"
    printf '    %s\n' "${SAIDA//$'\n'/$'\n    '}"
  fi
}

caso_perl_falso() {
  local rotulo="$1" corpo="$2"
  perl_falso "$corpo"
  novo_repo
  printf 'drop table app.x;\n' >"$REPO/$PASTA/20260201000000_com_drop.sql"
  commit_pr
  rodar "$FALSO"
  verificar "$rotulo: migration com drop reprova" nao
  novo_repo
  printf 'alter table app.antiga add column nome text;\n' >"$REPO/$PASTA/20260201000000_aditiva.sql"
  commit_pr
  rodar "$FALSO"
  verificar "$rotulo: migration aditiva não é aprovada" nao
}

caso_perl_falso "perl sai 1" 'echo "perl: erro simulado" >&2; exit 1'
caso_perl_falso "perl morre por SIGKILL" 'kill -KILL $$'
caso_perl_falso "perl sai 0 sem produzir saída" 'exit 0'

novo_repo
printf 'drop table app.x;\n' >"$REPO/$PASTA/20260201000000_alvo.sql"
ln -s "$REPO/$PASTA/nao-existe.sql" "$REPO/$PASTA/20260202000000_pendente.sql"
commit_pr
rodar ""
verificar "symlink pendente reprova" nao

novo_repo
ln -s "$REPO/$PASTA/nao-existe.sql" "$REPO/$PASTA/20260202000000_pendente.sql"
commit_pr
rodar ""
verificar "só symlink pendente reprova" nao

if [ "$(id -u)" -ne 0 ]; then
  novo_repo
  printf 'create table app.y (id int);\n' >"$REPO/$PASTA/20260203000000_ilegivel.sql"
  commit_pr
  chmod 000 "$REPO/$PASTA/20260203000000_ilegivel.sql"
  rodar ""
  chmod 644 "$REPO/$PASTA/20260203000000_ilegivel.sql"
  verificar "arquivo ilegível (chmod 000) reprova" nao
fi

novo_repo
: >"$REPO/$PASTA/20260204000000_vazia.sql"
commit_pr
rodar ""
verificar "migration vazia legítima continua aprovada" sim

novo_repo
printf 'create table app.z (id int);\n' >"$REPO/$PASTA/20260205000000_ok.sql"
commit_pr
rodar ""
verificar "migration aditiva com perl real continua aprovada" sim

echo "$((total - falhas))/$total casos passaram"
[ "$falhas" -eq 0 ]
