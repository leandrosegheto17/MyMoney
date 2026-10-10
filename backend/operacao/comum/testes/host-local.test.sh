#!/usr/bin/env bash
# Testes da trava de host (comum/host-local.sh): só localhost, 127.0.0.1 e ::1 passam,
# inclusive contra URLs que tentam esconder o host real na senha, na query ou no formato.
# Uso: bash backend/operacao/comum/testes/host-local.test.sh
# shellcheck source-path=SCRIPTDIR
set -u

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=simular.sh
source "$AQUI/simular.sh"
# shellcheck source=../host-local.sh
source "$AQUI/../host-local.sh"

SENHA='SenhaSecreta123'

# aceita <descrição> <url> [host esperado]
aceita() {
  local saida codigo
  caso "$1"
  saida="$(exigir_host_local "$2" "o teste" 2>&1)"; codigo=$?
  afirmar_codigo_zero "$codigo" "esperava aceitar: $2"
  if [ -n "${3:-}" ]; then
    saida="$(host_da_url "$2")"
    [ "$saida" = "$3" ] || falhar "host extraído '$saida', esperava '$3'"
  fi
}

# recusa <descrição> <url>: precisa falhar e nunca imprimir a senha
recusa() {
  local saida codigo
  caso "$1"
  saida="$(exigir_host_local "$2" "o teste" 2>&1)"; codigo=$?
  afirmar_codigo_nao_zero "$codigo" "esperava recusar: $2"
  afirmar_contem "$saida" 'Recusado' "esperava mensagem de recusa"
  afirmar_nao_contem "$saida" "$SENHA" "a senha apareceu na saída"
}

aceita "supabase local 127.0.0.1" "postgresql://postgres:postgres@127.0.0.1:54322/postgres" 127.0.0.1
aceita "localhost com porta" "postgresql://postgres:postgres@localhost:54322/postgres" localhost
aceita "esquema postgres://" "postgres://u:p@localhost/db" localhost
aceita "sem userinfo nem porta" "postgresql://localhost/db" localhost
aceita "sem caminho" "postgresql://localhost" localhost
aceita "IPv6 ::1 entre colchetes" "postgresql://u:p@[::1]:5432/db" '::1'
aceita "IPv6 ::1 sem porta" "postgresql://[::1]/db" '::1'
aceita "query inofensiva" "postgresql://u:p@localhost:54322/db?sslmode=disable&connect_timeout=5" localhost
aceita "'@' na senha, host local depois do último '@'" "postgresql://u:${SENHA}@@localhost/db" localhost
aceita "userinfo com vários ':'" "postgresql://u:a:b:c@127.0.0.1:5432/db" 127.0.0.1

recusa "URL vazia" ""
recusa "nuvem" "postgresql://postgres:${SENHA}@db.abc.supabase.co:5432/postgres"
recusa "'@localhost' na query" "postgresql://x:y@evil.com?a=@localhost"
recusa "'@localhost' na query sem userinfo" "postgresql://evil.com?a=@localhost"
recusa "'@127.0.0.1' na query com caminho" "postgresql://x:${SENHA}@evil.com/db?a=@127.0.0.1"
recusa "'@localhost' no caminho" "postgresql://x:${SENHA}@evil.com/@localhost"
recusa "'@localhost' no fragmento" "postgresql://x:${SENHA}@evil.com#@localhost"
recusa "?host= sobrepõe o host" "postgresql://localhost/db?host=evil.com"
recusa "?host= sem caminho" "postgresql://x:${SENHA}@localhost?host=evil.com"
recusa "&host= depois de outro parâmetro" "postgresql://localhost/db?sslmode=disable&host=evil.com"
recusa "?hostaddr=" "postgresql://localhost/db?hostaddr=10.0.0.5"
recusa "?service=" "postgresql://localhost/db?service=nuvem"
recusa "?options=" "postgresql://localhost/db?options=-c%20x=1"
recusa "nome do parâmetro com maiúsculas" "postgresql://localhost/db?HOST=evil.com"
recusa "nome do parâmetro codificado" "postgresql://localhost/db?ho%73t=evil.com"
recusa "parâmetro separado por ';'" "postgresql://localhost/db?sslmode=disable;host=evil.com"
recusa "sufixo no host" "postgresql://u:p@localhost.evil.com:5432/db"
recusa "prefixo no host" "postgresql://u:p@evil-localhost:5432/db"
recusa "127.0.0.1 com sufixo" "postgresql://u:p@127.0.0.1.evil.com/db"
recusa "host local escondido no userinfo" "postgresql://localhost:${SENHA}@evil.com/db"
recusa "host local escondido no userinfo, com '@'" "postgresql://localhost@evil.com/db"
recusa "vários hosts" "postgresql://localhost,evil.com/db"
recusa "host codificado" "postgresql://lo%63alhost/db"
recusa "porta não numérica" "postgresql://localhost:54322abc/db"
recusa "IPv6 de outra máquina" "postgresql://[2001:db8::1]/db"
recusa "IPv6 sem colchetes" "postgresql://::1/db"
recusa "colchete sem fechar" "postgresql://[::1/db"
recusa "lixo depois do colchete" "postgresql://[::1]evil.com/db"
recusa "barra invertida" 'postgresql://evil.com\@localhost/db'
recusa "hash no meio" "postgresql://evil.com#x@localhost/db"
recusa "espaço na URL" "postgresql://localhost/db ?host=evil.com"
recusa "quebra de linha na URL" $'postgresql://localhost/db\n?host=evil.com'
recusa "tabulação na URL" $'postgresql://localhost\t@evil.com/db'
recusa "sem esquema" "evil.com@localhost/db"
recusa "esquema http" "http://localhost/db"
recusa "esquema em maiúsculas disfarçado" "xpostgresql://localhost/db"
recusa "host vazio" "postgresql:///db"
recusa "só o esquema" "postgresql://"

resumo_testes
