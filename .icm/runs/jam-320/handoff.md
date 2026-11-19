# Handoff jam-320

## Next action

O operador testa a alteração no preview do pull request #261. Depois marca **Ready to merge** e
diz `release JAM-320`.

## Cause

O campo da data era um `<input type="date">` nativo, que o browser desenha na língua do browser
e não na da página, e o email da equipa imprimia o valor guardado (`2027-06-12`) sem o formatar.

## How to test

Abra `/pt/casamentos` no preview, num Chrome em inglês dos Estados Unidos: o campo da data mostra
"DD/MM/AAAA", e ao escrever 12062027 fica "12/06/2027". Em `/en/casamentos` mostra "DD/MM/YYYY".
Envie o pedido: o email da equipa diz "sábado, 12 de junho de 2027", e uma data que já passou é
recusada com uma mensagem por baixo do campo.

## What changed

- `web/src/components/quote-request-form.tsx`: o campo da data é texto que a página controla
  (`inputMode="numeric"`, barras automáticas), na ordem dia, mês, ano em `/casamentos` e
  `/eventos`. Uma data que não existe ou que já passou pára o envio e mostra uma mensagem. O
  resto do formulário fica preenchido.
- `web/src/lib/date-keys.ts`: `parseDayFirst` e `maskDayFirst`, novos. `formatDay` veio de
  `lib/availability.ts`, que o exporta como antes.
- `web/src/lib/form-schemas.ts`: `quoteRequestSchema` passa a data para `YYYY-MM-DD`. O valor em
  `tour_requests.preferred_date` não muda de forma.
- `web/src/lib/booking-emails.ts`: `teamEnquiryEmail` escreve a data por extenso com `formatDay`.
- `web/src/content/quote-request.ts`: o marcador do campo, a dica para o leitor de ecrã e as duas
  mensagens de erro, em PT e EN.
- O stub `.icm/intake/triage/wedding-date-day-first.md` está em `_done/`.

## Decisions

- O email da equipa escreve a data em português para todos os pedidos. O ticket dá também um
  exemplo em inglês, mas este email é todo em português (o teste "stays Portuguese" já o exigia).
- O servidor não recusa uma data. Guarda `YYYY-MM-DD` quando lê uma data, e guarda o texto tal
  como veio quando não lê. A recusa de uma data passada é feita no browser, como antes (o `min`
  do campo nativo também só valia no browser).
- O calendário nativo do browser já não aparece. Não há modo de ter esse calendário e a ordem
  certa em todos os browsers.

## Blockers

- none

## Do not touch

- none
