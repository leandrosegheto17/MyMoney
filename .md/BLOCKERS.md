# BLOCKERS

## Bloqueio 001 — 2026-10-10 (BK-0001)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: TP-0007
- Descrição: Decidir como o gitleaks no histórico (35 achados: JWTs de exemplo em commit antigo e .claude/skills) e o passo service_role (acusa frontend/web/src/configuracao/ambiente.ts e ambiente.test.ts) devem passar no CI; permitir push/branch de prova no GitHub
- Impacto se não resolvido: CI fica vermelho desde o primeiro push sem .gitleaks.toml/baseline, que o plano proíbe; G-15 só abre exceção para README
- Sugestão: Autorizar baseline/allowlist do gitleaks e ajustar a G-15 (exceção para os arquivos de ambiente do web)
- Status: Resolvido (2026-10-10): Aprovado pelo usuário em 2026-10-10 e aplicado (.gitleaksignore com 35 falsos positivos, ci.yml, exceção G-15); desbloqueio confirmado pelo usuário em /desenvolver

## Bloqueio 002 — 2026-10-10 (BK-0002)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: TP-0036
- Descrição: Folha.test.tsx:199 (pré-escrito) exige queryByLabelText('Valor') nulo com o campo no DOM; só passa com o nó fora de document.body, o que quebra getByRole('dialog'). Decidir se o teste pode ser corrigido (ex.: queryByRole('textbox',{name:'Valor'}))
- Impacto se não resolvido: 26 de 27 testes passam; implementação completa e Playwright 8/8; sem a decisão o teste não fica verde
- Sugestão: Autorizar a alteração do teste pré-escrito na linha 199 e reexecutar
- Status: Resolvido (2026-10-10): Usuário autorizou alterar Folha.test.tsx:199 para queryByRole (opção 1); teste da Folha passa

## Bloqueio 003 — 2026-10-10 (BK-0003)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: RTP-0006
- Descrição: Aguardar 2026-10-11 ~01:26Z (janela minimumReleaseAge de 1 dia de @cloudflare/workers-types@5.20261010.1) e reexecutar /executar --tarefa RTP-0006
- Impacto se não resolvido: —
- Sugestão: Reexecutar após a janela, sem mudar nada
- Status: Em aberto

## Bloqueio 004 — 2026-10-10 (BK-0004)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: TP-0080
- Descrição: Código pronto, mas BotaoForma.test.tsx depende de src/rotulos/tipoForma.ts (TP-0038, inexistente); Playwright não rodou (sem Chromium) e a lista aberta de formas (PENDENTE do plano) precisa de decisão de UX
- Impacto se não resolvido: —
- Sugestão: Executar TP-0038 antes e confirmar o desenho da lista aberta com o UX
- Status: Resolvido (2026-10-10): Usuário aprovou o desenho A (lista inline com GrupoChips); mockup e UX-SPEC atualizados; TP-0038 entra na Dep da TP-0080

## Bloqueio 005 — 2026-10-10 (BK-0005)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: TP-0053
- Descrição: Decidir pode_excluir em api.categorias: o JSON do mockup traz o campo, mas o plano fixa 6 colunas sem calculadas e o cálculo exigiria a tabela de lançamentos
- Impacto se não resolvido: —
- Sugestão: Incluir pode_excluir na view (após app.lancamento, TP-0051) ou retirá-lo do JSON/contrato
- Status: Resolvido (2026-10-10): Usuário aprovou a alternativa A (pode_excluir na view, 7 colunas); plano, aceite e pgTAP do TP-0053 ajustados

## Bloqueio 006 — 2026-10-10 (BK-0006)
- Reportado por: Executor
- Escalado para: usuário
- Artefato/trecho afetado: TP-0138
- Descrição: Faltam app.orcamentos_escopo (TP-0135) e api.orcamento_mes (TP-0136), origem da cópia; dependência não declarada na Dep
- Impacto se não resolvido: —
- Sugestão: Executar TP-0135 e TP-0136 e acrescentá-las à Dep de TP-0138
- Status: Resolvido (2026-10-10): Lacuna de dependência: TP-0135 e TP-0136 já aprovadas; Dep da TP-0138 ajustada (confirmado pelo usuário)

