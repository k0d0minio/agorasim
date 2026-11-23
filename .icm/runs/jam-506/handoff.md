# Handoff jam-506

## Next action

O Jamie testa a mudança no preview, marca **Ready to merge** em
https://github.com/k0d0minio/agorasim/pull/277 e diz `release JAM-506`.

A migração `0042` corre no build do UAT depois do merge. A produção migra em
`migrate-production.yml`, por palavra do Jamie, antes da promoção. Outro ticket com uma
migração toma o número `0043`.

## Decisões registadas

- Jamie, 2026-11-23, no chat: "implement".
- Jamie, 2026-11-23, no chat: "Use sessionStorage". A origem fica no `sessionStorage` do
  separador até ao envio, não só na memória da página.
- Jamie marcou **Spec approved** em 2026-11-23. Assim confirmou as respostas por omissão 1 e 3
  da spec.

## Critérios

Preview: https://agorasim-git-claude-jam-506-booking-source-e151c6-kodominio.vercel.app
CI: GREEN no commit `2349b3f` (93 ficheiros de teste, 1604 testes).

| # | Critério | Quem | Estado |
|---|---|---|---|
| 1 | Reserva por `utm_source=chatgpt.com` mostra "Origem: chatgpt.com" no Sales board | operator | por testar |
| 2 | Referrer do Google fica "google" | CI | cumprido |
| 3 | Pedido de orçamento guarda a origem | CI | cumprido |
| 4 | Só o host do referrer, e o próprio site é ignorado | CI | cumprido |
| 5 | Valor não válido é ignorado, a reserva é criada | CI | cumprido |
| 6 | Os nomes: direta, sem registo, `utm_source` antes do referrer | CI | cumprido |
| 7 | Secção "Origem das reservas" na página Sales | operator | por testar |
| 8 | Sem cookie novo, sem `localStorage`, uma chave no `sessionStorage` | agent | cumprido |
| 9 | Primeira página do separador decide a origem | CI | cumprido |
| 10 | Política em PT e EN | agent | cumprido |
| 11 | A exportação de um titular inclui a origem | CI | cumprido |
| 12 | Migração `0042`, `db:migrate` e `db:verify` no build do preview | CI | cumprido |
| 13 | Os ficheiros de JAM-290 não mudam | agent | cumprido |

Critério 8, no preview: depois de `/pt?utm_source=chatgpt.com` e de `/pt/reservar`,
`document.cookie` está vazio, o `localStorage` não tem chaves e o `sessionStorage` tem só
`agorasim:booking-source` com `{"utm":"chatgpt.com","ref":""}`. O formulário de reserva tem os
campos escondidos `landingUtmSource=chatgpt.com` e `landingReferrer=`.

## Diferenças da spec

- Nenhuma no que o utilizador vê.
- `web/src/lib/checkout-draft.ts` está em `touches:` e não mudou. A origem tem o seu módulo,
  `web/src/lib/booking-source.ts`, com a sua chave ao lado da chave do rascunho.
- Um host do Gmail (`mail.google.com`) não é "google": só a pesquisa do Google é "google".
- A data "Última atualização" da política passou a 23 de novembro de 2026.
- `legalOpenItems` de `privacy.ts` tem uma pergunta nova para quem rever a política (a Lei
  41/2004, art. 5.º, e o `sessionStorage`).

## How to test

No preview, abra `/pt?utm_source=chatgpt.com`, carregue em Reservar e faça uma reserva de
teste. Na consola, em Vendas, o cartão dessa reserva mostra "Origem: chatgpt.com". No fim da
página Vendas está a secção "Origem das reservas", com a contagem de cada mês.

## Blockers

- O Jamie marca **Ready to merge** em https://github.com/k0d0minio/agorasim/pull/277.

## Do not touch

- `web/src/lib/fleet.ts`, `web/src/lib/availability.ts`, `web/src/components/booking-date-picker.tsx`
  e a lógica de ocupação de `web/src/lib/bookings.ts`: são de JAM-290 (pull request #278).
- `workspaces/`: é de JAM-508.
- A produção e o cliente.
