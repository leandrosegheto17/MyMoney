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
- Status: Resolvido (2026-10-10): Resolvido pelo coordenador (2026-10-10): dependência de origem acrescentada na Dep da tarefa afetada (D-17)

## Bloqueio 008 — 2026-10-10 (BK-0008)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0071
- Descrição: TP-0071 usa CabecalhoPagina (TP-0047) e AvisoErroTopo.tsx (TP-0045), que ainda não existem e não estão na Dep; relacionado ao BK-0007
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045 e TP-0047 em Dep do TP-0071
- Status: Resolvido (2026-10-10): Resolvido pelo coordenador (2026-10-10): dependência de origem acrescentada na Dep da tarefa afetada (D-17)

## Bloqueio 009 — 2026-10-10 (BK-0009)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0155
- Descrição: TP-0155 usa CabecalhoPagina (TP-0047), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Resolvido (2026-10-10): Resolvido pelo coordenador (2026-10-10): dependência de origem acrescentada na Dep da tarefa afetada (D-17)

## Bloqueio 010 — 2026-10-10 (BK-0010)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0075
- Descrição: TP-0075 usa CabecalhoPagina (TP-0047) e AvisoErroTopo (TP-0045), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Resolvido (2026-10-10): Resolvido pelo coordenador (2026-10-10): dependência de origem acrescentada na Dep da tarefa afetada (D-17)

## Bloqueio 011 — 2026-10-10 (BK-0011)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0073
- Descrição: TP-0073 usa CabecalhoPagina (TP-0047) e AvisoErroTopo (TP-0045), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Resolvido (2026-10-10): Resolvido pelo coordenador (2026-10-10): dependência de origem acrescentada na Dep da tarefa afetada (D-17)

## Bloqueio 012 — 2026-10-10 (BK-0012)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0072
- Descrição: TP-0072 usa CabecalhoPagina e ItemLink (TP-0047), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Resolvido (2026-10-10): Resolvido pelo coordenador (2026-10-10): dependência de origem acrescentada na Dep da tarefa afetada (D-17)

## Bloqueio 013 — 2026-10-10 (BK-0013)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0131
- Descrição: TP-0131 usa CabecalhoPagina (TP-0047), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Resolvido (2026-10-10): Resolvido pelo coordenador (2026-10-10): dependência de origem acrescentada na Dep da tarefa afetada (D-17)

## Bloqueio 014 — 2026-10-10 (BK-0014)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0081
- Descrição: TP-0081 move folgaTeclado.ts e remove a página EnsaioTeclado, criados pelo TP-0031 (Pendente, fora da Dep); useFormularioLancar.test.ts exige formaInicial.ts, que o plano atribui ao TP-0083
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0031 na Dep do TP-0081 ou reescrever o TP-0081 para criar componentes/base/folgaTeclado.ts; definir onde ficam os casos de formaInicial
- Status: Resolvido (2026-10-10): Resolvido pelo coordenador (2026-10-10): TP-0081 reescrito para criar folgaTeclado.ts; TP-0031 dispensada (D-16)

## Bloqueio 015 — 2026-10-10 (BK-0015)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0089
- Descrição: TP-0089 usa ItemLink (TP-0047), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Resolvido (2026-10-10): Resolvido pelo coordenador (2026-10-10): dependência de origem acrescentada na Dep da tarefa afetada (D-17)

## Bloqueio 016 — 2026-10-10 (BK-0016)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0105
- Descrição: TP-0105 usa CabecalhoPagina (TP-0047) e AvisoErroTopo (TP-0045), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Resolvido (2026-10-10): Resolvido pelo coordenador (2026-10-10): dependência de origem acrescentada na Dep da tarefa afetada (D-17)

## Bloqueio 017 — 2026-10-10 (BK-0017)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0101
- Descrição: TP-0101 usa ItemLink (TP-0047), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Resolvido (2026-10-10): Resolvido pelo coordenador (2026-10-10): dependência de origem acrescentada na Dep da tarefa afetada (D-17)

## Bloqueio 018 — 2026-10-10 (BK-0018)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0154
- Descrição: TP-0154 usa CabecalhoPagina (TP-0047), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Resolvido (2026-10-10): Resolvido pelo coordenador (2026-10-10): dependência de origem acrescentada na Dep da tarefa afetada (D-17)

## Bloqueio 019 — 2026-10-10 (BK-0019)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0074
- Descrição: TP-0074 usa CabecalhoPagina e ItemLink (TP-0047), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Resolvido (2026-10-10): Resolvido pelo coordenador (2026-10-10): dependência de origem acrescentada na Dep da tarefa afetada (D-17)

## Bloqueio 020 — 2026-10-10 (BK-0020)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0130
- Descrição: TP-0130 usa CabecalhoPagina e ItemLink (TP-0047), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045/TP-0047 na Dep da tarefa
- Status: Resolvido (2026-10-10): Resolvido pelo coordenador (2026-10-10): dependência de origem acrescentada na Dep da tarefa afetada (D-17)

