# Limpeza do Supabase de produção

Registro da limpeza feita com `backend/operacao/setup/limpar-supabase.sh`. Nada aqui é segredo: só ref, região e hash. Os campos abaixo são preenchidos pelo usuário depois de executar a limpeza; enquanto estiverem vazios, a limpeza **não foi feita**.

| Campo | Valor |
|---|---|
| Data | 2026-10-14 |
| Região conferida (`regiao`) | projeto antigo: `us-west-2` (Oregon), conferida no painel; projeto novo: `sa-east-1`, confirmada pelo usuário no painel |
| Ref do projeto (antigo ou novo, se recriado) | novo: `yrmvvronuxsaciratiwm` (antigo `xrcxbzrglndetrrhavhc`, excluído) |
| Caminho/nome do dump (fora do repositório) | não há: backup dispensado pelo usuário (projeto antigo só tinha dados descartáveis, 29,5 MB) |
| SHA-256 do dump | não se aplica |
| Itens em `pg_restore --list` | não se aplica |
| Caminho seguido | projeto excluído e recriado (região antiga era `us-west-2`, diferente de `sa-east-1`) |

## Roteiro

Com `supabase link` feito em `backend/supabase` e `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` no ambiente da sessão:

1. `bash backend/operacao/setup/limpar-supabase.sh regiao`
2. `bash backend/operacao/setup/limpar-supabase.sh copia` (guarde o hash acima)
3. `bash backend/operacao/setup/limpar-supabase.sh inventario`
4. `bash backend/operacao/setup/limpar-supabase.sh limpar` (pede o ref digitado; se a região não for `sa-east-1`, imprime o roteiro de exclusão e recriação do projeto)

## Verificação no painel

- [x] `public` sem tabelas
- [x] Auth sem usuários
- [x] Storage sem bucket
- [x] Sem Edge Function

Observação: a URL e as chaves de um projeto recriado vão para o gerenciador de senhas e o `.env` local, nunca para este arquivo. Os ref e a região registrados aqui são usados pelas tarefas de migrations e de deploy.
