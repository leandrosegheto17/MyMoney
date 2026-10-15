# Cadastro dos 2 usuários em produção

Roteiro e registro. Projeto de produção: ref `yrmvvronuxsaciratiwm`; domínio `mymoney-ljs.vercel.app` (ver `limpeza.md` e `conferencia-painel.md`). Passos marcados **[U]** são do usuário: o Executor não toca produção, nunca vê e-mail, senha, `user_id` nem nome real, e nada disso entra neste arquivo nem em qualquer arquivo versionado.

SQL: `backend/supabase/setup/criar-membros.sql` (fora de `migrations/` e `seeds/`, que a CLI aplica). Sem dados reais: tudo vem por variáveis do `psql`. Sem `on conflict`: com lar já existente a execução aborta inteira; `user_id` inexistente em `auth.users` aborta pela chave estrangeira. Nada fica pela metade (`begin`/`commit`).

## Passos

1. **[U] Pré-condição.** `supabase migration list --workdir backend --linked` sem migration local pendente (lotes 1 a 21 publicados pelo `/deploy`). Se faltar, parar: é `/deploy`, não esta tarefa.
2. **[U] Conferir no painel** (contra `conferencia-painel.md`): "Allow new users to sign up" desligado; senha mínima 12.
3. **[U] Criar os 2 usuários** em Authentication > Users > "Add user" (e-mail e senha escolhidos por você, senha de 12 ou mais caracteres, "Auto Confirm"). Anote só os 2 `user_id` e os nomes de exibição, em local seu, fora do repositório. Confira, para cada `user_id`, qual e-mail ele tem no painel e qual nome vai com ele (evita trocar um pelo outro).
4. **[U] Mostrar e confirmar.** Leia `criar-membros.sql` e os 5 valores (`lar_nome`, `uid_1`, `nome_1`, `uid_2`, `nome_2`) antes de rodar.
5. **[U] Executar** com a confirmação digitada do ref na hora (`confirmar_digitado` de `backend/operacao/comum/confirmar.sh`; sem a confirmação, nada roda e a tarefa fica `Pendente`). A URL de conexão com a senha do banco é digitada por você no ambiente da sessão (`MYMONEY_DB_URL`), nunca em arquivo nem no histórico:

   ```bash
   psql "$MYMONEY_DB_URL" -v ON_ERROR_STOP=1 \
     -v lar_nome='...' -v uid_1='...' -v nome_1='...' -v uid_2='...' -v nome_2='...' \
     -f backend/supabase/setup/criar-membros.sql
   ```

   Alternativa: colar o SQL no SQL Editor do painel, trocando `:'variavel'` pelos valores entre aspas simples (só na tela, sem salvar a query com dados reais). A saída esperada do `select` de conferência: `lares = 1`, `membros = 2`, `membros_com_usuario = 2`.
6. **[U] Login.** Cada um entra em `https://mymoney-ljs.vercel.app`, abre Ajustes > Categorias e vê as iniciais (5 conjuntas + 8 individuais, CA-04.2; criadas pelo app no 1º login via `api.inicializar_membro`). Um não vê as individuais do outro.
7. **[U] Cadastro recusado** (não imprima a chave; defina `VITE_SUPABASE_ANON_KEY` no ambiente):

   ```bash
   curl -s -X POST https://yrmvvronuxsaciratiwm.supabase.co/auth/v1/signup \
     -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "content-type: application/json" \
     -d '{"email":"teste@exemplo.com","password":"<16 caracteres aleatórios>"}'
   ```

   Esperado: 4xx com `signup_disabled`; o painel continua com 2 usuários.

Não fazer: usar a chave de serviço; criar usuário por SQL em `auth.users`; deixar valores reais no `.sql` ou neste arquivo; mexer no `config.toml`.

## Registro (preencher depois dos passos; sem e-mail, senha, `user_id` nem nome real)

| Item | Resultado |
|---|---|
| Data | 2026-10-15 |
| Ref confirmado (digitado) | Não aplicável (SQL rodado no SQL Editor do painel) |
| Pré-condição (migrations em dia) | 70 em dia; 1 pendente (`20261015120000`), a aplicar pelo `/deploy` |
| `lares` / `membros` / `membros_com_usuario` | 1 / 2 / 2 |
| Login do usuário 1 (categorias iniciais vistas) | Ok (5 conjuntas + 8 individuais) |
| Login do usuário 2 (categorias iniciais vistas) | Ok (5 conjuntas + 8 individuais) |
| Individuais isoladas entre os dois | Sim |
| Signup por API (código e `error_code`) | 422, `signup_disabled` |
| Usuários no painel após o teste | Não informado |

Cadastro feito em 2026-10-15. A linha "Não informado" fica para o QA conferir.
