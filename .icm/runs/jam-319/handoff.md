# Handoff jam-319

## Next action

O operador testa a alteração no preview do pull request #258. Depois marca **Ready to merge** e
diz `release JAM-319`.

## How to test

Abra um orçamento de passeio com o campo "Ponto de encontro" preenchido, em `/admin/sales`, e
abra a página do orçamento do cliente: a linha diz "Ponto de encontro" em português e "Meeting
point" em inglês. Um orçamento de casamento continua a dizer "Local" e "Venue". Os emails do
orçamento de passeio (enviado, recibo, reembolso, cancelamento) usam a mesma palavra.

## What changed

- `web/src/content/quote-page.ts` e `web/src/content/emails.ts`: cada bloco `tour` tem agora a
  etiqueta `venue` ("Ponto de encontro" / "Meeting point").
- `web/src/lib/booking-emails.ts` e `web/src/app/[locale]/orcamento/[token]/page.tsx`: a linha
  do local usa a etiqueta do bloco `tour` quando o orçamento é de passeio. O sinal de passeio já
  existia em cada email (`tourDeparture`, `tour`) e na página (`tourHoldOf`).
- O email da equipa sobre o pagamento de um passeio diz também "Ponto de encontro".
- O email do restante (`balanceRequest`) não mudou. Um orçamento de passeio é um só pagamento
  (`TOUR_QUOTE_DEPOSIT_PERCENT = 100` em `web/src/lib/tour-quote.ts`), por isso não tem
  restante e nunca recebe esse email.
- O stub `.icm/intake/triage/tour-quote-meeting-point.md` está em `_done/`.

## Blockers

- none

## Do not touch

- Os ficheiros das sessões paralelas: JAM-317 (formulários e as suas ações), JAM-318 (quadro
  Sales do admin) e JAM-321 (`web/src/content/pages.ts`).
