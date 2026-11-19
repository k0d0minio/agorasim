# Handoff jam-321

## Next action

O operador testa a página na preview do pull request #257 e marca **Ready to merge**
(https://github.com/k0d0minio/agorasim/pull/257). Depois, `release JAM-321` faz o merge.
Uma sessão não marca a caixa.

## How to test

Abra `/pt/experiencias` na preview do pull request #257. Vê o título "Experiências" e logo a
seguir o primeiro passeio, sem parágrafo de introdução. Repita em `/en/experiencias`: o título
é "Experiences".

## O que mudou

- `web/src/app/[locale]/experiencias/page.tsx`: o parágrafo de introdução saiu. O `h1` é o
  único título de nível 1 da página.
- `web/src/content/pages.ts`: o texto `experiences.lead` saiu, em PT e EN. O parágrafo era o
  seu único uso.
- A meta description lê `experiences.metaDescription`, que fica igual. O JSON-LD lê o
  catálogo (`experienceJsonLd`), não `experiences.lead`.
- O stub `.icm/intake/triage/experiences-without-intro.md` está em `triage/_done/`.

## Blockers

- O operador marca **Ready to merge** no pull request #257.

## Do not touch

- none
