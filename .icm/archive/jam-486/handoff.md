# Handoff jam-486

## Next action

O operador testa a alteração no preview do pull request #262. Depois marca **Ready to merge** e
diz `release JAM-486`.

## Cause

O cartão do quadro de Vendas (`recordFromRequest`, campo `when`) e a página do pedido ("Data do
evento" / "Data preferida") imprimiam o valor guardado (`2027-06-12`) sem o formatar com
`formatDay`, o formato do resto do admin.

## How to test

Abra `/admin/sales` no preview e procure um pedido de casamento ou evento com data: o cartão diz
"sábado, 12 de junho de 2027", e não "2027-06-12". Abra o pedido: "Data do evento" diz o mesmo.
Um pedido sem data mostra "—" na página.

## What changed

- `web/src/lib/sales.ts`: `leadDayLabel`, novo. Escreve a data por extenso com `formatDay` (pt).
  Uma data em texto livre, de antes de JAM-320, fica como o cliente a escreveu. O campo `when`
  usa-o, e assim o quadro e os resultados da pesquisa mostram a data por extenso.
- `web/src/app/admin/sales/[id]/page.tsx`: "Data do evento" / "Data preferida" usa `leadDayLabel`.
- `web/src/lib/sales.test.ts`: testes do formato da data de um pedido.

## Blockers

- none

## Do not touch

- none