## Bloqueio 007 — 2026-10-10 (BK-0007)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0070
- Descrição: TP-0070 usa CabecalhoPagina, ItemLink e Lista.module.css que o TP-0047 (T14 Ajustes) cria, mas o TP-0047 não está na Dep do TP-0070: adicionar a dependência ou mover a criação dos três arquivos para o TP-0070
- Impacto se não resolvido: TP-0070 não pode ser executada; provável o mesmo problema em outras telas de lote 14 (TP-0071..0075)
- Sugestão: Incluir TP-0047 em Dep do TP-0070 (e das demais telas que usam esses componentes)
- Status: Em aberto

## Bloqueio 008 — 2026-10-10 (BK-0008)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0071
- Descrição: TP-0071 usa CabecalhoPagina (TP-0047) e AvisoErroTopo.tsx (TP-0045), que ainda não existem e não estão na Dep; relacionado ao BK-0007
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045 e TP-0047 em Dep do TP-0071
- Status: Em aberto

## Bloqueio 009 — 2026-10-10 (BK-0009)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0155
- Descrição: TP-0155 usa CabecalhoPagina (TP-0047), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Em aberto

## Bloqueio 010 — 2026-10-10 (BK-0010)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0075
- Descrição: TP-0075 usa CabecalhoPagina (TP-0047) e AvisoErroTopo (TP-0045), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Em aberto

## Bloqueio 011 — 2026-10-10 (BK-0011)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0073
- Descrição: TP-0073 usa CabecalhoPagina (TP-0047) e AvisoErroTopo (TP-0045), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Em aberto

## Bloqueio 012 — 2026-10-10 (BK-0012)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0072
- Descrição: TP-0072 usa CabecalhoPagina e ItemLink (TP-0047), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Em aberto

## Bloqueio 013 — 2026-10-10 (BK-0013)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0131
- Descrição: TP-0131 usa CabecalhoPagina (TP-0047), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Em aberto

## Bloqueio 014 — 2026-10-10 (BK-0014)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0081
- Descrição: TP-0081 move folgaTeclado.ts e remove a página EnsaioTeclado, criados pelo TP-0031 (Pendente, fora da Dep); useFormularioLancar.test.ts exige formaInicial.ts, que o plano atribui ao TP-0083
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0031 na Dep do TP-0081 ou reescrever o TP-0081 para criar componentes/base/folgaTeclado.ts; definir onde ficam os casos de formaInicial
- Status: Em aberto

## Bloqueio 015 — 2026-10-10 (BK-0015)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0089
- Descrição: TP-0089 usa ItemLink (TP-0047), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Em aberto

## Bloqueio 016 — 2026-10-10 (BK-0016)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0105
- Descrição: TP-0105 usa CabecalhoPagina (TP-0047) e AvisoErroTopo (TP-0045), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Em aberto

## Bloqueio 017 — 2026-10-10 (BK-0017)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0101
- Descrição: TP-0101 usa ItemLink (TP-0047), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Em aberto

## Bloqueio 018 — 2026-10-10 (BK-0018)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0154
- Descrição: TP-0154 usa CabecalhoPagina (TP-0047), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Em aberto

## Bloqueio 019 — 2026-10-10 (BK-0019)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0074
- Descrição: TP-0074 usa CabecalhoPagina e ItemLink (TP-0047), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Em aberto

## Bloqueio 020 — 2026-10-10 (BK-0020)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0130
- Descrição: TP-0130 usa CabecalhoPagina e ItemLink (TP-0047), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Em aberto

## Bloqueio 021 — 2026-10-10 (BK-0021)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0090
- Descrição: TP-0090 usa LinkMais.tsx (TP-0045), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045 na Dep do TP-0090
- Status: Em aberto
