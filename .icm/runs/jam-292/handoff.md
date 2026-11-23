# Handoff jam-292

## Next action

1. O operador marca **Spec approved** no #279 e diz `build JAM-292`.
2. O Build começa depois de o #277 (migração `0042`) estar em `main`: traz `main` para o ramo (merge, sem rebase) e só então escreve a migração `0043`.

A palavra do Jamie, no chat, 2026-11-23: "Start the next set of parallel tickets please". Esta run é um desses tickets.
As perguntas 1 a 4 têm resposta do Jamie, no chat, 2026-11-23 (a resposta por omissão de cada uma). Estão no `spec.md` e no corpo do #279.

## How to test

Ainda não há nada para testar. A fase Define não escreve código.

## Blockers

- O gate **Spec approved** não está marcado.
- A migração `0043` espera pelo merge do #277.

## Do not touch

- `web/src/lib/fleet.ts`, `web/src/lib/availability.ts` e a ocupação em `web/src/lib/bookings.ts`: a JAM-290 muda-os no #278. Esta run só os chama.
- As linhas da origem da reserva em `web/src/lib/sales.ts`, `web/src/components/admin/sales-board.tsx` e `web/src/app/admin/sales/`: são da JAM-506 (#277). Depois do merge do #277, trazer `main` para este ramo (merge, sem rebase).
- `web/drizzle/0042_*`: é do #277.

## Notes for Build

- `sendPaymentLink` recusa uma reserva de checkout (`isNotNull(paymentLinkTokenHash)`). O lembrete precisa de uma função própria em `web/src/lib/payment-link.ts`, que também reabre uma reserva `expired`.
- `closeUnpaidBooking` (`web/src/lib/booking-checkout.ts`) escreve `expired` quando a sessão Stripe acaba. `bookingSummaries` (`web/src/lib/sales.ts`) esconde hoje um checkout caducado do cartão.
- A página `/reservar/pagar/<token>` e `startPaymentLinkCheckout` já tratam o estado `full`.
- As ações de auditoria são texto (`AUDIT_ACTIONS` em `web/src/lib/audit.ts`): uma ação nova não pede migração.
