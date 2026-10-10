# ADR-007: Sem rede, o lançamento de despesa vai para uma fila local e é enviado depois de forma idempotente; as demais telas exigem conexão

- **Status:** Aceito em 2026-10-09 (Loop B aprovado pelo stakeholder; antes: Proposto, Loop B, rodada 1)
- **Data:** 2026-10-09
- **Decisores:** Coordenador

## Contexto

O RNF-02 exige que um lançamento confirmado nunca se perca em silêncio, e deixa ao Coordenador escolher entre
duas opções: "guarda e envia depois" ou "avisa e mantém os dados preenchidos".

O gasto acontece na rua: elevador, metrô, restaurante com sinal ruim. Se o app mandar "tente de novo mais tarde",
o membro desiste, e esse é exatamente o risco P1/R-01.

Por outro lado, "offline completo" está fora do escopo (PRD §4). O iOS também não tem a Background Sync API, então
o envio só pode acontecer com o app aberto.

## Decisão

1. **Escopo da fila.** Só o **lançamento de despesa** (tela T03, incluindo crédito parcelado) usa fila local.
   Receita, edição, exclusão, cadastros, pagamento de fixa, orçamento e metas usam a outra opção: avisam que
   não há conexão e mantêm o formulário preenchido.
2. **Gravação local.** Ao confirmar, o cliente:
   - gera o `id` (uuid v4);
   - grava a chamada `api.lancar_despesa` completa na fila (IndexedDB) **antes** de tentar enviar;
   - só remove da fila quando o servidor responde sucesso. A RPC é idempotente pelo `id` (ADR-003).
3. **Quando a fila é esvaziada:**
   - ao abrir o app;
   - no evento `online`;
   - quando o app volta ao primeiro plano (`visibilitychange`);
   - a cada 30 s enquanto houver item pendente e o app estiver aberto.
   O envio é em ordem e um item por vez.
4. **Confirmação sem rede.** A mensagem é "Guardado no aparelho. Será enviado quando houver conexão". A tela
   principal mostra um indicador com o número de lançamentos pendentes. No crédito, a data da 1ª parcela só
   aparece depois do envio, porque quem calcula é o servidor (I-18; ver UX-SPEC §7).
5. **Rejeição pelo servidor.** Se o servidor rejeitar o item por validação (por exemplo, categoria arquivada no
   meio-tempo), ele fica na fila como **falha**, com o motivo. O membro corrige ou descarta, e o descarte pede
   confirmação. Nada some sem ação do membro.
6. **Dados para lançar sem rede.** Categorias mais usadas, formas, forma padrão e contas ficam em cache local
   (última resposta de `api.dados_lancamento()`) e são atualizados a cada abertura com rede.
7. **Sessão.** O token pode expirar sem rede. A fila espera, renova a sessão com o refresh token quando a rede
   volta e só então envia. Se a sessão foi revogada, a fila fica guardada até o próximo login **do mesmo
   membro**. O item guarda o `membro_id`, e uma fila de um membro nunca é enviada com a sessão de outro.

## Consequências

**Positivas**
- Atende o RNF-02 sem quebrar a regra de 3 toques.
- A idempotência evita duplicata quando a resposta se perde depois de o servidor gravar.

**Negativas**
- No crédito sem rede, a confirmação não mostra a data da 1ª parcela, que é o aviso do I-18. Esse trade-off
  está documentado no UX-SPEC §7.
- No iOS, o envio só acontece com o app aberto. Um lançamento feito sem rede e com o app fechado logo em
  seguida espera a próxima abertura. É aceitável, porque o membro abre o app todo dia.
- O IndexedDB pode ser apagado pelo sistema. O WebKit isenta da limpeza de 7 dias os web apps instalados na
  tela de início, mas a limpeza manual de dados do Safari apaga a fila. Risco baixo, registrado no SDD §6.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Só "avisa e mantém os dados" | Obriga o membro a lembrar de reabrir e confirmar depois, e vira gasto perdido (P1) |
| Offline completo, com réplica local e sincronização (PowerSync, RxDB etc.) | Fora do escopo, e tem conflito de edição entre os 2 membros. Complexidade desproporcional |
| Background Sync API | Não existe no Safari |