## Bloqueio 021 — 2026-10-10 (BK-0021)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0090
- Descrição: TP-0090 usa LinkMais.tsx (TP-0045), que ainda não existe e não está na Dep; mesma causa do BK-0007/BK-0008
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0045 na Dep do TP-0090
- Status: Resolvido (2026-10-10): Resolvido pelo coordenador (2026-10-10): dependência de origem acrescentada na Dep da tarefa afetada (D-17)

## Bloqueio 022 — 2026-10-10 (BK-0022)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0141
- Descrição: TP-0141 usa Segmentado.tsx (TP-0081), ResumoOrcamento.tsx (TP-0090), formatacao/links.ts + LinhasValores.tsx (TP-0089) e filtrosLancamentos.ts (TP-0104), que não existem e não estão na Dep; TP-0081/0089/0090 estão bloqueadas; UX pendente (seção 'Sem orçamento', escopo Eu, textos de aviso)
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0081, TP-0089, TP-0090 e TP-0104 na Dep do TP-0141 e resolver as pendências de UX
- Status: Resolvido (2026-10-10): Resolvido pelo coordenador (2026-10-10): Dep do TP-0141 ajustada e decisões de UX fixadas no UX-SPEC

## Bloqueio 023 — 2026-10-10 (BK-0023)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0153
- Descrição: TP-0153 usa MetaCompacta.tsx e formatarMesCurto (TP-0090), BlocoInicio.tsx e formatacao/links.ts com linkMeta (TP-0089), que não existem; TP-0089/TP-0090 estão bloqueadas e fora da Dep
- Impacto se não resolvido: —
- Sugestão: Incluir TP-0089 e TP-0090 na Dep do TP-0153
- Status: Resolvido (2026-10-10): Resolvido pelo coordenador (2026-10-10): dependência de origem acrescentada na Dep da tarefa afetada (D-17)

## Bloqueio 024 — 2026-10-10 (BK-0024)
- Reportado por: QA
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0047
- Descrição: 'Sair de todos' sem rede contraria o aceite e o RNF-06: supabase-js 2.117.3 (_signOut) remove a sessão local mesmo com falha de rede; SIGNED_OUT leva a /entrar e desmonta RegiaoAvisos (o aviso 'Sem conexão' some) e os outros aparelhos não são revogados; a correção está em dados/sessao.ts (TP-0025) e exige decisão de desenho
- Impacto se não resolvido: T14 Ajustes não fecha; visual e demais critérios OK (RTP-0086 aberta para a seta de 'Instalar o app')
- Sugestão: Decidir se sairDeTodos deve checar rede antes de chamar signOut/ou tratar o evento SIGNED_OUT local sem navegar; ajustar SDD/TP-0025 e reabrir o TP-0047
- Status: Resolvido (2026-10-10): Resolvido pelo coordenador (2026-10-10): ADR-013 e TP-0160; TP-0047 depende dela

## Bloqueio 025 — 2026-10-11 (BK-0025)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: RTP-0096
- Descrição: Decidir se a ordem erro/ajuda do componente base Campo (todas as telas) e a ajuda do valor no FormularioFixa mudam para casar com o mockup fixa--erro, ou se o mockup é que muda (G-18); o plano da RTP pede essa decisão antes de mexer no Campo base
- Impacto se não resolvido: Mudar o Campo afeta o visual de todas as telas com campo em erro; deixar como está mantém 22 px de diferença só no estado manual fixa--erro
- Sugestão: Alinhar o mockup ao app (ajuda antes do erro, ajuda do valor sempre visível) e fechar a RTP sem tocar o Campo
- Status: Resolvido (2026-10-11): Decidido pelo coordenador (2026-10-11): o mockup fixa--erro muda para casar com o app; Campo e FormularioFixa não mudam; RTP-0096 vira reconferência visual

## Bloqueio 026 — 2026-10-14 (BK-0026)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0094
- Descrição: T02 sucesso: mockup inicio--sucesso.html não mostra a faixa 'N lançamentos aguardando envio' que o app exibe com 1 item na fila; decidir se o estado mostra ou omite a faixa (mockup/UX-SPEC, G-18)
- Impacto se não resolvido: Visual sucesso da T02 não fecha (9,91% pc / 17,54% celular); código da TP-0094 pronto e commitado
- Sugestão: Alinhar o mockup inicio--sucesso.html (e UX-SPEC §T02) à faixa do app, ou omitir a faixa no sucesso
- Status: Em aberto

## Bloqueio 027 — 2026-10-14 (BK-0027)
- Reportado por: Executor
- Escalado para: coordenador
- Artefato/trecho afetado: TP-0133
- Descrição: TP-0133 usa a infra de E2E @integracao criada pela TP-0110/TP-0111 (ainda não executadas) e não depende delas: lacuna de dependência; decidir ordem ou extrair o apoio; PENDENTE do passo 3 (relógio no banco) também
- Impacto se não resolvido: TP-0133 não executável; E2E do ciclo da despesa fixa parado
- Sugestão: Adicionar TP-0110 à Dep da TP-0133 e reordenar o lote, ou extrair ambiente/entrarComo/marcador para tarefa própria
- Status: Em aberto
