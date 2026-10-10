# ADR-011: Só existe o ambiente de produção; o Supabase local (CLI/Docker) é ferramenta de desenvolvimento e teste, sem docker-compose.yml próprio

- **Status:** Aceito em 2026-10-09 (Loop B aprovado pelo stakeholder; antes: Proposto, Loop B, rodada 2). O desvio da convenção do ambiente (sem `docker-compose.yml`) foi
  **aprovado pelo stakeholder em 2026-10-09**.
- **Data:** 2026-10-09
- **Decisores:** Coordenador; stakeholder (ambiente único e desvio da convenção)


## Contexto

O stakeholder decidiu (rodada 2): "O app é de uso pessoal, podemos ter apenas o ambiente de produção". Não há
segundo projeto Supabase nem preview da Vercel como etapa obrigatória.

Dois testes, porém, precisam de um banco **com os 2 usuários e dados controlados**, que possam ser criados e
apagados à vontade:

- a suíte de isolamento por chamada direta à API (ADR-002, RNF-04);
- os testes pgTAP das regras.

Rodar esses testes no banco de produção significaria criar usuários e dados falsos ao lado dos dados reais do
casal, tentar violar a privacidade sobre dados reais e arriscar apagar ou alterar lançamentos verdadeiros. Isso
é inaceitável.

A convenção do ambiente pede um `docker-compose.yml` na raiz. A Supabase CLI (`supabase start`) já sobe a pilha
inteira do Supabase (Postgres, Auth, PostgREST) em Docker, nas mesmas versões da nuvem.

## Decisão

1. **Um único ambiente publicado: produção.** É o projeto Supabase `xrcxbzrglndetrrhavhc` (limpo ou recriado em
   `sa-east-1`, conforme a verificação de região na tarefa de limpeza) mais o projeto Vercel `mymoney`. Previews
   da Vercel podem existir por padrão da plataforma, mas **não são etapa do processo**.
2. **Supabase local como ferramenta.** O Supabase local roda na máquina do desenvolvedor e no job de CI. **Não
   é staging:**
   - não é publicado nem acessível pela internet;
   - não tem dados reais;
   - é criado e destruído a cada execução (`supabase start` / `supabase db reset`).
   Ele existe só porque os testes de isolamento e de regra precisam de um Postgres com Auth e RLS idênticos aos
   da produção, e não podem rodar sobre os dados reais.
3. **Sem `docker-compose.yml`.** O comando `pnpm local:subir` executa `supabase start --workdir backend` (com
   migrations, seed, 2 usuários de teste e dados de exemplo) e depois o Vite. Esse é o equivalente aprovado ao
   Docker Compose da convenção.
4. **Migrações direto para produção, com 4 cuidados mínimos obrigatórios:**
   1. A migration é gerada por `supabase db diff` a partir do schema declarativo e aplicada do zero no Supabase
      local (`supabase db reset`).
   2. O CI fica verde **com essa migration**: pgTAP, suíte de isolamento, testes de frontend e um teste de
      "migration sobre dados" (o seed com volume de 2 anos aplicado **antes** da migration nova, para pegar
      falha de `NOT NULL` ou de conversão de dado existente).
   3. A migration é escrita *expand/contract* (só adiciona, com default) e roda numa transação.
   4. O script `backend/operacao/deploy/migrar.sh` faz `supabase db push --dry-run`, mostra o SQL, pede
      confirmação e só então aplica. Antes, ele grava uma **cópia pontual pré-migração** (`supabase db dump`,
      dados e schema) na máquina do desenvolvedor, fora do repositório e coberta pelo `.gitignore`. Ela serve
      para desfazer um erro daquela migration e não é uma rotina de backup (ADR-010 adiado).

## Consequências

**Positivas**
- Nenhum custo, nenhum projeto extra para manter acordado.
- Os testes de privacidade rodam numa pilha idêntica à produção sem tocar em dado real.
- O ambiente local é reproduzível por qualquer máquina com Docker.

**Negativas**
- Não há ensaio na nuvem. Diferenças entre o Supabase local e o hospedado (configuração do Auth, extensões,
  limites) só aparecem em produção. Mitigação: `config.toml` versionado com as mesmas opções do painel (cadastro
  desligado, senha mínima) e conferência manual do painel na tarefa de configuração.
- Um erro de migration atinge os dados reais. Mitigação: os 4 cuidados acima e a cópia pontual pré-migração.
- **Desvio da convenção do ambiente** (sem `docker-compose.yml`), aprovado pelo stakeholder. Ferramentas que
  procurem esse arquivo devem aceitar `backend/supabase/config.toml` como equivalente.
- O CI precisa de Docker (disponível nos runners Linux do GitHub Actions) e leva alguns minutos a mais para
  subir a pilha.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Staging num segundo projeto gratuito (rodada 1) | Descartado pelo stakeholder: uso pessoal, só produção |
| Rodar os testes de isolamento contra a produção, com usuários de teste | Mistura dado falso com o real, testa a violação de privacidade sobre dados reais e arrisca alterá-los |
| `docker-compose.yml` próprio replicando a pilha do Supabase | Duplica o que a CLI mantém, e diverge a cada versão |
