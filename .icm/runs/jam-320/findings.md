# Findings jam-320

## O quadro Sales mostra a data do pedido como `2027-06-12`

- Onde: `web/src/app/admin/sales/[id]/page.tsx` (linha "Data preferida", `lead.preferredDate`) e
  `web/src/lib/sales.ts` (`when: booking?.date ?? row.preferredDate`).
- O quê: o cartão e a página de um pedido de casamento ou evento mostram a chave guardada, não a
  data por extenso. O ticket JAM-320 pede a correção só no formulário e no email da equipa.
- Proposta de ticket: "agorasim · The Sales board shows the date of an enquiry in words", lane
  `tweak`. Usar `formatDay` de `web/src/lib/date-keys.ts`, que devolve o texto livre sem mudança.

## O formulário de orçamento perde os dados quando o servidor devolve um erro

- Onde: `web/src/components/quote-request-form.tsx` e `web/src/app/[locale]/quote-actions.ts`.
- O quê: os campos não são controlados e a ação não devolve `values`. Quando o servidor devolve um
  erro de nome ou de email, o React repõe o formulário vazio. O formulário de `/reservar` devolve
  `values` para o evitar. Não verificado num browser: lido no código.
