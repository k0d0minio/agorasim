# Findings jam-482

The operator files these later. One entry for each finding.

## brand.md não tem o tan nem o rodapé em Deep teal como aplicado

- where: `.icm/docs/brand.md`, "Derived steps", os tokens da marca e a linha "applied by"
- what: Este run cria o token `--brand-tan` em `web/src/app/globals.css`: `#DFB484`,
  `oklch(0.797 0.081 69.3)`, a segunda colina da cena de dia. Só as orlas de colinas o usam. A
  página não tem esta cor. A página também diz que o site ainda não usa as regras: a paleta
  (JAM-481) e as orlas (JAM-482) já estão aplicadas.
- proposed: knowledge

## O rodapé salta quando o conteúdo da página chega

- where: `web/src/app/[locale]/loading.tsx` e o rodapé, em `uat.agorasim.pt/pt` (antes deste run)
- what: A primeira pintura mostra o estado de carregamento, com o rodapé dentro do ecrã. Depois o
  conteúdo chega e empurra o rodapé para baixo. O navegador mede um layout shift de 0.41 a 375 px
  e de 0.40 a 1280 px no UAT (lido em 2026-11-24). O limite "bom" do Core Web Vitals é 0.1. Este
  run não mudou este comportamento: as orlas não causam nenhum shift.
- proposed: bug

## O Build arranca com perguntas à espera

- where: `.icm/_system/stages/build/CONTEXT.md` e `.icm/_system/rules/questions.md` (blueprint)
- what: O operador marcou Spec approved e disse `build` com Q1 a Q5 em `_waiting_`. O contrato do
  Build lê só `spec_approved`. A regra das perguntas diz para não usar um default enquanto uma
  pergunta espera. Este run usou os defaults, porque a spec aprovada os tem escritos como
  decisões. O corpo do pull request continua a mostrar `_waiting_`.
- proposed: chore (blueprint)
