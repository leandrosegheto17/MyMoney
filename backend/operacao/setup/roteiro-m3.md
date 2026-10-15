# Roteiro de fricção e desempenho nos aparelhos reais

Registro da M3 do PRD: RNF-01, RNF-03 e RNF-05. Quem mede é o casal, nos dois aparelhos, com o mesmo roteiro.
**Este arquivo não leva valor, categoria, descrição, e-mail nem print** (RNF-06 / G-15).

Status: **testado pelo usuário nos dois aparelhos durante um dia inteiro (15/10/2026) e dado como concluído por ele**. As tabelas abaixo ficaram sem números: não houve cronometragem registrada, só a declaração do usuário de que os limites foram atendidos. Nenhum valor foi inventado.

## 1. Aparelhos e rede

| Item | iPhone 17 | Moto Edge 60 |
|---|---|---|
| Sistema e versão | | |
| Navegador usado na instalação | Safari | Chrome |
| Versão do navegador | | |
| Rede nos itens de 4G | 4G, Wi-Fi desligado | 4G, Wi-Fi desligado |
| Data da medição | | |

App: `https://mymoney-ljs.vercel.app/` (produção, ver `limpeza.md`).

## 2. Preparação (por aparelho)

1. Instalar pela T22: iPhone, Safari, "Adicionar à Tela de Início"; Moto, Chrome, prompt nativo de instalação.
2. Abrir pelo ícone e confirmar `standalone` (sem barra do navegador) — RNF-05.
3. Entrar com o usuário de teste criado no preparo do ambiente, definir a forma preferida, e deixar a categoria do teste entre as primeiras da grade.
4. Decidir com o casal, antes de começar, se os lançamentos são gastos reais (preferível) ou fictícios excluídos depois pela T07 e conferidos na T04 dos dois membros.

## 3. Método

- Gravação de tela nativa (Central de Controle no iOS; gravador do Android).
- O tempo sai dos quadros do vídeo: do toque no ícone ou no "+" até o aviso de confirmação. Os toques contam-se no mesmo vídeo.
- Os vídeos ficam fora do repositório e são apagados depois (mostram dados financeiros).
- Não medir no navegador fora do modo instalado; não medir em Wi-Fi o item de 4G.

## 4. RNF-01 — 10 lançamentos (app já aberto na T02, caminho feliz do F1: "+" → valor → categoria → "Lançar")

Limite: mediana ≤ 10 s e exatamente 3 toques além do valor. Se trocar forma ou parcelar, refazer o lançamento. Se o teclado numérico não abrir de primeira, conta como toque a mais e é desvio.

| # | iPhone: tempo (s) | iPhone: toques | iPhone: teclado numérico abriu | Moto: tempo (s) | Moto: toques | Moto: teclado numérico abriu |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |
| 6 | | | | | | |
| 7 | | | | | | |
| 8 | | | | | | |
| 9 | | | | | | |
| 10 | | | | | | |
| **Mediana** | | | | | | |
| **Resultado (≤ 10 s, 3 toques)** | | | | | | |

## 5. RNF-03 — ícone → lançamento pronto (4G, app encerrado do multitarefa)

Do toque no ícone até a T02 aceitar o "+" com o teclado numérico. Limite: mediana ≤ 3 s. 5 medições.

| # | iPhone (s) | Moto (s) |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |
| **Mediana** | | |
| **Máximo** | | |
| **Resultado (≤ 3 s)** | | |

## 6. RNF-03 — Início (4G)

Do toque no ícone até a T02 com o resumo carregado (sem esqueleto). Limite: mediana ≤ 2 s. 5 medições.

| # | iPhone (s) | Moto (s) |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |
| **Mediana** | | |
| **Resultado (≤ 2 s)** | | |

Volume de dados no momento da medição: _(pouco / informar)_. Desempenho com 2 anos de dados já foi medido no local pela medição local de desempenho (resultado no `backend/README.md`); não refazer aqui.

## 7. RNF-05 — instalação

| Critério | iPhone | Moto |
|---|---|---|
| Ícone na tela de início | | |
| Abre em `standalone`, sem barra do navegador | | |

## 8. Conclusão

_(Preencher: aprovado ou desvio. Desvio — mediana > 10 s, mais de 3 toques, > 3 s ou > 2 s em qualquer aparelho — não se corrige nesta tarefa: registrar aparelho e números e abrir `BK` ao Coordenador, ressalva 1 do Gate 1.)_

## 9. Limpeza

- [ ] Vídeos apagados dos dois aparelhos.
- [ ] Lançamentos fictícios (se usados) excluídos pela T07 e conferidos na T04 dos dois membros.
