# Handoff jam-508

## Next action

O operador lê o pull request #276 e marca **Ready to merge**. Depois diz `release JAM-508` ou
carrega em "Merge now" no cartão.

## How to test

Abra os ficheiros do pull request #276. Em `workspaces/geo-content/topics.md` conte 12
tópicos, cada um com o estado dos factos. Em `stages/03_publish/CONTEXT.md` veja que a saída é
`web/src/content/generated/blog/<slug>.md`. Em `research.md` leia a secção "Facts check of
2026-11-23": cinco factos, cada um com a correção.

## What changed, and why no user sees it

- As fases 02 e 03, o questionário, a checklist GEO e os ficheiros de rota do pipeline
  descrevem agora o formato markdown do blog (`web/src/lib/blog-markdown.ts`). A fase 02
  escreve um ficheiro por artigo. A fase 03 verifica-o e copia-o para
  `web/src/content/generated/blog/<slug>.md`.
- `workspaces/geo-content/topics.md` é novo: a fila de 12 tópicos.
- `research.md` foi verificado outra vez contra os factos e corrigido em cinco pontos.
- `business-facts.md` mudou em duas linhas (ver Decisões).
- Nenhum ficheiro de `web/` mudou. Nenhuma página, nenhum build e nenhuma base de dados lê
  `workspaces/`. Nenhum artigo foi escrito e nenhum rascunho foi carregado.

## Decisions

- Jamie, 2026-11-23, no chat: "yes" ao plano "JAM-508 then JAM-510". Esta palavra levanta a
  linha "Do not start before the go-live unless Jamie says so" dos dois tickets.
- Escolha deste run, para o operador verificar: `business-facts.md` dizia que os complementos
  só se juntam à Rural Saloia. O site junta-os também a Óbidos desde 2026-10-28 (#212, #222).
  O ticket pede a verificação dos complementos, e o brief só pode citar `business-facts.md`.
  Por isso este run corrigiu a linha dos complementos e juntou a regra dos lugares ("Every
  guest takes a seat, infants included"), que o site já diz. O parágrafo do domínio (JAM-526)
  não foi tocado.
- Diferença em relação a `.icm/docs/blog-loop.md`: a frase "everyone counts for seats" do brief
  não estava errada. O brief diz agora as duas regras: os lugares contam todos, o escalão e o
  mínimo contam só adultos.
- A fase 01 lê e atualiza a fila (`topics.md`). O ticket não nomeia a fase 01, mas a fila
  precisa de um leitor.

## What JAM-510 needs from Jamie

1. O merge deste pull request.
2. A aprovação do brief: o Jamie lê os artigos 1, 2 e 5 de `research.md` e marca a caixa
   "Research brief approved". Nenhum agente a marca.
3. Uma resposta aos dois primeiros achados de `findings.md`: "UNESCO World Surfing Reserve", e
   as afirmações do artigo 1 que não estão em `business-facts.md`.
4. O carregamento em UAT: `pnpm blog:load` corre à mão, com o `DATABASE_URL` de UAT (decisão
   de 2026-08-29). O Jamie corre-o, ou diz que a sessão o pode correr.

## Blockers

- none

## Do not touch

- A caixa "Research brief approved" de `research.md`: só o Jamie a marca.
- O parágrafo do domínio de `business-facts.md`: é do JAM-526.
- `web/src/lib` e `web/src/db`: as sessões do JAM-290 e do JAM-506 trabalham lá.
