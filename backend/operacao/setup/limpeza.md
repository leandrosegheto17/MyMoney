# Limpeza do Supabase de produção

Registro da limpeza feita com `backend/operacao/setup/limpar-supabase.sh`. Nada aqui é segredo: só ref, região e hash. Os campos abaixo são preenchidos pelo usuário depois de executar a limpeza; enquanto estiverem vazios, a limpeza **não foi feita**.

| Campo | Valor |
|---|---|
| Data | _a preencher_ |
| Região conferida (`regiao`) | _a preencher_ |
| Ref do projeto (antigo ou novo, se recriado) | _a preencher_ |
| Caminho/nome do dump (fora do repositório) | _a preencher_ |
| SHA-256 do dump | _a preencher_ |
| Itens em `pg_restore --list` | _a preencher_ |
| Caminho seguido | _reset em sa-east-1 / projeto recriado em sa-east-1_ |

## Roteiro

Com `supabase link` feito em `backend/supabase` e `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` no ambiente da sessão:

1. `bash backend/operacao/setup/limpar-supabase.sh regiao`
2. `bash backend/operacao/setup/limpar-supabase.sh copia` (guarde o hash acima)
3. `bash backend/operacao/setup/limpar-supabase.sh inventario`
4. `bash backend/operacao/setup/limpar-supabase.sh limpar` (pede o ref digitado; se a região não for `sa-east-1`, imprime o roteiro de exclusão e recriação do projeto)

## Verificação no painel

- [ ] `public` sem tabelas
- [ ] Auth sem usuários
- [ ] Storage sem bucket
- [ ] Sem Edge Function

Observação: a URL e as chaves de um projeto recriado vão para o gerenciador de senhas e o `.env` local, nunca para este arquivo. Os ref e a região registrados aqui são usados pelas tarefas de migrations e de deploy.
