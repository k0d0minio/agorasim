# Handoff jam-558

## Next action

O operador testa a pré-visualização do pull request #286 e marca **Ready to merge**. Depois diz
`release JAM-558`. Este run tem a migração `0045`: na próxima promoção, corra
`migrate-production.yml` com a tag antes de `promote` (`.icm/local/ROUTES.md`).

## Cause

1. **O rodapé salta.** `loading.tsx` é a fronteira de Suspense à volta de cada página. O React
   envia uma página grande depois do seu fallback, mesmo numa página pré-renderizada: o HTML de
   `uat.agorasim.pt/pt` tem primeiro o esqueleto (`role="status"`, cerca de 300 px) e o rodapé,
   e depois o conteúdo, que o script `$RC` troca. O esqueleto curto punha o rodapé no ecrã, e o
   conteúdo empurrava-o para baixo. Correção: o esqueleto ocupa a altura do ecrã (`min-h-svh`),
   e o rodapé fica abaixo da dobra até a página chegar.
2. **O facto da Ericeira.** As World Surfing Reserves são um programa da Save The Waves
   Coalition. A Ericeira é uma desde 2011, a primeira da Europa (fontes: savethewaves.org,
   visitlisboa.com, record.pt). O texto vivo da Rural Saloia vem da tabela `experiences` da base
   de dados, não de `experiences.ts`. Correção: o texto de `experiences.ts` (pt e en), a
   migração `0045_ericeira_surfing_reserve.sql` para a linha da base de dados,
   `business-facts.md` e os artigos 1 e 3 do brief. A migração muda só as duas frases erradas:
   uma linha que o Diogo ou a Rita editaram fica como está. "A única da Europa" saiu: nenhuma
   fonte atual o confirma.
3. **O hover do botão destrutivo.** `hover:bg-destructive/20` dá 4.08:1 sobre Off-white.
   `/15` dá 4.46:1 e ainda falha. Correção: `hover:bg-destructive/13`, 4.61:1.
4. **A pasta do run jam-506.** O `close-out.sh` não correu antes do merge do #277. Correção: os
   ficheiros passam para `.icm/archive/jam-506/`, `status.md` sai, e o stub passa para
   `.icm/intake/_done/`.
5. **Páginas desatualizadas.** `.icm/docs/brand.md` (o valor de `--destructive`, os dois passos
   de teal dos emails, o hex do Orange text, o Tan, a linha "applied by" e os rácios novos),
   `.icm/docs/blog-loop.md` (pontos 2 a 4 de "What stops the first articles"),
   `web/src/content/generated/README.md` (sem blocos JSON), e a linha "Run" do questionário e do
   brief.

## How to test

Abra a pré-visualização em `/pt` num telemóvel: o rodapé não aparece antes da página e nada
salta. Abra a página da Rural Saloia em pt e em en: a Ericeira é "a primeira reserva mundial de
surf da Europa", sem UNESCO.

## Blockers

- O operador marca Ready to merge.
- A produção precisa de `migrate-production.yml` na próxima promoção (migração `0045`).

## Do not touch

- none
