# ADR-009: Um Cloudflare Worker agendado chama a API do Supabase todo dia para evitar a pausa por inatividade do plano gratuito

- **Status:** Aceito em 2026-10-09 (Loop B aprovado pelo stakeholder; antes: Proposto, Loop B, rodada 2: verificação refeita sem staging, backup fora do MVP)
- **Data:** 2026-10-09
- **Decisores:** Coordenador

## Contexto

O plano gratuito do Supabase pausa o projeto depois de cerca de 1 semana sem atividade (supabase.com/pricing;
P5/R-05). Pausado, o app fica sem dados até alguém reativar pelo painel. O RNF-07 exige que isso não aconteça
sem uma mitigação adotada.

Com 2 usuários diários, o uso normal mantém o projeto ativo. O risco real são as férias, uma semana sem lançar.

Há 3 lugares candidatos para rodar a chamada periódica:

- o **servidor próprio** do casal;
- a **Cloudflare** do casal;
- o **GitHub Actions**: o agendamento é desativado depois de 60 dias sem atividade em repositório público, e o
  repositório pode ficar parado depois do MVP.

O plano pago do Supabase custa cerca de US$ 25 por mês, e o RNF-08 o exclui.

## Decisão

1. **O Worker.** Um **Cloudflare Worker** com *Cron Trigger* diário (`0 9 * * *`, 06:00 em São Paulo) faz
   `POST {SUPABASE_URL}/rest/v1/rpc/ping` com a chave `anon`.
   - A função `api.ping()` só faz `select 1`, sem gravar nada (`SECURITY INVOKER`, sem acesso a tabelas). É a
     única função liberada ao papel `anon`.
   - O Worker não tem rota HTTP pública: só o handler `scheduled`.
   - Ele tenta 3 vezes, com espera exponencial.
2. **Por que não o servidor próprio.** A rotina não roda no servidor próprio para que a pausa não dependa da
   energia e da internet da casa. Nas férias, que são justamente o período de risco, a casa pode ficar sem
   energia ou sem internet, e o banco continua acordado. Com o backup fora do MVP (ADR-010), o servidor
   próprio não faz parte da arquitetura.
3. **Configuração.** O código fica em `backend/operacao/keepalive/`, com deploy pelo `wrangler`. A URL e a chave
   `anon` ficam como *secrets* do Worker, não no repositório.
4. **Plano B documentado no DEPLOY.md.** Se mesmo assim houver pausa: reativar pelo painel do Supabase
   ("Restore project"). Os lançamentos de despesa feitos nesse intervalo ficam na fila local (ADR-007).
5. **Verificação, sem staging, no próprio projeto de produção e antes do uso diário.**
   - O Worker é publicado no **primeiro lote** do TASK.md, logo depois da limpeza ou recriação do projeto.
   - Durante o desenvolvimento, o projeto de produção fica naturalmente sem uso humano, porque todo
     desenvolvimento e teste roda no Supabase local (ADR-011).
   - Antes de liberar o uso diário, uma tarefa confere que o projeto ficou **10 dias ou mais sem uso humano**
     com o Worker rodando e continua *Active* no painel. A evidência é o histórico do Worker e o status no
     painel.
   - Se o desenvolvimento não deixar uma janela de 10 dias, o risco fica **aceito e monitorado**: o histórico
     de execuções do Worker é conferido na 1ª e na 4ª semana de uso, e o plano B do item 4 continua valendo.

## Consequências

**Positivas**
- Custo zero, sem máquina para manter, e independente do servidor da casa.
- O histórico de execuções do Worker no painel da Cloudflare mostra se o keep-alive está funcionando. Esse log
  não tem dado financeiro: a resposta de `ping` é só `1`.

**Negativas**
- Mais um fornecedor e mais um deploy: a conta Cloudflare e o `wrangler`.
- Não há garantia contratual de que uma chamada ao PostgREST conte como "atividade" para o Supabase. A prática
  comum da comunidade indica que conta. A verificação está descrita no item 5 da Decisão.
- Se o Supabase mudar a política do plano gratuito, a mitigação pode deixar de valer. Plano de saída: Postgres
  próprio a partir de um dump manual feito na hora (ADR-001). Não há backup pronto (ADR-010 adiado).

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Cron no servidor próprio | Depende da energia e da internet da casa, justamente nas férias, que são o período de risco |
| GitHub Actions agendado | Desativado depois de 60 dias sem atividade no repositório. Falha silenciosa |
| Plano Pro do Supabase | US$ 25 por mês, viola o RNF-08 |
| Banco inteiro no servidor próprio | Ver ADR-001: troca a pausa por disponibilidade doméstica e muito mais operação |
