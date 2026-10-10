#!/usr/bin/env bash
# Confirmação digitada para operações destrutivas: lê uma linha do stdin e só aceita
# o texto exato esperado. Entrada vazia, EOF ou texto diferente recusam (retorno 1).

# confirmar_digitado <texto_esperado>
confirmar_digitado() {
  local esperado="${1:-}" lido=''
  [ -n "$esperado" ] || return 1
  IFS= read -r lido || return 1
  [ -n "$lido" ] && [ "$lido" = "$esperado" ]
}
