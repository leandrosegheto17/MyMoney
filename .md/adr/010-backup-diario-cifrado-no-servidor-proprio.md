# ADR-010: A rotina de backup fica fora do MVP (adiada por decisão do stakeholder)

- **Status:** **Adiado** (rejeitado para o MVP) em 2026-10-09, na rodada 2 do Loop B, por decisão do stakeholder.
  A proposta da rodada 1 (`pg_dump` diário cifrado com `age` no servidor próprio) fica registrada abaixo como a
  solução a retomar.
- **Data:** 2026-10-09
- **Decisores:** stakeholder (adiamento); Coordenador (proposta)

## Contexto

O PRD-TECNICO tem o **RNF-07**: cópia de segurança recuperável pelo menos semanal, que seria a única proteção
contra perda de dados depois que a exportação CSV saiu. O plano gratuito do Supabase não oferece backup baixável
com retenção útil.

Na rodada 2 do Loop B, o stakeholder decidiu: **"Não me preocuparia com backup nesse momento pois são
informações não críticas."**

## Decisão

1. **Não há rotina de backup no MVP:** nem job, nem cron, nem status no app.
2. A parte de backup do RNF-07 vira **dívida técnica aceita pelo stakeholder** (SDD §6).
   - **O `PRD-TECNICO.md` precisa ter a linha do RNF-07 atualizada** para refletir essa decisão: fica a parte de
     disponibilidade e sai, ou fica marcada como adiada, a parte de backup. Isso cabe ao Gestor. Não é um
     bloqueio.
3. Continuam no MVP, porque não são rotina de backup:
   - a **cópia pontual pré-migração** feita pelo script de migração (ADR-011);
   - o dump do banco antigo na tarefa de limpeza dos ambientes.

### Proposta a retomar (rodada 1)

- **Job:** `cron` diário no servidor próprio. Faz `pg_dump -Fc` com um container `postgres:<versão>`, cifra com
  `age` (a chave privada fica fora do servidor) e mantém retenção de 30 diários e 12 mensais.
- **Status:** registro em `app.sistema_status`, e o app avisa se o último backup tiver mais de 8 dias.
- **Restauração:** `restaurar.sh` no Supabase local, testado a cada 3 meses.

## Condição de revisão

Retomar a proposta acima (é um lote pequeno: cerca de 1 a 2 tarefas) quando acontecer qualquer um destes:

- o casal passar a considerar o histórico importante, por exemplo depois de 3 meses de uso;
- a primeira perda ou corrupção de dado, inclusive por erro humano (exclusão em massa);
- um aviso do Supabase sobre mudança no plano gratuito, ou um projeto pausado por mais de alguns dias;
- antes de qualquer migração de plataforma.

## Consequências

**Positivas**
- Menos uma peça para construir e operar. O servidor próprio sai da arquitetura do MVP.
- Não há senha do banco guardada em máquina doméstica.

**Negativas**
- **Uma perda de dados no Supabase (incidente do fornecedor, exclusão acidental, projeto removido) é
  irrecuperável.** Isso inclui o histórico de lançamentos, orçamentos e metas. O risco foi aceito pelo
  stakeholder.
- O "plano de saída" do ADR-001 (Postgres próprio) fica sem cópia pronta. Ele dependeria de um dump manual feito
  na hora.
- Fica uma divergência temporária entre o SDD e o RNF-07 do PRD-TECNICO até o Gestor atualizar a linha.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Manter o backup diário (rodada 1) | Adiado pelo stakeholder |
| Backup semanal manual (lembrete + `supabase db dump`) | Também é rotina de backup, e o stakeholder não quer agora. Fica como opção mais leve na revisão |
