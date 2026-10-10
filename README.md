# MyMoney

Monorepo pnpm. Cada pasta abaixo é um pacote (ou o banco) com papel próprio.

| Pasta                | Papel                                                     |
| -------------------- | --------------------------------------------------------- |
| `backend/contrato`   | Contrato da API: tipos, enums e erros compartilhados      |
| `backend/testes-api` | Testes de API contra o banco local                        |
| `backend/operacao/*` | Scripts e serviços de operação (deploy, keepalive, setup) |
| `backend/supabase`   | Banco: migrations, funções e testes SQL                   |
| `frontend/web`       | Aplicação web                                             |

## Comandos

```sh
pnpm install        # instala as dependências do workspace
pnpm lint           # ESLint na raiz e nos pacotes
pnpm typecheck      # tsc nos pacotes
pnpm test           # testes dos pacotes
pnpm format         # Prettier (escreve); format:check apenas confere
```

Os comandos `local:subir` e `local:resetar` (banco local) estão em `backend/README.md`.
