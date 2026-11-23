# Handoff jam-291

## Next action

O operador testa o preview e marca **Ready to merge**. Depois diz `release JAM-291`.

## Criteria

- Calendário do admin e quadro de Vendas contam só reservas pagas (verify: CI): `tallySharedCars` em `sales.test.ts`. O dia do calendário separa as reservas pagas dos checkouts.
- "A aguardar pagamento" à parte (verify: operator): ver How to test.
- Retenção de 15 minutos, texto em pt e en (verify: CI): `booking-checkout.test.ts`, `booking.ts`, `terms.ts`. `TERMS_VERSION` passa a 2026-11-23.
- Retenção caducada não mostra "Pagamento pendente" (verify: CI): `bookingDisplayStatus` em `admin-format.test.ts`, `paymentStateOf` em `sales.test.ts`.
- Novo checkout expira primeiro a sessão Stripe caducada (verify: CI): `expireLapsedCheckoutsOn` em `booking-checkout.test.ts`.
- Pagamento tardio não confirma lugares já tomados (verify: CI): `confirmPaidBooking` em `booking-checkout.test.ts`. O webhook envia um alerta `not-payable`.

## How to test

No preview, abra `/pt/reservar`, escolha uma partida e vá até ao formulário de pagamento sem pagar. No admin, o Calendário e o quadro de Vendas mostram essa reserva como "A aguardar pagamento", fora dos lugares reservados. A página de reserva diz "15 minutos".

## Blockers

- none

## Do not touch

- The tour form values in `web/src/app/[locale]/reservar/actions.ts`. JAM-497 changes them in another run.
